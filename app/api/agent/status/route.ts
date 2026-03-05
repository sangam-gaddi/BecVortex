import { NextResponse } from 'next/server';

const MODEL      = process.env.VORA_MODEL || 'qwen3:8b';
const OLLAMA_KEY = process.env.OLLAMA_API_KEY;

import { getVoraUrl } from '@/lib/agent/voraUrl';

/**
 * GET /api/agent/status
 * Quick health-check — pings Ollama and verifies the model is available.
 */
export async function GET() {
  try {
    const OLLAMA_URL = await getVoraUrl();
    const headers: HeadersInit = {};
    if (OLLAMA_KEY) headers['Authorization'] = `Bearer ${OLLAMA_KEY}`;
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ online: false, reason: 'Ollama returned an error.' }, { status: 503 });
    }

    const data  = await res.json();
    const names: string[] = (data?.models ?? []).map((m: any) => m.name as string);
    const modelAvailable  = names.some((n) => n.startsWith(MODEL.split(':')[0]));

    return NextResponse.json({
      online:         true,
      modelAvailable,
      model:          MODEL,
      availableModels: names,
    });
  } catch {
    return NextResponse.json({ online: false, reason: 'Could not reach Ollama.' }, { status: 503 });
  }
}
