import { Schema, model, type InferSchemaType, type Model } from 'mongoose';
import { AI_PROVIDERS, AI_WEEKLY_DAY_STATUSES } from '../types/ai.types.js';

const MealSchema = new Schema(
  {
    name:               { type: String, default: '' },
    description:        { type: String, default: '' },
    estimatedCalories:  { type: Number, default: 0 },
    estimatedProtein:   { type: Number, default: 0 },
    estimatedCarbs:     { type: Number, default: 0 },
    estimatedFat:       { type: Number, default: 0 },
  },
  { _id: false },
);

const DaySafetySchema = new Schema(
  {
    isOutOfScope:      { type: Boolean, default: false },
    flags:             { type: [String], default: [] },
    escalationMessage: { type: String, default: null },
  },
  { _id: false },
);

const AiWeeklyMenuDaySchema = new Schema(
  {
    planId:          { type: String, required: true, index: true },
    dayNumber:       { type: Number, required: true },
    status:          { type: String, enum: AI_WEEKLY_DAY_STATUSES, default: 'pending' },
    cached:          { type: Boolean, default: false },
    cacheKey:        { type: String, default: '' },
    responseText:    { type: String, default: '' },
    dailyCalories:   { type: Number, default: 0 },
    meals:           { type: [MealSchema], default: [] },
    recommendations: { type: [String], default: [] },
    warnings:        { type: [String], default: [] },
    safety:          { type: DaySafetySchema, default: () => ({}) },
    errorMessage:    { type: String, default: '' },
    provider:        { type: String, enum: AI_PROVIDERS, default: 'gemini' },
    model:           { type: String, default: '' },
    promptVersion:   { type: String, default: '' },
  },
  { timestamps: true, collection: 'ai_weekly_menu_days' },
);

AiWeeklyMenuDaySchema.index({ planId: 1, dayNumber: 1 }, { unique: true });
AiWeeklyMenuDaySchema.index({ planId: 1, status: 1 });

export type AiWeeklyMenuDayDocument = InferSchemaType<typeof AiWeeklyMenuDaySchema>;

export const AiWeeklyMenuDay: Model<AiWeeklyMenuDayDocument> = model<AiWeeklyMenuDayDocument>(
  'AiWeeklyMenuDay',
  AiWeeklyMenuDaySchema,
);
