import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubject extends Document {
    subjectCode: string;
    title: string;
    credits: number;
    category: string; // e.g., 'BSC', 'ESC', 'ETC', 'PLC', 'HSSC'
    semester: number;
    applicableBranches: string[]; // e.g., ['CS', 'IS', 'AI', 'BT'] or ['ALL']
    createdAt: Date;
    updatedAt: Date;
}

const SubjectSchema: Schema = new Schema({
    subjectCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    credits: {
        type: Number,
        required: true,
        min: 0,
    },
    category: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8,
    },
    applicableBranches: {
        type: [String],
        required: true,
        default: ['ALL'], // 'ALL' implies it's a common subject, or list specific branches like 'CS', 'IS'
    }
}, {
    timestamps: true,
    collection: 'subjects'
});

// Indexes for faster querying by branch and semester
SubjectSchema.index({ semester: 1, applicableBranches: 1 });
SubjectSchema.index({ category: 1 });

const Subject: Model<ISubject> = mongoose.models.Subject || mongoose.model<ISubject>('Subject', SubjectSchema);

export default Subject;
