import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGradeComponent {
    rawMarks: number;
    convertedMarks: number;
    questionMarks?: Record<string, number>; // e.g., { "Q1": 10, "Q2": 15 }
}

export interface IGrade extends Document {
    studentId: mongoose.Types.ObjectId;
    subjectCode: string;
    semester: number;
    cie1?: IGradeComponent;
    cie2?: IGradeComponent;
    assignment?: IGradeComponent;
    see?: IGradeComponent;
    totalMarks?: number;
    gradePoint?: number;
    letterGrade?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GradeComponentSchema = new Schema({
    rawMarks: { type: Number, required: true, min: 0 },
    convertedMarks: { type: Number, required: true, min: 0 },
    questionMarks: { type: Map, of: Number },
}, { _id: false });

const GradeSchema: Schema = new Schema(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
            index: true,
        },
        subjectCode: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        semester: {
            type: Number,
            required: true,
            index: true,
        },
        cie1: { type: GradeComponentSchema },
        cie2: { type: GradeComponentSchema },
        assignment: { type: GradeComponentSchema },
        see: { type: GradeComponentSchema },
        totalMarks: {
            type: Number,
            min: 0,
            max: 100,
        },
        gradePoint: {
            type: Number,
            min: 0,
            max: 10,
        },
        letterGrade: {
            type: String,
            enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'NE', 'W', 'I', 'X', 'NP'],
        },
    },
    {
        timestamps: true,
        collection: 'grades',
    }
);

// Compound index to ensure a student only has one grade record per subject per semester
GradeSchema.index({ studentId: 1, subjectCode: 1, semester: 1 }, { unique: true });

const Grade: Model<IGrade> =
    mongoose.models.Grade || mongoose.model<IGrade>('Grade', GradeSchema);

export default Grade;
