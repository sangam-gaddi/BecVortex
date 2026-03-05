import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId | null;
  groupId?: mongoose.Types.ObjectId | null;
  isGlobal: boolean;
  isRead: boolean;
  content: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatGroup',
      default: null,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL TTL INDEX for taking advantage of MongoDB's auto-deletion to save space
// Mongoose will automatically drop documents where expiresAt is older than the current time.
ChatMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Additional indexing for fast retrieval
ChatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
ChatMessageSchema.index({ groupId: 1, createdAt: -1 });
ChatMessageSchema.index({ isGlobal: 1, createdAt: -1 });

// Prevent model overwrite in Next.js HMR
const ChatMessage: Model<IChatMessage> = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export default ChatMessage;
