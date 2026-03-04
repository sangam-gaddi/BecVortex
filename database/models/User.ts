import mongoose, { Schema, Document, Model } from 'mongoose';
import { ROLES, DEPARTMENTS, type UserRole, type Department } from '@/lib/auth/rbac-constants';

// Re-export types from shared constants
export { ROLES, DEPARTMENTS, DEPARTMENT_LABELS } from '@/lib/auth/rbac-constants';
export type { UserRole, Department } from '@/lib/auth/rbac-constants';

export interface IUser extends Document {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    role: UserRole;
    department?: Department;
    createdBy?: mongoose.Types.ObjectId;
    isActive: boolean;
    activeSessionId?: string;
    profilePicture?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema: Schema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            required: true,
            enum: ROLES,
            index: true,
        },
        department: {
            type: String,
            enum: [...DEPARTMENTS, null],
            default: null,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        activeSessionId: {
            type: String,
            default: null,
        },
        profilePicture: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'users',
    }
);

// Compound indexes
UserSchema.index({ role: 1, department: 1 });
UserSchema.index({ role: 1, isActive: 1 });

const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
