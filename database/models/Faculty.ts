import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAssignedClass {
    subjectCode: string;
    semester: number;
    section?: string;
}

export interface IFaculty extends Document {
    userId: mongoose.Types.ObjectId;
    employeeId: string;
    name: string;
    department: string;
    assignedClasses: IAssignedClass[];
    createdAt: Date;
    updatedAt: Date;
}

const AssignedClassSchema = new Schema({
    subjectCode: { type: String, required: true },
    semester: { type: Number, required: true },
    section: { type: String, default: null },
}, { _id: false });

const FacultySchema: Schema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        employeeId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        department: {
            type: String,
            required: true,
            uppercase: true,
        },
        assignedClasses: {
            type: [AssignedClassSchema],
            default: [],
        },
    },
    {
        timestamps: true,
        collection: 'faculties',
    }
);

FacultySchema.index({ department: 1 });
FacultySchema.index({ userId: 1 });

const Faculty: Model<IFaculty> =
    mongoose.models.Faculty || mongoose.model<IFaculty>('Faculty', FacultySchema);

export default Faculty;
