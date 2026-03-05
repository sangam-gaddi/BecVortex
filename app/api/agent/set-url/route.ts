import { NextRequest, NextResponse } from 'next/server';
import { setVoraUrl } from '@/lib/agent/voraUrl';

const CONFIG_SECRET = process.env.VORA_CONFIG_SECRET;

/**
 * POST /api/agent/set-url
 * Body: { url: "https://xxx.trycloudflare.com", secret: "..." }
 *
 * Called by start-vora.ps1 after the tunnel URL is known.
 * Protected by VORA_CONFIG_SECRET so only the script can call it.
 */
export async function POST(req: NextRequest) {
  if (!CONFIG_SECRET) {
    return NextResponse.json({ error: 'VORA_CONFIG_SECRET not configured on server.' }, { status: 500 });
  }

  let body: { url?: string; secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (body.secret !== CONFIG_SECRET) {
    return NextResponse.json({ error: 'Invalid secret.' }, { status: 401 });
  }

  const url = body.url?.trim();
  if (!url || !url.startsWith('https://')) {
    return NextResponse.json({ error: 'url must be an https:// address.' }, { status: 400 });
  }

  await setVoraUrl(url);

  return NextResponse.json({ ok: true, url });
}
