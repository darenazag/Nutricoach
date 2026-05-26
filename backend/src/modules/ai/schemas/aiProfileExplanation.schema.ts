import { z } from 'zod';
import { aiSafetySchema } from './aiSafety.schema.js';

const objectiveEnum = z.enum(['lose_weight', 'maintain', 'gain_muscle']);
const planEnum = z.enum(['free', 'pro']);
const confidenceEnum = z.enum(['low', 'medium', 'high']);

export const aiProfileExplanationRequestSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
    objective: objectiveEnum,
    basalMetabolicRate: z.number().positive('basalMetabolicRate must be > 0'),
    totalDailyEnergyExpenditure: z.number().positive('totalDailyEnergyExpenditure must be > 0'),
    caloriesTarget: z
      .number()
      .min(1200, 'caloriesTarget must be at least 1200')
      .max(4500, 'caloriesTarget must be at most 4500'),
    proteinTarget: z.number().nonnegative().optional(),
    carbsTarget: z.number().nonnegative().optional(),
    fatTarget: z.number().nonnegative().optional(),
    plan: planEnum.optional(),
  })
  .strict();

export const aiProfileExplanationStructuredDataSchema = z
  .object({
    explainedMetrics: z.array(z.string()).default([]),
    recommendations: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    confidence: confidenceEnum,
  })
  .strict();

export const aiProfileExplanationResponseSchema = z
  .object({
    responseText: z.string(),
    structuredData: aiProfileExplanationStructuredDataSchema,
    safety: aiSafetySchema,
  })
  .strict();
