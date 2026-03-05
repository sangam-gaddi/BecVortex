import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatGroup extends Document {
    name: string;
    createdBy: mongoose.Types.ObjectId;
    department?: string; // Optional filtering context
    members: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const ChatGroupSchema = new Schema<IChatGroup>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        department: {
            type: String,
            trim: true,
        },
        members: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
    },
    {
        timestamps: true,
    }
);

// Prevent model overwrite in Next.js HMR
const ChatGroup: Model<IChatGroup> = mongoose.models.ChatGroup || mongoose.model<IChatGroup>('ChatGroup', ChatGroupSchema);

export default ChatGroup;
