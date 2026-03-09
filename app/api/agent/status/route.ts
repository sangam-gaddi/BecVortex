import { NextResponse } from 'next/server';

const MODEL      = process.env.VORA_MODEL || 'qwen3:8b';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY;

import { getVoraUrl } from '@/lib/agent/voraUrl';

/**
 * GET /api/agent/status
 * Checks Ollama first; if unreachable, falls back to OpenRouter if key is set.
 */
export async function GET() {
  // ── Try Ollama ────────────────────────────────────────────────────
  try {
    const OLLAMA_URL = await getVoraUrl();
    const headers: HeadersInit = {};
    if (OLLAMA_KEY) headers['Authorization'] = `Bearer ${OLLAMA_KEY}`;
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      headers,
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data  = await res.json();
      const names: string[] = (data?.models ?? []).map((m: any) => m.name as string);
      const modelAvailable  = names.some((n) => n.startsWith(MODEL.split(':')[0]));
      return NextResponse.json({
        online:          true,
        modelAvailable,
        provider:        'ollama',
        model:           MODEL,
        availableModels: names,
      });
    }
  } catch {
    // Ollama unreachable — fall through to OpenRouter check
  }

  // ── Fall back to OpenRouter ───────────────────────────────────────
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    return NextResponse.json({
      online:         true,
      modelAvailable: true,
      provider:       'openrouter',
      model:          process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free',
    });
  }

  return NextResponse.json({ online: false, reason: 'No LLM backend available. Set OPENROUTER_API_KEY on Render.' }, { status: 503 });
}
