import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRegistrationRequest extends Document {
    studentId: mongoose.Types.ObjectId;
    branch: string; // The specific officer routing branch (e.g. 'IS', 'CS')
    semester: number;
    regularSubjects: string[]; // Array of subject codes
    requestedBacklogs: string[]; // Array of subject codes (Max 2)
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    officerRemarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const RegistrationRequestSchema: Schema = new Schema({
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
    },
    branch: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8,
    },
    regularSubjects: {
        type: [String],
        default: [],
    },
    requestedBacklogs: {
        type: [String],
        default: [],
        validate: [
            {
                validator: function (val: string[]) {
                    return val.length <= 2;
                },
                message: 'A student can request a maximum of 2 backlog subjects per semester.'
            }
        ]
    },
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
    },
    officerRemarks: {
        type: String,
        required: false,
        trim: true,
    }
}, {
    timestamps: true,
    collection: 'registration_requests'
});

// Indexes to speed up routing
// Officers will fetch requests by branch and status (e.g., branch: 'IS', status: 'PENDING')
RegistrationRequestSchema.index({ branch: 1, status: 1 });
RegistrationRequestSchema.index({ studentId: 1 });

const RegistrationRequest: Model<IRegistrationRequest> = mongoose.models.RegistrationRequest || mongoose.model<IRegistrationRequest>('RegistrationRequest', RegistrationRequestSchema);

export default RegistrationRequest;
