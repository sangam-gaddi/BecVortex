import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  usn?: string;
  studentName: string;
  phone?: string;
  permanentAddress?: string;
  department: string;
  semester: string;
  degree: string;
  stdType: string;
  casteCat: string;
  csn: string;
  idNo: string;
  admissionID: string;
  paymentCategory: string;
  entryType?: string;
  entranceExamRank?: string;
  previousCollegeName?: string;
  previousMarks?: string;

  // Authentication fields
  email?: string;
  password?: string;
  recoveryPhraseHash?: string;
  activeSessionId?: string;
  isRegistered: boolean;

  // Fee tracking
  paidFees: string[];

  // Chat-specific fields
  profilePicture?: string;
  isOnline?: boolean;
  lastSeen?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema: Schema = new Schema({
  usn: {
    type: String,
    required: false,
    unique: true,
    uppercase: true,
    sparse: true,
    index: true
  },
  studentName: { type: String, required: true },
  phone: { type: String, required: false },
  permanentAddress: { type: String, required: false },
  department: { type: String, required: true },
  semester: { type: String, required: true },
  degree: { type: String, required: true },
  stdType: { type: String, required: true },
  casteCat: { type: String, required: true },
  csn: { type: String, required: true, unique: true },
  idNo: { type: String, required: false },
  admissionID: { type: String, required: false },
  entryType: {
    type: String,
    enum: ['Regular 1st Year', 'Lateral Entry - Diploma', 'Lateral Entry - B.Sc.'],
    required: false,
  },
  entranceExamRank: { type: String, required: false },
  previousCollegeName: { type: String, required: false },
  previousMarks: { type: String, required: false },
  paymentCategory: {
    type: String,
    required: true,
    enum: ['KCET', 'COMEDK', 'Management']
  },

  // Fee Tracking
  paidFees: {
    type: [String],
    default: []
  },

  // Authentication
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    index: true
  },
  password: { type: String },
  recoveryPhraseHash: { type: String },
  activeSessionId: { type: String, default: null },
  isRegistered: {
    type: Boolean,
    default: false,
    index: true
  },

  // Chat fields
  profilePicture: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'students'
});

// Indexes for performance
StudentSchema.index({ usn: 1, isRegistered: 1 });
StudentSchema.index({ email: 1 }, { sparse: true });
StudentSchema.index({ isOnline: 1 });

const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);

export default Student;
