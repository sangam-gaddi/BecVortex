import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISystemConfig extends Document {
  key: string;
  value: string;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>({
  key:   { type: String, required: true, unique: true },
  value: { type: String, required: true },
}, { timestamps: true });

const SystemConfig: Model<ISystemConfig> =
  mongoose.models.SystemConfig ||
  mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);

export default SystemConfig;
