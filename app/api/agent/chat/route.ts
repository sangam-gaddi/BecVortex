import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import Grade from '@/database/models/Grade';
import AttendanceRecord from '@/database/models/AttendanceRecord';
import Payment from '@/database/models/Payment';
import CustomFee from '@/database/models/CustomFee';
import Subject from '@/database/models/Subject';
import { verifySession }     from '@/lib/auth/session';
import { buildSystemPrompt } from '@/lib/agent/systemPrompt';
import { getToolsForRole }   from '@/lib/agent/rbac';
import { toOllamaTools }     from '@/lib/agent/tools';
import { executeToolCall }   from '@/lib/agent/executor';
import { logToolCall }       from '@/lib/agent/auditLog';
import type { VoraSession, VoraChatMessage, VoraOsCommand } from '@/lib/agent/types';
import { getVoraUrl } from '@/lib/agent/voraUrl';

export type VoraProvider = 'ollama' | 'openrouter';

const OLLAMA_MODEL   = process.env.VORA_MODEL || 'qwen3:8b';
const OLLAMA_KEY     = process.env.OLLAMA_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Default OpenRouter model (overridable per-request)
const OPENROUTER_MODEL_DEFAULT = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-nano-30b-a3b:free';
const LEGACY_STUDENT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long'
);
const STANDARD_FEE_MAP: Record<string, { name: string; amount: number }> = {
  tuition: { name: 'Tuition Fee', amount: 75000 },
  development: { name: 'Development Fee', amount: 15000 },
  hostel: { name: 'Hostel Fee', amount: 45000 },
  examination: { name: 'Examination Fee', amount: 5000 },
};

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
  // Read at request time so env vars loaded after server start are picked up
  const key = process.env.OPENROUTER_API_KEY;
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${key}`,
    'HTTP-Referer':  'https://bec.edu.in',
    'X-Title':       'VORA - BEC OS Assistant',
  };
}

async function callOpenRouter(
  messages: unknown[],
  tools?: unknown[],
  model?: string,
): Promise<{ message: any; error?: string }> {
  const body: any = { model: model || OPENROUTER_MODEL_DEFAULT, messages, stream: false, temperature: 0.3 };
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
      let argsObj = argsRaw;
      if (typeof argsRaw === 'string') {
        try {
          argsObj = JSON.parse(argsRaw);
        } catch {
          argsObj = {};
        }
      }
      return { ...tc, function: { ...tc.function, arguments: argsObj, _arguments_str: argsRaw } };
    });
  }
  return { message: msg };
}

function stripToolMarkup(content: string): string {
  return content
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, ' ')
    .replace(/<\/?function(?:\s*=\s*[^>]+)?>/gi, ' ')
    .replace(/<\/?(?:parameter|arguments|args)(?:\s*=\s*[^>]+|\s+name\s*=\s*[^>]+)?>/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toCamelKey(value: string): string {
  return value
    .trim()
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
    .replace(/[-_ ]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase())
    .replace(/^([A-Z])/, (_, c: string) => c.toLowerCase());
}

function normalizeToolArguments(toolName: string, args: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(args || {})) {
    if (val === undefined || val === null) continue;
    normalized[toCamelKey(key)] = val;
  }

  if (toolName === 'verify_my_fee_receipt' || toolName === 'download_my_fee_receipt') {
    const receiptId =
      normalized.receiptId ??
      normalized.receipt ??
      normalized.receiptNo ??
      normalized.referenceId ??
      normalized.reference;
    if (receiptId !== undefined) normalized.receiptId = receiptId;
  }

  if (toolName === 'calculate_my_selected_fees' || toolName === 'open_payment_for_selected_fees') {
    const feeIds = normalized.feeIds ?? normalized.fees;
    if (typeof feeIds === 'string') {
      normalized.feeIds = feeIds.split(',').map((x) => x.trim()).filter(Boolean);
    } else if (Array.isArray(feeIds)) {
      normalized.feeIds = feeIds;
    }
  }

  return normalized;
}

async function buildStudentContextBlock(session: VoraSession): Promise<string> {
  await connectToDatabase();

  const usnRegex = new RegExp(`^${String(session.usn).trim()}$`, 'i');
  const student = await Student.findOne({ usn: usnRegex }).lean();
  if (!student) {
    return '- Student record not found in database for the current session USN.';
  }

  const studentId = (student as any)._id;
  const grades = await Grade.find({ studentId }).sort({ semester: 1, subjectCode: 1 }).lean();
  const attendanceRecords = await AttendanceRecord.find({
    $or: [{ presentStudents: studentId }, { absentStudents: studentId }],
  }).sort({ date: -1 }).lean();
  const payments = await Payment.find({ usn: usnRegex }).sort({ createdAt: -1 }).lean();
  const customFees = await CustomFee.find({ studentUsn: usnRegex }).sort({ createdAt: -1 }).lean();

  const subjectCodes = new Set<string>();
  for (const code of ((student as any).registeredSubjects ?? [])) subjectCodes.add(String(code).toUpperCase());
  for (const code of ((student as any).backlogs ?? [])) subjectCodes.add(String(code).toUpperCase());
  for (const g of grades as any[]) subjectCodes.add(String(g.subjectCode || '').toUpperCase());
  for (const a of attendanceRecords as any[]) subjectCodes.add(String(a.subjectCode || '').toUpperCase());

  const subjectDocs = await Subject.find({ subjectCode: { $in: Array.from(subjectCodes) } }).lean();
  const subjectByCode = new Map<string, any>(
    (subjectDocs as any[]).map((s) => [String(s.subjectCode || '').toUpperCase(), s]),
  );

  const marksSummary = (grades as any[]).map((g) => ({
    subjectCode: g.subjectCode,
    subjectTitle: subjectByCode.get(String(g.subjectCode || '').toUpperCase())?.title || null,
    semester: g.semester,
    cie1Raw: g.cie1?.rawMarks ?? null,
    cie1Converted: g.cie1?.convertedMarks ?? null,
    cie2Raw: g.cie2?.rawMarks ?? null,
    cie2Converted: g.cie2?.convertedMarks ?? null,
    assignmentRaw: g.assignment?.rawMarks ?? null,
    assignmentConverted: g.assignment?.convertedMarks ?? null,
    seeRaw: g.see?.rawMarks ?? null,
    totalMarks: g.totalMarks ?? null,
    gradePoint: g.gradePoint ?? null,
    letterGrade: g.letterGrade ?? null,
    lastUpdated: g.updatedAt,
  }));

  const attendanceBySubject = new Map<string, { total: number; present: number; absent: number; lastClassAt?: Date }>();
  for (const rec of attendanceRecords as any[]) {
    const code = String(rec.subjectCode || '').toUpperCase();
    const stat = attendanceBySubject.get(code) ?? { total: 0, present: 0, absent: 0 };
    const present = Array.isArray(rec.presentStudents)
      && rec.presentStudents.some((id: any) => String(id) === String(studentId));
    const absent = Array.isArray(rec.absentStudents)
      && rec.absentStudents.some((id: any) => String(id) === String(studentId));
    stat.total += 1;
    if (present) stat.present += 1;
    if (absent) stat.absent += 1;
    if (!stat.lastClassAt || new Date(rec.date).getTime() > new Date(stat.lastClassAt).getTime()) {
      stat.lastClassAt = rec.date;
    }
    attendanceBySubject.set(code, stat);
  }

  const attendanceSummary = Array.from(attendanceBySubject.entries()).map(([subjectCode, stat]) => ({
    subjectCode,
    subjectTitle: subjectByCode.get(subjectCode)?.title || null,
    totalClasses: stat.total,
    presentClasses: stat.present,
    absentClasses: stat.absent,
    attendancePercent: stat.total > 0 ? Number(((stat.present / stat.total) * 100).toFixed(2)) : 0,
    lastClassAt: stat.lastClassAt ?? null,
  }));

  const paidStandardFromStudent = new Set<string>(((student as any).paidFees ?? []).map((f: string) => String(f).toLowerCase()));
  const paidStandardFromPayments = new Set<string>();
  for (const p of payments as any[]) {
    if (String(p.status || '').toLowerCase() !== 'completed') continue;
    for (const feeId of (p.feeIds ?? [])) {
      const key = String(feeId).toLowerCase();
      if (STANDARD_FEE_MAP[key]) paidStandardFromPayments.add(key);
    }
  }
  const paidStandard = new Set<string>([...Array.from(paidStandardFromStudent), ...Array.from(paidStandardFromPayments)]);

  const standardFees = Object.entries(STANDARD_FEE_MAP).map(([id, def]) => ({
    id,
    name: def.name,
    amount: def.amount,
    status: paidStandard.has(id) ? 'paid' : 'pending',
  }));
  const pendingStandardTotal = standardFees
    .filter((f) => f.status === 'pending')
    .reduce((sum, f) => sum + f.amount, 0);

  const customFeeSummary = (customFees as any[]).map((f) => ({
    feeId: f.feeId,
    name: f.name,
    category: f.category,
    amount: f.amount,
    dueDate: f.dueDate ?? null,
    isPaid: !!f.isPaid,
    addedBy: f.addedBy,
    createdAt: f.createdAt,
  }));
  const pendingCustomTotal = customFeeSummary
    .filter((f) => !f.isPaid)
    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

  const paymentTimeline = (payments as any[]).slice(0, 25).map((p) => ({
    paymentId: p._id?.toString?.(),
    receiptNo: p._id?.toString?.().substring(0, 8)?.toUpperCase?.(),
    amount: p.amount,
    status: p.status,
    paymentMethod: p.paymentMethod,
    channel: p.channel,
    feeIds: p.feeIds ?? [],
    reference: p.transactionHash || p.challanId || p.bankReferenceId || p._id?.toString?.(),
    createdAt: p.createdAt,
  }));

  const studentContext = {
    snapshotAt: new Date().toISOString(),
    profile: {
      usn: (student as any).usn,
      studentName: (student as any).studentName,
      email: (student as any).email ?? null,
      phone: (student as any).phone ?? null,
      department: (student as any).department,
      degree: (student as any).degree,
      semester: (student as any).semester,
      currentSemester: (student as any).currentSemester,
      stdType: (student as any).stdType,
      paymentCategory: (student as any).paymentCategory,
      entryType: (student as any).entryType ?? null,
      casteCategory: (student as any).casteCat,
      isCR: !!(student as any).isCR,
      crForSemester: (student as any).crForSemester ?? null,
      admissionId: (student as any).admissionID ?? null,
      csn: (student as any).csn ?? null,
      idNo: (student as any).idNo ?? null,
      registeredSubjects: (student as any).registeredSubjects ?? [],
      backlogs: (student as any).backlogs ?? [],
    },
    subjects: {
      registered: ((student as any).registeredSubjects ?? []).map((code: string) => {
        const key = String(code).toUpperCase();
        const s = subjectByCode.get(key);
        return {
          subjectCode: key,
          title: s?.title ?? null,
          credits: s?.credits ?? null,
          category: s?.category ?? null,
          semester: s?.semester ?? null,
        };
      }),
      backlogs: ((student as any).backlogs ?? []).map((code: string) => {
        const key = String(code).toUpperCase();
        const s = subjectByCode.get(key);
        return {
          subjectCode: key,
          title: s?.title ?? null,
          credits: s?.credits ?? null,
          category: s?.category ?? null,
          semester: s?.semester ?? null,
        };
      }),
    },
    academics: {
      marksSummary,
      attendanceSummary,
      totals: {
        gradeRecords: marksSummary.length,
        attendanceSubjects: attendanceSummary.length,
        attendanceSessionsTracked: (attendanceRecords as any[]).length,
      },
    },
    fees: {
      standardFees,
      customFees: customFeeSummary,
      pendingStandardTotal,
      pendingCustomTotal,
      totalPendingDue: pendingStandardTotal + pendingCustomTotal,
      paidFeeIdsFromStudentRecord: Array.from(paidStandardFromStudent),
    },
    payments: {
      totalRecords: (payments as any[]).length,
      completedCount: (payments as any[]).filter((p) => String(p.status).toLowerCase() === 'completed').length,
      pendingCount: (payments as any[]).filter((p) => String(p.status).toLowerCase() !== 'completed').length,
      timeline: paymentTimeline,
    },
  };

  return `Use this data as source of truth for the logged-in student.\n\n\`\`\`json\n${JSON.stringify(studentContext, null, 2)}\n\`\`\``;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function verifyLegacyStudentToken(token: string): Promise<{ userId: string; usn: string } | null> {
  try {
    const verified = await jwtVerify(token, LEGACY_STUDENT_SECRET);
    const payload = verified.payload as Record<string, unknown>;
    const userId = String(payload.studentId || payload.userId || '');
    const usn = String(payload.usn || '');
    if (!userId || !usn) return null;
    return { userId, usn };
  } catch {
    return null;
  }
}

