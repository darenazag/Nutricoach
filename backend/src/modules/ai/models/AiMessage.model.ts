import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import { AI_PROVIDERS, AI_ROLES } from '../types/ai.types.js';

const TokenUsageSchema = new Schema(
  {
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
  },
  { _id: false },
);

const CostEstimateSchema = new Schema(
  {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
  },
  { _id: false },
);

const SafetySchema = new Schema(
  {
    blocked: { type: Boolean, default: false },
    reason: { type: String, default: '' },
  },
  { _id: false },
);

const AiMessageSchema = new Schema(
  {
    messageId: { type: String, required: true, unique: true },
    conversationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: AI_ROLES,
      required: true,
    },
    content: { type: String, default: '' },
    structuredData: { type: Schema.Types.Mixed, default: null },
    provider: {
      type: String,
      enum: AI_PROVIDERS,
      default: 'gemini',
    },
    model: { type: String, default: '' },
    promptVersion: { type: String, default: '' },
    tokenUsage: { type: TokenUsageSchema, default: () => ({}) },
    costEstimate: { type: CostEstimateSchema, default: () => ({}) },
    safety: { type: SafetySchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'ai_messages' },
);

AiMessageSchema.index({ conversationId: 1, createdAt: 1 });
AiMessageSchema.index({ userId: 1, createdAt: -1 });

export type AiMessageDocument = InferSchemaType<typeof AiMessageSchema>;

export const AiMessage: Model<AiMessageDocument> = model<AiMessageDocument>(
  'AiMessage',
  AiMessageSchema,
);
