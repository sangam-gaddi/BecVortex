import { NextRequest, NextResponse } from 'next/server';

/**
 * Vision Model: CIE-1 Answer Sheet OCR
 *
 * Supports:
 *  - Local Ollama (qwen3-vl:8b, qwen3-vl:235b-cloud, etc.)
 *  - OpenRouter cloud (nvidia/nemotron-nano-12b-v2-vl:free, etc.)
 *
 * Returns: { usn, subjectCode, rawTotalMarks, convertedMarks }
 */

const SYSTEM_PROMPT = `You are an advanced OCR and Vision Data Extraction AI. Your sole task is to accurately read and extract specific handwritten and printed information from the front cover page of an engineering college examination answer booklet (CIE-1).

You must extract ONLY these 4 fields:

1. USN (University Seat Number):
   - Located near the TOP-RIGHT or TOP-CENTER of the page
   - Written inside individual rectangular boxes, always 10 characters long
   - Always alphanumeric (e.g., 2BA24CS001, 2BA22IS045, 1GA23ME012)
   - Carefully distinguish: '0' (zero) vs 'O' (letter), '5' vs 'S', '1' vs 'I', '8' vs 'B'

2. Subject Code:
   - Located in the TOP-LEFT or UPPER-MIDDLE section
   - Labeled "Subject Code", "Course Code", or "Course Title"
   - Alphanumeric (e.g., 22UCS119C, 22UMA103C, 24CS41)

3. Total Marks (Raw):
   - Located at the BOTTOM of the marks grid/table on the page
   - This is the raw total scored by the student, out of a maximum of 40 for CIE-1
   - Maximum possible value: 40

4. Converted/Obtained Marks:
   - Located right next to or below the Raw Total
   - Often labeled "Converted Marks", "Marks out of 20", or "Obtained Marks"
   - Maximum possible value: 20
   - If this field is missing or illegible, you MUST calculate it as: Math.ceil(rawTotalMarks / 2)

CRITICAL RULES:
- Do NOT extract student name, faculty name, room number, signature, or any other information
- You are only reading 4 values: USN, Subject Code, Raw Marks, Converted Marks
- If USN or Subject Code is completely illegible, use the string "UNKNOWN"
- Return ONLY a raw JSON object with no markdown fences, no explanation, no extra text

Required output format (raw JSON only, no code block):
{"usn":"<value>","subjectCode":"<value>","rawTotalMarks":<number>,"convertedMarks":<number>}`;

/**
 * Ultra-compact prompt for local Ollama VL models.
 * Long prompts cause them to explain their reasoning instead of outputting JSON.
 */
const OLLAMA_COMPACT_PROMPT =
    `Look at this exam answer booklet cover image. Output ONLY a single JSON object — no explanation, no markdown, nothing else.

JSON format (exact keys required):
{"usn":"<10-char USN e.g. 2BA24CS001>","subjectCode":"<e.g. 22UCS119C>","rawTotalMarks":<0-40>,"convertedMarks":<0-20>}

Rules:
- USN is top-right/top-center, 10 alphanumeric characters in individual boxes
- Subject Code is top-left/upper-middle, labeled "Subject Code" or "Course Code"
- rawTotalMarks = total at bottom of marks table, max 40
- convertedMarks = next to total, max 20; if missing use ceil(raw/2)
- If illegible, use "UNKNOWN" for strings
- Output the JSON object ONLY. No words before or after it.`;

/**
 * Last-resort fallback: extract values from prose when the model explains instead of outputting JSON.
 * Works on both Ollama rambling responses and Nemotron reasoning chains.
 */
