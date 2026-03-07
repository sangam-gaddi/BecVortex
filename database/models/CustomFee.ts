import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomFee extends Document {
  studentUsn: string;
  feeId: string;         // auto-generated unique id like "custom-{ts}-{rand}"
  category: 'penalty' | 'lab' | 'examination' | 'library' | 'hostel' | 'transport' | 'custom';
  name: string;          // e.g. "Lab Break Penalty", "Extra Lab Fee"
  amount: number;
  dueDate?: Date;
  isPaid: boolean;
  addedBy: string;       // officer userId or username
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFeeSchema = new Schema<ICustomFee>(
  {
    studentUsn:  { type: String, required: true, uppercase: true, index: true },
    feeId:       { type: String, required: true, unique: true },
    category:    {
      type: String, required: true,
      enum: ['penalty', 'lab', 'examination', 'library', 'hostel', 'transport', 'custom'],
      default: 'custom'
    },
    name:        { type: String, required: true, trim: true },
    amount:      { type: Number, required: true, min: 0 },
    dueDate:     { type: Date },
    isPaid:      { type: Boolean, default: false },
    addedBy:     { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

const CustomFee: Model<ICustomFee> =
  mongoose.models.CustomFee || mongoose.model<ICustomFee>('CustomFee', CustomFeeSchema);

export default CustomFee;