function extractTextToolCalls(content: string): Array<{
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  argumentsRaw: string;
}> {
  const results: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    argumentsRaw: string;
  }> = [];

  const blocks = [...content.matchAll(/<tool_call>([\s\S]*?)<\/tool_call>/gi)];
  const sources = blocks.length > 0 ? blocks.map((m) => m[1]) : [content];

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const fnEq = src.match(/<function\s*=\s*["']?([a-zA-Z0-9_-]+)["']?\s*>?/i);
    const fnTag = src.match(/<function>\s*([a-zA-Z0-9_-]+)\s*<\/function>/i);
    const name = (fnEq?.[1] || fnTag?.[1] || '').trim();
    if (!name) continue;

    const argsTag = src.match(/<(?:arguments|args)>\s*([\s\S]*?)\s*<\/(?:arguments|args)>/i);
    const argumentsRaw = (argsTag?.[1] || '{}').trim();

    let parsedArgs: Record<string, unknown> = {};
    try {
      const maybeObj = JSON.parse(argumentsRaw);
      if (maybeObj && typeof maybeObj === 'object' && !Array.isArray(maybeObj)) {
        parsedArgs = maybeObj as Record<string, unknown>;
      }
    } catch {
      parsedArgs = {};
    }

    // Support pseudo-call style used by some models:
    // <parameter=receipt_id>69B2FA71</parameter>
    // <parameter name="receipt_id">69B2FA71</parameter>
    const parameterMatches = src.matchAll(
      /<parameter(?:\s*=\s*["']?([a-zA-Z0-9_-]+)["']?|\s+name\s*=\s*["']([^"']+)["'])?\s*>\s*([\s\S]*?)\s*<\/parameter>/gi,
    );
    for (const m of parameterMatches) {
      const key = (m[1] || m[2] || '').trim();
      const value = (m[3] || '').trim();
      if (!key || !value) continue;
      parsedArgs[toCamelKey(key)] = value;
    }

    results.push({
      id: `call_text_${i + 1}`,
      name,
      arguments: parsedArgs,
      argumentsRaw,
    });
  }

  return results;
}

async function resolveVoraSession(req: NextRequest): Promise<VoraSession | null> {
  const cookieStore = await cookies();
  const getCookieValue = (name: string): string | undefined =>
    req.cookies.get(name)?.value || cookieStore.get(name)?.value;

  const sessionCookieValue = getCookieValue('session');
  if (sessionCookieValue) {
    const session = await verifySession(sessionCookieValue);
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

    if (session && session.userType === 'student') {
      return {
        userId:    session.userId,
        usn:       session.usn,
        role:      'STUDENT',
        userType:  'student',
        sessionId: session.activeSessionId ?? crypto.randomUUID(),
      };
    }
  }

  // Backward-compat fallback for legacy deployments that still use auth-token.
  const authTokenValue = getCookieValue('auth-token');
  if (authTokenValue) {
    const session = await verifySession(authTokenValue);
    if (session) {
      return {
        userId:    session.userId,
        usn:       session.usn,
        role:      'STUDENT',
        userType:  'student',
        sessionId: session.activeSessionId ?? crypto.randomUUID(),
      };
    }

    const legacySession = await verifyLegacyStudentToken(authTokenValue);
    if (legacySession) {
      return {
        userId: legacySession.userId,
        usn: legacySession.usn,
        role: 'STUDENT',
        userType: 'student',
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
  let body: { messages: VoraChatMessage[]; provider?: VoraProvider; model?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const { messages, provider = 'ollama', model } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: '`messages` array is required.' }, { status: 400 });
  }

  // Validate provider config
  if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'OpenRouter is not configured on the server.' }, { status: 503 });
  }

  const allowedTools = voraSession.role === 'STUDENT'
    ? getToolsForRole(voraSession.role).filter((t) => t.name === 'open_app')
    : getToolsForRole(voraSession.role);

  let studentContextBlock: string | undefined;
  if (voraSession.role === 'STUDENT') {
    try {
      studentContextBlock = await buildStudentContextBlock(voraSession);
    } catch (err) {
      console.error('[VORA] Failed to build student context block:', err);
      studentContextBlock = '- Student context fetch failed; avoid assumptions and ask concise clarifying questions if needed.';
    }
  }

  const systemPrompt = buildSystemPrompt(voraSession, studentContextBlock);
  const tools        = toOllamaTools(allowedTools); // same format works for both providers

  const baseMessages: any[] = [{ role: 'system', content: systemPrompt }, ...messages];

  // ── First call ────────────────────────────────────────────────────
  let firstResult: { message: any; error?: string };
  try {
    firstResult = provider === 'openrouter'
      ? await callOpenRouter(baseMessages, tools, model)
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
  let toolCalls: Array<{ id?: string; name: string; arguments: Record<string, unknown>; argumentsRaw?: string }> =
    assistantMessage.tool_calls?.map((tc: any) => ({
      id:        tc.id,
      name:      tc.function?.name ?? tc.name,
      arguments: normalizeToolArguments(
        tc.function?.name ?? tc.name,
        (tc.function?.arguments ?? tc.arguments ?? {}) as Record<string, unknown>,
      ),
      argumentsRaw: tc.function?._arguments_str,
    })) ?? [];

  // Some models return textual pseudo-calls instead of structured tool_calls.
  // Parse and normalize those so tools still execute reliably.
  if (toolCalls.length === 0 && typeof assistantMessage.content === 'string') {
    const textCalls = extractTextToolCalls(assistantMessage.content);
    if (textCalls.length > 0) {
      toolCalls = textCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: normalizeToolArguments(tc.name, tc.arguments),
        argumentsRaw: tc.argumentsRaw,
      }));

      assistantMessage.tool_calls = textCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: {
          name: tc.name,
          arguments: tc.arguments,
          _arguments_str: tc.argumentsRaw,
        },
      }));
    }
  }

  const toolResults: Array<{ toolName: string; toolCallId?: string; result: unknown }> = [];
  const osCommands: VoraOsCommand[] = [];

  if (toolCalls.length > 0) {
    if (voraSession.role === 'STUDENT') {
      toolCalls = toolCalls.filter((tc) => tc.name === 'open_app');
    }

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
        ? await callOpenRouter(followUpMessages, undefined, model)
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
      reply:      stripToolMarkup(secondResult.message.content ?? 'Done.'),
      toolCalls,
      toolResults,
      osCommands: osCommands.length > 0 ? osCommands : undefined,
    });
  }

  // ── No tool calls — plain reply ───────────────────────────────────
  return NextResponse.json({
    reply:       stripToolMarkup(assistantMessage.content ?? ''),
    toolCalls:   [],
    toolResults: [],
    osCommands:  undefined,
  });
}
