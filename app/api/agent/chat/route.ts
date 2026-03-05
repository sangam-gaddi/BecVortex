import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession }     from '@/lib/auth/session';
import { buildSystemPrompt } from '@/lib/agent/systemPrompt';
import { getToolsForRole }   from '@/lib/agent/rbac';
import { toOllamaTools }     from '@/lib/agent/tools';
import { executeToolCall }   from '@/lib/agent/executor';
import { logToolCall }       from '@/lib/agent/auditLog';
import type { VoraSession, VoraChatMessage, VoraOsCommand } from '@/lib/agent/types';
import { getVoraUrl } from '@/lib/agent/voraUrl';

export type VoraProvider = 'ollama' | 'openrouter';

const OLLAMA_MODEL     = process.env.VORA_MODEL           || 'qwen3:8b';
const OLLAMA_KEY       = process.env.OLLAMA_API_KEY;
const OPENROUTER_KEY   = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL     || 'nvidia/nemotron-3-nano-30b-a3b:free';
const OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions';

// ── Provider: Ollama ──────────────────────────────────────────────────────────

function ollamaHeaders(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (OLLAMA_KEY) h['Authorization'] = `Bearer ${OLLAMA_KEY}`;
  return h;
}

async function callOllama(
  baseUrl: string,
  messages: unknown[],
  tools?: unknown[],
): Promise<{ message: any; error?: string }> {
  const body: any = { model: OLLAMA_MODEL, messages, stream: false, options: { temperature: 0.3 } };
  if (tools?.length) body.tools = tools;
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST', headers: ollamaHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) return { message: null, error: await res.text() };
  const data = await res.json();
  return { message: data.message };
}

// ── Provider: OpenRouter ──────────────────────────────────────────────────────

