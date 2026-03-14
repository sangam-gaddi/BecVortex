import mongoose, { Schema, Document } from 'mongoose';

export interface IHallTicket extends Document {
  usn: string;
  studentName: string;
  department: string;
  semester: string;
  degree: string;
  examMonth: string;       // e.g. "MAY/JUNE 2026"
  subjects: Array<{
    subjectCode: string;
    subjectName: string;
    internalMarks?: number;
  }>;
  generatedBy: string;     // officer userId / username
  generatedAt: Date;
  isValid: boolean;        // officer can revoke
  verifiedFees: {
    tuition: boolean;
    examination: boolean;
  };
}

const HallTicketSchema = new Schema<IHallTicket>(
  {
    usn:          { type: String, required: true, uppercase: true, index: true },
    studentName:  { type: String, required: true },
    department:   { type: String, required: true },
    semester:     { type: String, required: true },
    degree:       { type: String, default: 'B.E.' },
    examMonth:    { type: String, required: true },
    subjects: [
      {
        subjectCode:   { type: String, required: true },
        subjectName:   { type: String, required: true },
        internalMarks: { type: Number },
      },
    ],
    generatedBy:  { type: String, required: true },
    generatedAt:  { type: Date, default: Date.now },
    isValid:      { type: Boolean, default: true },
    verifiedFees: {
      tuition:     { type: Boolean, default: false },
      examination: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// One active hall ticket per student per exam session
HallTicketSchema.index({ usn: 1, examMonth: 1 }, { unique: true });

export default mongoose.models.HallTicket ||
  mongoose.model<IHallTicket>('HallTicket', HallTicketSchema);
