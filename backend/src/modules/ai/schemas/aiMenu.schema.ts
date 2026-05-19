import { z } from 'zod';

const objectiveEnum = z.enum(['lose_weight', 'maintain', 'gain_muscle']);
const planEnum = z.enum(['free', 'pro']);

export const aiMenuRequestSchema = z
  .object({
    userId: z.string().min(1, 'userId is required'),
    objective: objectiveEnum,
    caloriesTarget: z.number().positive('caloriesTarget must be > 0'),
    proteinTarget: z.number().nonnegative().optional(),
    carbsTarget: z.number().nonnegative().optional(),
    fatTarget: z.number().nonnegative().optional(),
    days: z.number().int().min(1).max(7).optional(),
    mealsPerDay: z.number().int().min(1).max(6).optional(),
    notes: z.string().max(1000).optional(),
    plan: planEnum.optional(),
  })
  .strict();

const aiMenuMealSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    estimatedCalories: z.number().nonnegative(),
    estimatedProtein: z.number().nonnegative(),
    estimatedCarbs: z.number().nonnegative(),
    estimatedFat: z.number().nonnegative(),
  })
  .strict();

const aiMenuDaySchema = z
  .object({
    day: z.number().int().min(1),
    meals: z.array(aiMenuMealSchema),
  })
  .strict();

export const aiMenuStructuredDataSchema = z
  .object({
    dailyCalories: z.number().nonnegative(),
    days: z.array(aiMenuDaySchema),
    recommendations: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
  })
  .strict();

export const aiMenuResponseSchema = z
  .object({
    responseText: z.string(),
    structuredData: aiMenuStructuredDataSchema,
  })
  .strict();
