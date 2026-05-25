import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import {
  AI_OBJECTIVES,
  AI_PLANS,
  AI_PROVIDERS,
  AI_WEEKLY_PLAN_STATUSES,
} from '../types/ai.types.js';

const AiWeeklyMenuPlanSchema = new Schema(
  {
    planId:                 { type: String, required: true, unique: true },
    userId:                 { type: String, required: true, index: true },
    status:                 { type: String, enum: AI_WEEKLY_PLAN_STATUSES, default: 'pending' },
    objective:              { type: String, enum: AI_OBJECTIVES, required: true },
    caloriesTarget:         { type: Number, required: true },
    proteinTarget:          { type: Number, default: null },
    carbsTarget:            { type: Number, default: null },
    fatTarget:              { type: Number, default: null },
    mealsPerDay:            { type: Number, default: 3 },
    totalDays:              { type: Number, default: 7 },
    notes:                  { type: String, default: '' },
    plan:                   { type: String, enum: AI_PLANS, default: 'free' },
    completedDays:          { type: Number, default: 0 },
    provider:               { type: String, enum: AI_PROVIDERS, default: 'gemini' },
    model:                  { type: String, default: '' },
    promptVersion:          { type: String, default: '' },
    cacheHits:              { type: Number, default: 0 },
    cacheMisses:            { type: Number, default: 0 },
    providerCallsPlanned:   { type: Number, default: 7 },
    providerCallsCompleted: { type: Number, default: 0 },
    errorDetails:           { type: Schema.Types.Mixed, default: null },
    realTokensAvailable:    { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'ai_weekly_menu_plans' },
);

AiWeeklyMenuPlanSchema.index({ userId: 1, createdAt: -1 });
AiWeeklyMenuPlanSchema.index({ status: 1 });

export type AiWeeklyMenuPlanDocument = InferSchemaType<typeof AiWeeklyMenuPlanSchema>;

export const AiWeeklyMenuPlan: Model<AiWeeklyMenuPlanDocument> = model<AiWeeklyMenuPlanDocument>(
  'AiWeeklyMenuPlan',
  AiWeeklyMenuPlanSchema,
);
