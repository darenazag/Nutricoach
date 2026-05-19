import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import { AI_INTERACTION_TYPES, AI_PROVIDERS } from '../types/ai.types.js';

const AiCacheEntrySchema = new Schema(
  {
    cacheKey: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: AI_INTERACTION_TYPES,
      required: true,
    },
    inputHash: { type: String, required: true, index: true },
    resultText: { type: String, default: '' },
    resultJson: { type: Schema.Types.Mixed, default: null },
    provider: {
      type: String,
      enum: AI_PROVIDERS,
      default: 'gemini',
    },
    model: { type: String, default: '' },
    promptVersion: { type: String, default: '' },
    expiresAt: { type: Date },
    hitCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'ai_cache_entries' },
);

// TTL index: MongoDB elimina automáticamente el documento cuando `expiresAt` se cumple.
// Si `expiresAt` es null/undefined, el documento no se borra (comportamiento documentado).
AiCacheEntrySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AiCacheEntryDocument = InferSchemaType<typeof AiCacheEntrySchema>;

export const AiCacheEntry: Model<AiCacheEntryDocument> = model<AiCacheEntryDocument>(
  'AiCacheEntry',
  AiCacheEntrySchema,
);