function openRouterHeaders(): HeadersInit {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${OPENROUTER_KEY}`,
    'HTTP-Referer':  'https://bec.edu.in',
    'X-Title':       'VORA - BEC OS Assistant',
  };
}

async function callOpenRouter(
  messages: unknown[],
  tools?: unknown[],
): Promise<{ message: any; error?: string }> {
  const body: any = { model: OPENROUTER_MODEL, messages, stream: false, temperature: 0.3 };
  if (tools?.length) body.tools = tools;
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST', headers: openRouterHeaders(), body: JSON.stringify(body),
  });
  if (!res.ok) return { message: null, error: await res.text() };
  const data = await res.json();
  const msg = data.choices?.[0]?.message;
  if (!msg) return { message: null, error: 'No choices in OpenRouter response.' };

  // Normalize: parse tool_call arguments from JSON strings → objects
  // and keep the original string for the follow-up message
  if (msg.tool_calls) {
    msg.tool_calls = msg.tool_calls.map((tc: any) => {
      const argsRaw = tc.function?.arguments ?? '{}';
      const argsObj = typeof argsRaw === 'string' ? JSON.parse(argsRaw) : argsRaw;
      return { ...tc, function: { ...tc.function, arguments: argsObj, _arguments_str: argsRaw } };
    });
  }
  return { message: msg };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function resolveVoraSession(req: NextRequest): Promise<VoraSession | null> {
  const cookieStore = await cookies();

  const staffCookie = cookieStore.get('session');
  if (staffCookie) {
    const session = await verifySession(staffCookie.value);
    if (session && session.userType === 'staff') {
      return {
        userId:     session.userId,
        usn:        session.usn,
        role:       session.role as VoraSession['role'],
        department: session.department,
        userType:   'staff',
        sessionId:  session.activeSessionId ?? crypto.randomUUID(),
      };
    }
  }

  const studentCookie = cookieStore.get('auth-token');
  if (studentCookie) {
    const session = await verifySession(studentCookie.value);
    if (session) {
      return {
        userId:    session.userId,
        usn:       session.usn,
        role:      'STUDENT',
        userType:  'student',
        sessionId: crypto.randomUUID(),
      };
    }
  }

  return null;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const voraSession = await resolveVoraSession(req);
  if (!voraSession) {
    return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
  }

  // Parse body
  let body: { messages: VoraChatMessage[]; provider?: VoraProvider };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const { messages, provider = 'ollama' } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: '`messages` array is required.' }, { status: 400 });
  }

  // Validate provider config
  if (provider === 'openrouter' && !OPENROUTER_KEY) {
    return NextResponse.json({ error: 'OpenRouter is not configured on the server.' }, { status: 503 });
  }

  const allowedTools = getToolsForRole(voraSession.role);
  const systemPrompt = buildSystemPrompt(voraSession);
  const tools        = toOllamaTools(allowedTools); // same format works for both providers

  const baseMessages: any[] = [{ role: 'system', content: systemPrompt }, ...messages];

  // ── First call ────────────────────────────────────────────────────
  let firstResult: { message: any; error?: string };
  try {
    firstResult = provider === 'openrouter'
      ? await callOpenRouter(baseMessages, tools)
      : await callOllama(await getVoraUrl(), baseMessages, tools);
  } catch (err) {
    console.error(`[VORA] ${provider} unreachable:`, err);
    return NextResponse.json(
      { error: provider === 'openrouter' ? 'Could not reach OpenRouter.' : 'VORA is offline. Could not reach the AI model.' },
      { status: 503 },
    );
  }

  if (!firstResult.message) {
    console.error('[VORA] No message from first call:', firstResult.error);
    return NextResponse.json({ error: firstResult.error ?? 'No response from AI model.' }, { status: 502 });
  }

  const assistantMessage = firstResult.message;

  // ── Parse tool calls ──────────────────────────────────────────────
  const toolCalls: Array<{ id?: string; name: string; arguments: Record<string, unknown> }> =
    assistantMessage.tool_calls?.map((tc: any) => ({
      id:        tc.id,
      name:      tc.function?.name ?? tc.name,
      arguments: tc.function?.arguments ?? tc.arguments ?? {},
    })) ?? [];

  const toolResults: Array<{ toolName: string; toolCallId?: string; result: unknown }> = [];
  const osCommands: VoraOsCommand[] = [];

  if (toolCalls.length > 0) {
    for (const tc of toolCalls) {
      const start  = Date.now();
      const result = await executeToolCall({ name: tc.name, arguments: tc.arguments }, voraSession);
      await logToolCall(voraSession, { name: tc.name, arguments: tc.arguments }, result, Date.now() - start);
      if (result.success && (result.data as any)?.osCommand) {
        osCommands.push((result.data as any).osCommand as VoraOsCommand);
      }
      toolResults.push({ toolName: tc.name, toolCallId: tc.id, result });
    }

    // ── Build follow-up messages ──────────────────────────────────
    let followUpMessages: any[];
    if (provider === 'openrouter') {
      // OpenAI format: assistant message must carry original string-form tool_calls
      followUpMessages = [
        ...baseMessages,
        {
          role:       'assistant',
          content:    assistantMessage.content || null,
          tool_calls: assistantMessage.tool_calls?.map((tc: any) => ({
            id:       tc.id,
            type:     'function',
            function: {
              name:      tc.function.name,
              arguments: tc.function._arguments_str ?? JSON.stringify(tc.function.arguments),
            },
          })),
        },
        ...toolResults.map((tr) => ({
          role:         'tool',
          tool_call_id: tr.toolCallId ?? 'call_0',
          content:      JSON.stringify(tr.result),
        })),
      ];
    } else {
      followUpMessages = [
        ...baseMessages,
        assistantMessage,
        ...toolResults.map((tr) => ({
          role:    'tool',
          content: JSON.stringify(tr.result),
          name:    tr.toolName,
        })),
      ];
    }

    // ── Second call ───────────────────────────────────────────────
    let secondResult: { message: any; error?: string };
    try {
      secondResult = provider === 'openrouter'
        ? await callOpenRouter(followUpMessages)
        : await callOllama(await getVoraUrl(), followUpMessages);
    } catch {
      return NextResponse.json({ error: 'VORA lost connection while processing tools.' }, { status: 503 });
    }

    if (!secondResult.message) {
      return NextResponse.json(
        { error: secondResult.error ?? 'AI model error during tool result processing.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      reply:      secondResult.message.content ?? 'Done.',
      toolCalls,
      toolResults,
      osCommands: osCommands.length > 0 ? osCommands : undefined,
    });
  }

  // ── No tool calls — plain reply ───────────────────────────────────
  return NextResponse.json({
    reply:       assistantMessage.content ?? '',
    toolCalls:   [],
    toolResults: [],
    osCommands:  undefined,
  });
}
