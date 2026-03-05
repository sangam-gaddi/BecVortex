import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgentAuditLog extends Document {
  userId: string;
  userUsn: string;
  userRole: string;
  sessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  durationMs: number;
  timestamp: Date;
}

const AgentAuditLogSchema = new Schema<IAgentAuditLog>(
  {
    userId:       { type: String, required: true },
    userUsn:      { type: String, required: true },
    userRole:     { type: String, required: true },
    sessionId:    { type: String, required: true },
    toolName:     { type: String, required: true },
    toolArgs:     { type: Schema.Types.Mixed, default: {} },
    result:       { type: Schema.Types.Mixed, default: {} },
    success:      { type: Boolean, required: true },
    errorMessage: { type: String },
    durationMs:   { type: Number, default: 0 },
    timestamp:    { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

AgentAuditLogSchema.index({ userId: 1, timestamp: -1 });
AgentAuditLogSchema.index({ toolName: 1, timestamp: -1 });

const AgentAuditLog: Model<IAgentAuditLog> =
  mongoose.models.AgentAuditLog ||
  mongoose.model<IAgentAuditLog>('AgentAuditLog', AgentAuditLogSchema);

export default AgentAuditLog;
