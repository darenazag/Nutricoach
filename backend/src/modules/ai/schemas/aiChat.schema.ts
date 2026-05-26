import { z } from 'zod';
import { aiSafetySchema } from './aiSafety.schema.js';

const objectiveEnum = z.enum(['lose_weight', 'maintain', 'gain_muscle']);
const planEnum = z.enum(['free', 'pro']);
const confidenceEnum = z.enum(['low', 'medium', 'high']);

const userContextSchema = z
  .object({
    objective: objectiveEnum.optional(),
    caloriesTarget: z.number().positive().optional(),
    proteinTarget: z.number().nonnegative().optional(),
    carbsTarget: z.number().nonnegative().optional(),
    fatTarget: z.number().nonnegative().optional(),
  })
  .strict();

export const aiChatRequestSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
    conversationId: z.string().min(1).optional(),
    message: z
      .string()
      .min(1, 'message cannot be empty')
      .max(4000, 'message too long (max 4000 chars)'),
    userContext: userContextSchema.optional(),
    plan: planEnum.optional(),
  })
  .strict();

export const aiChatStructuredDataSchema = z
  .object({
    recommendations: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
    followUpQuestions: z.array(z.string()).default([]),
    confidence: confidenceEnum,
  })
  .strict();

export const aiChatResponseSchema = z
  .object({
    responseText: z.string(),
    structuredData: aiChatStructuredDataSchema,
    safety: aiSafetySchema,
  })
  .strict();
