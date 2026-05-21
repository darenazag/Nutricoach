import { z } from 'zod';
import { aiSafetySchema } from './aiSafety.schema.js';

const objectiveEnum = z.enum(['lose_weight', 'maintain', 'gain_muscle']);
const planEnum = z.enum(['free', 'pro']);
const confidenceEnum = z.enum(['low', 'medium', 'high']);

const imageMetadataSchema = z
  .object({
    mimeType: z
      .string()
      .min(1, 'mimeType is required')
      .regex(/^image\//, 'mimeType must start with "image/"'),
    sizeBytes: z.number().int().positive('sizeBytes must be > 0'),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict();

export const aiPlateAnalysisRequestSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
    mealId: z.string().min(1).optional(),
    imageMetadata: imageMetadataSchema,
    objective: objectiveEnum.optional(),
    caloriesTarget: z.number().positive().optional(),
    plan: planEnum.optional(),
  })
  .strict();

const detectedFoodSchema = z
  .object({
    name: z.string().min(1),
    estimatedQuantity: z.string(),
    confidence: confidenceEnum,
  })
  .strict();

// Nutrition values expressed as ranges to reflect estimation uncertainty
const nutritionRangeSchema = z
  .object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
  })
  .strict();

const estimatedNutritionSchema = z
  .object({
    caloriesRange: nutritionRangeSchema,
    proteinRange: nutritionRangeSchema,
    carbsRange: nutritionRangeSchema,
    fatRange: nutritionRangeSchema,
  })
  .strict();

const proportionsSchema = z
  .object({
    protein: z.string(),
    carbs: z.string(),
    vegetables: z.string(),
    fats: z.string(),
  })
  .strict();

export const aiPlateAnalysisStructuredDataSchema = z
  .object({
    detectedFoods: z.array(detectedFoodSchema),
    estimatedNutrition: estimatedNutritionSchema,
    assumptions: z.array(z.string()).default([]),
    confidenceReason: z.string(),
    proportions: proportionsSchema,
    recommendations: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    confidence: confidenceEnum,
  })
  .strict();

export const aiPlateAnalysisResponseSchema = z
  .object({
    responseText: z.string(),
    structuredData: aiPlateAnalysisStructuredDataSchema,
    safety: aiSafetySchema,
  })
  .strict();
