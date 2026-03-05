import { connectToDatabase } from '@/database/mongoose';
import AgentAuditLog from '@/database/models/AgentAuditLog';
import { VoraSession, VoraToolCall, VoraToolResult } from './types';

export async function logToolCall(
  session: VoraSession,
  toolCall: VoraToolCall,
  result: VoraToolResult,
  durationMs: number
): Promise<void> {
  try {
    await connectToDatabase();
    await AgentAuditLog.create({
      userId:       session.userId,
      userUsn:      session.usn,
      userRole:     session.role,
      sessionId:    session.sessionId,
      toolName:     toolCall.name,
      toolArgs:     toolCall.arguments,
      result:       result.data ?? {},
      success:      result.success,
      errorMessage: result.error,
      durationMs,
      timestamp:    new Date(),
    });
  } catch {
    // Audit failures must never break the user-facing flow
    console.error('[VORA Audit] Failed to write audit log');
  }
}