function extractFromProse(text: string): { usn: string; subjectCode: string; rawTotalMarks: number; convertedMarks: number } | null {
    // USN: 10-char pattern like 2BA26IS001, 1GA23ME012, 2BA24CS001
    const usnMatch = text.match(/\b([0-9][A-Z]{2}[0-9]{2}[A-Z]{2,3}[0-9]{3})\b/i);
    // Subject code: patterns like 22UCS119C, 24CS41, 22UMA103C (starts with 2 digits)
    const subjectMatch = text.match(/\b([0-9]{2}[A-Z]{2,5}[0-9]{2,4}[A-Z]?)\b/i);
    // Raw marks near keywords, or standalone number ≤40 mentioned near "total" / "raw" / "40"
    const rawMatch =
        text.match(/(?:raw|total|out of 40|\/ ?40)[^\d]{0,15}(\d{1,2})/i) ||
        text.match(/(\d{1,2})\s*(?:\/\s*40|out of 40)/i);
    // Converted marks
    const convMatch =
        text.match(/(?:converted|out of 20|\/ ?20|obtained)[^\d]{0,15}(\d{1,2})/i) ||
        text.match(/(\d{1,2})\s*(?:\/\s*20|out of 20)/i);

    if (!usnMatch) return null;   // USN is the minimum we need

    const rawTotalMarks = rawMatch ? Math.min(parseInt(rawMatch[1], 10), 40) : 0;
    const convertedMarks = convMatch
        ? Math.min(parseInt(convMatch[1], 10), 20)
        : Math.ceil(rawTotalMarks / 2);

    return {
        usn: usnMatch[1].toUpperCase(),
        subjectCode: subjectMatch ? subjectMatch[1].toUpperCase() : 'UNKNOWN',
        rawTotalMarks,
        convertedMarks,
    };
}

