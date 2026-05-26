import { z } from 'zod';
import { aiMenuResponseSchema } from './aiMenu.schema.js';

const objectiveEnum = z.enum(['lose_weight', 'maintain', 'gain_muscle']);
const planEnum = z.enum(['free', 'pro']);

export const aiWeeklyMenuRequestSchema = z
  .object({
    userId:         z.string().min(1, 'userId is required'),
    objective:      objectiveEnum,
    caloriesTarget: z.number().min(1200).max(4500),
    proteinTarget:  z.number().nonnegative().optional(),
    carbsTarget:    z.number().nonnegative().optional(),
    fatTarget:      z.number().nonnegative().optional(),
    mealsPerDay:    z.number().int().min(1).max(6).optional(),
    notes:          z.string().max(1000).optional(),
    plan:           planEnum.optional(),
  })
  .strict();

export type AiWeeklyMenuRequest = z.infer<typeof aiWeeklyMenuRequestSchema>;

// Reuses aiMenuResponseSchema but enforces exactly 1 day in structuredData.days
// (each Gemini call covers exactly one day).
export const aiWeeklyMenuDayGeminiResponseSchema = aiMenuResponseSchema.superRefine(
  (val, ctx) => {
    if (val.structuredData.days.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected exactly 1 day in structuredData.days, got ${String(val.structuredData.days.length)}`,
      });
    }
  },
);
