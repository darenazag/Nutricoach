import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import { AI_INTERACTION_TYPES } from '../types/ai.types.js';

const AiPromptTemplateSchema = new Schema(
  {
    promptKey: { type: String, required: true },
    version: { type: String, required: true },
    type: {
      type: String,
      enum: AI_INTERACTION_TYPES,
      required: true,
    },
    systemPrompt: { type: String, default: '' },
    userPromptTemplate: { type: String, default: '' },
    outputSchema: { type: Schema.Types.Mixed, default: null },
    isActive: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true, collection: 'ai_prompt_templates' },
);

AiPromptTemplateSchema.index({ promptKey: 1, version: 1 }, { unique: true });
AiPromptTemplateSchema.index({ promptKey: 1, isActive: 1 });

export type AiPromptTemplateDocument = InferSchemaType<typeof AiPromptTemplateSchema>;

export const AiPromptTemplate: Model<AiPromptTemplateDocument> =
  model<AiPromptTemplateDocument>('AiPromptTemplate', AiPromptTemplateSchema);
