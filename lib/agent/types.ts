/**
 * VORA Agent – shared TypeScript types
 */

export type VoraRole =
  | 'MASTER'
  | 'PRINCIPAL'
  | 'HOD'
  | 'OFFICER'
  | 'FACULTY'
  | 'STUDENT';

export interface VoraToolParam {
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required: boolean;
  enum?: string[];
  items?: { type: string };
}

export interface VoraTool {
  name: string;
  description: string;
  parameters: Record<string, VoraToolParam>;
  /** Roles that may invoke this tool */
  requiredRoles: VoraRole[];
}

export interface VoraToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface VoraToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface VoraChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** OS-level side-effect commands returned by the agent */
export interface VoraOsCommand {
  type: 'open_app' | 'close_app';
  appId: string;
  data?: Record<string, unknown>;
}

/** Decoded session passed around the VORA layer */
export interface VoraSession {
  userId: string;
  usn: string;
  role: VoraRole;
  department?: string;
  userType: 'staff' | 'student';
  sessionId: string;
}
