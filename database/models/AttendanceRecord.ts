import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendanceRecord extends Document {
    facultyId: mongoose.Types.ObjectId;
    subjectCode: string;
    semester: number;
    department: string;
    topicTaught: string;
    date: Date;
    timeSlot: string;
    presentStudents: mongoose.Types.ObjectId[];
    absentStudents: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const AttendanceRecordSchema: Schema = new Schema(
    {
        facultyId: {
            type: Schema.Types.ObjectId,
            ref: 'User', // Ref to User (faculty)
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
        department: {
            type: String,
            required: true,
            uppercase: true,
        },
        topicTaught: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
            index: true,
        },
        timeSlot: {
            type: String,
            required: true,
            trim: true,
        },
        presentStudents: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Student',
            },
        ],
        absentStudents: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Student',
            },
        ],
    },
    {
        timestamps: true,
        collection: 'attendanceRecords',
    }
);

// Indexes for common queries
AttendanceRecordSchema.index({ subjectCode: 1, semester: 1, date: -1 });

const AttendanceRecord: Model<IAttendanceRecord> =
    mongoose.models.AttendanceRecord || mongoose.model<IAttendanceRecord>('AttendanceRecord', AttendanceRecordSchema);

export default AttendanceRecord;
