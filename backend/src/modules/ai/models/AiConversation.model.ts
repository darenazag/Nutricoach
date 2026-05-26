import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import {
  AI_CONVERSATION_STATUSES,
  AI_INTERACTION_TYPES,
  AI_PROVIDERS,
} from '../types/ai.types.js';

const AiConversationSchema = new Schema(
  {
    conversationId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, default: '' },
    type: {
      type: String,
      enum: AI_INTERACTION_TYPES,
      required: true,
    },
    provider: {
      type: String,
      enum: AI_PROVIDERS,
      default: 'gemini',
    },
    model: { type: String, default: '' },
    status: {
      type: String,
      enum: AI_CONVERSATION_STATUSES,
      default: 'active',
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'ai_conversations' },
);

AiConversationSchema.index({ userId: 1, createdAt: -1 });

export type AiConversationDocument = InferSchemaType<typeof AiConversationSchema>;

export const AiConversation: Model<AiConversationDocument> = model<AiConversationDocument>(
  'AiConversation',
  AiConversationSchema,
);