function isOllamaModel(model: string): boolean {
    // Local Ollama model names use the "name:tag" format without a slash
    return !model.includes('/') && (
        model.startsWith('qwen') ||
        model.startsWith('llava') ||
        model.startsWith('moondream') ||
        model.startsWith('bakllava')
    );
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            imageBase64,
            mimeType = 'image/jpeg',
            model = 'nvidia/nemotron-nano-12b-v2-vl:free',
        } = body;

        if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
            return NextResponse.json({ error: 'No valid image provided.' }, { status: 400 });
        }

        const userPrompt = 'Extract the exam data from this answer sheet image. Return only the JSON object.';

        let resultText: string;

        if (isOllamaModel(model)) {
            // ── Local Ollama: use /api/generate (more reliable for VL models) ──
            const ollamaEndpoint = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            // Use compact prompt — verbose prompts cause local VL models to reason in prose
            const fullPrompt = OLLAMA_COMPACT_PROMPT;
            const res = await fetch(`${ollamaEndpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt: fullPrompt,
                    images: [imageBase64],
                    stream: false,
                    options: { temperature: 0.05, num_predict: 256 },
                }),
                // 3-minute timeout for local inference
                signal: AbortSignal.timeout(180_000),
            });

            if (!res.ok) {
                const errText = await res.text();
                const isNotFound = res.status === 404 || errText.toLowerCase().includes('not found') || errText.toLowerCase().includes('pull it');
                const friendlyMsg = isNotFound
                    ? `Ollama model '${model}' is not installed. Run: ollama pull ${model}`
                    : `Ollama error (${res.status}): ${errText.slice(0, 300)}`;
                return NextResponse.json({ error: friendlyMsg }, { status: 502 });
            }

            const data = await res.json();
            console.log('[vision] ollama raw data keys:', Object.keys(data));
            // /api/generate → data.response
            // thinking models may also have data.thinking (separate field)
            resultText = data.response || data.thinking || '';

        } else {
            // ── OpenRouter endpoint ────────────────────────────────────────────
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                return NextResponse.json(
                    { error: 'OPENROUTER_API_KEY is not configured on the server. Add it to your .env.local file.' },
                    { status: 500 }
                );
            }

            // Some models (e.g. Nemotron) don't support a separate 'system' role —
            // merge system instructions into the user content to maximise compatibility.
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
                    'X-Title': 'BEC Vortex - Marks Extractor',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
                                },
                                {
                                    type: 'image_url',
                                    image_url: { url: `data:${mimeType};base64,${imageBase64}` },
                                },
                            ],
                        },
                    ],
                    temperature: 0.05,
                    // Reasoning models (nemotron, qwen-thinking) need lots of tokens to finish thinking + output JSON
                    max_tokens: 4096,
                }),
                signal: AbortSignal.timeout(90_000),
            });

            if (!res.ok) {
                const errText = await res.text();
                return NextResponse.json(
                    { error: `OpenRouter error (${res.status}): ${errText.slice(0, 500)}` },
                    { status: 502 }
                );
            }

            const data = await res.json();
            console.log('[vision] openrouter raw data:', JSON.stringify(data).slice(0, 800));

            const choice = data.choices?.[0];
            const msg = choice?.message;
            const finishReason = choice?.finish_reason;

            // content may be a string or an array of content parts (some providers)
            let rawContent: string = '';
            if (typeof msg?.content === 'string') {
                rawContent = msg.content;
            } else if (Array.isArray(msg?.content)) {
                rawContent = msg.content.map((c: any) => (typeof c === 'string' ? c : c?.text ?? '')).join('');
            }
            // Nemotron / reasoning models: answer is in reasoning when content is null.
            // If finish_reason==='length', the model hit the server token cap mid-reasoning;
            // we still try to mine the reasoning text via prose extraction.
            resultText = rawContent || msg?.reasoning || msg?.reasoning_content || '';

            if (finishReason === 'length' && !rawContent) {
                console.warn('[vision] OpenRouter hit token limit during reasoning — will attempt prose extraction from reasoning content');
            }
        }

        // ── Parse JSON from model output ──────────────────────────────────────
        // Log raw output to help debug model response format issues
        console.log('[vision] raw resultText:', resultText?.slice(0, 500));

        if (!resultText) {
            return NextResponse.json({ error: 'AI returned an empty response.' }, { status: 422 });
        }

        // Step 1: strip <think>...</think> reasoning blocks (Qwen3 thinking models)
        let cleaned = resultText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // Step 2: strip markdown code fences (```json ... ``` or ``` ... ```)
        cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

        // Step 3: find the first complete JSON object
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        let parsed: any;
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (parseErr) {
                console.warn('[vision] JSON.parse failed, trying prose extraction. raw:', jsonMatch[0].slice(0, 200));
            }
        }

        // Fallback: extract values from prose/reasoning when model didn't output JSON
        if (!parsed) {
            console.warn('[vision] No JSON found — attempting prose extraction from:', cleaned.slice(0, 300));
            const prose = extractFromProse(resultText);
            if (prose) {
                console.log('[vision] Prose extraction succeeded:', prose);
                return NextResponse.json(prose);
            }
            return NextResponse.json(
                { error: `AI did not return structured data. Raw output: "${cleaned.slice(0, 150)}"` },
                { status: 422 }
            );
        }

        // ── Sanitise and clamp values ─────────────────────────────────────────
        const usn = String(parsed.usn ?? 'UNKNOWN').trim().toUpperCase();
        const subjectCode = String(parsed.subjectCode ?? 'UNKNOWN').trim().toUpperCase();
        let rawTotalMarks = Number(parsed.rawTotalMarks ?? 0);
        let convertedMarks = Number(parsed.convertedMarks ?? 0);

        rawTotalMarks = Math.round(Math.min(Math.max(0, rawTotalMarks), 40));
        convertedMarks = Math.round(Math.min(Math.max(0, convertedMarks), 20) * 10) / 10;

        // Recalculate converted if it's missing or zero while raw isn't
        if (convertedMarks === 0 && rawTotalMarks > 0) {
            convertedMarks = Math.ceil(rawTotalMarks / 2);
        }

        return NextResponse.json({ usn, subjectCode, rawTotalMarks, convertedMarks });

    } catch (e: any) {
        if (e.name === 'TimeoutError' || e.name === 'AbortError') {
            return NextResponse.json(
                { error: 'The AI model timed out. Try a faster model (e.g., qwen3-vl:8b or nemotron-nano).' },
                { status: 504 }
            );
        }
        console.error('[vision/extract-marks] Unexpected error:', e);
        return NextResponse.json({ error: e.message || 'Internal server error.' }, { status: 500 });
    }
}
