import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import { AI_CONFIDENCE_LEVELS } from '../types/ai.types.js';

const ImageMetadataSchema = new Schema(
  {
    mimeType: { type: String, default: '' },
    sizeBytes: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false },
);

const DetectedFoodSchema = new Schema(
  {
    name: { type: String, required: true },
    estimatedQuantity: { type: String, default: '' },
    confidence: {
      type: String,
      enum: AI_CONFIDENCE_LEVELS,
      default: 'medium',
    },
  },
  { _id: false },
);

const EstimatedNutritionSchema = new Schema(
  {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
  },
  { _id: false },
);

const ProportionsSchema = new Schema(
  {
    protein: { type: String, default: '' },
    carbs: { type: String, default: '' },
    vegetables: { type: String, default: '' },
    fats: { type: String, default: '' },
  },
  { _id: false },
);

const FutureEmbeddingSchema = new Schema(
  {
    embedding: { type: [Number], default: undefined },
    embeddingModel: { type: String, default: '' },
    embeddingVersion: { type: String, default: '' },
  },
  { _id: false },
);

const AiPlateAnalysisSchema = new Schema(
  {
    analysisId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    mealId: { type: String, default: null },
    imageStored: { type: Boolean, default: false },
    imageMetadata: { type: ImageMetadataSchema, default: () => ({}) },
    detectedFoods: { type: [DetectedFoodSchema], default: [] },
    estimatedNutrition: { type: EstimatedNutritionSchema, default: () => ({}) },
    proportions: { type: ProportionsSchema, default: () => ({}) },
    confidence: {
      type: String,
      enum: AI_CONFIDENCE_LEVELS,
      default: 'medium',
    },
    recommendations: { type: [String], default: [] },
    warnings: { type: [String], default: [] },
    rawAiResponse: { type: Schema.Types.Mixed, default: null },
    futureEmbedding: { type: FutureEmbeddingSchema, default: () => ({}) },
  },
  { timestamps: true, collection: 'ai_plate_analyses' },
);

AiPlateAnalysisSchema.index({ userId: 1, createdAt: -1 });
AiPlateAnalysisSchema.index({ mealId: 1 }, { sparse: true });

export type AiPlateAnalysisDocument = InferSchemaType<typeof AiPlateAnalysisSchema>;

export const AiPlateAnalysis: Model<AiPlateAnalysisDocument> = model<AiPlateAnalysisDocument>(
  'AiPlateAnalysis',
  AiPlateAnalysisSchema,
);
