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
            // ── Local Ollama endpoint ──────────────────────────────────────────
            const ollamaEndpoint = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            const res = await fetch(`${ollamaEndpoint}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'user',
                            content: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
                            images: [imageBase64],
                        },
                    ],
                    stream: false,
                    options: { temperature: 0.05, num_predict: 200 },
                }),
                // 2-minute timeout for local inference
                signal: AbortSignal.timeout(120_000),
            });

            if (!res.ok) {
                const errText = await res.text();
                return NextResponse.json(
                    { error: `Ollama error (${res.status}): ${errText.slice(0, 300)}` },
                    { status: 502 }
                );
            }

            const data = await res.json();
            resultText = data.message?.content || '';

        } else {
            // ── OpenRouter endpoint ────────────────────────────────────────────
            const apiKey = process.env.OPENROUTER_API_KEY;
            if (!apiKey) {
                return NextResponse.json(
                    { error: 'OPENROUTER_API_KEY is not configured on the server. Add it to your .env.local file.' },
                    { status: 500 }
                );
            }

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
                    response_format: { type: 'json_object' },
                    temperature: 0.05,
                    max_tokens: 200,
                }),
                signal: AbortSignal.timeout(60_000),
            });

            if (!res.ok) {
                const errText = await res.text();
                return NextResponse.json(
                    { error: `OpenRouter error (${res.status}): ${errText.slice(0, 300)}` },
                    { status: 502 }
                );
            }

            const data = await res.json();
            resultText = data.choices?.[0]?.message?.content || '';
        }

        // ── Parse JSON from model output ──────────────────────────────────────
        if (!resultText) {
            return NextResponse.json({ error: 'AI returned an empty response.' }, { status: 422 });
        }

        // Strip any accidental markdown fences
        const stripped = resultText.replace(/```(?:json)?/gi, '').trim();
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json(
                { error: 'AI did not return valid JSON. Try a different model or clearer image.' },
                { status: 422 }
            );
        }

        let parsed: any;
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch {
            return NextResponse.json({ error: 'Failed to parse AI JSON output.' }, { status: 422 });
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
