import {
  AiWeeklyMenuPlan,
  type AiWeeklyMenuPlanDocument,
  AiWeeklyMenuDay,
  type AiWeeklyMenuDayDocument,
} from '../models/index.js';
import type { AiWeeklyMenuPlanStatus, AiWeeklyMenuDayStatus } from '../types/ai.types.js';

// ── Plan ─────────────────────────────────────────────────────────────────────

export type CreatePlanInput = Partial<AiWeeklyMenuPlanDocument>;

export async function createPlan(data: CreatePlanInput): Promise<AiWeeklyMenuPlanDocument> {
  const created = await AiWeeklyMenuPlan.create(data);
  return created.toObject() as AiWeeklyMenuPlanDocument;
}

export async function findPlanById(planId: string): Promise<AiWeeklyMenuPlanDocument | null> {
  const doc = await AiWeeklyMenuPlan.findOne({ planId }).lean().exec();
  return doc as AiWeeklyMenuPlanDocument | null;
}

export async function updatePlanStatus(
  planId: string,
  status: AiWeeklyMenuPlanStatus,
  errorDetails?: unknown,
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (errorDetails !== undefined && errorDetails !== null) {
    update['errorDetails'] = errorDetails;
  }
  await AiWeeklyMenuPlan.findOneAndUpdate(
    { planId },
    { $set: update },
    { returnDocument: 'after' },
  ).exec();
}

export async function incrementPlanProgress(
  planId: string,
  completedDays: number,
): Promise<void> {
  await AiWeeklyMenuPlan.findOneAndUpdate(
    { planId },
    { $set: { completedDays } },
    { returnDocument: 'after' },
  ).exec();
}

export async function incrementPlanCacheHit(planId: string): Promise<void> {
  await AiWeeklyMenuPlan.findOneAndUpdate(
    { planId },
    { $inc: { cacheHits: 1 } },
    { returnDocument: 'after' },
  ).exec();
}

export async function incrementPlanCacheMiss(planId: string): Promise<void> {
  await AiWeeklyMenuPlan.findOneAndUpdate(
    { planId },
    { $inc: { cacheMisses: 1, providerCallsCompleted: 1 } },
    { returnDocument: 'after' },
  ).exec();
}

// ── Day ──────────────────────────────────────────────────────────────────────

export interface CreateDayInput {
  planId: string;
  dayNumber: number;
  status: AiWeeklyMenuDayStatus;
}

export interface UpdateDayCompletedInput {
  cached: boolean;
  cacheKey: string;
  responseText: string;
  dailyCalories: number;
  meals: Array<{
    name: string;
    description: string;
    estimatedCalories: number;
    estimatedProtein: number;
    estimatedCarbs: number;
    estimatedFat: number;
  }>;
  recommendations: string[];
  warnings: string[];
  safety: { isOutOfScope?: boolean; flags?: string[]; escalationMessage?: string | null };
  provider: string;
  model: string;
  promptVersion: string;
}

export async function createDay(data: CreateDayInput): Promise<AiWeeklyMenuDayDocument> {
  const doc = await AiWeeklyMenuDay.create(data);
  return doc.toObject() as AiWeeklyMenuDayDocument;
}

export async function updateDayStatus(
  planId: string,
  dayNumber: number,
  status: AiWeeklyMenuDayStatus,
): Promise<void> {
  await AiWeeklyMenuDay.findOneAndUpdate(
    { planId, dayNumber },
    { $set: { status } },
    { returnDocument: 'after' },
  ).exec();
}

export async function updateDayCompleted(
  planId: string,
  dayNumber: number,
  data: UpdateDayCompletedInput,
): Promise<void> {
  await AiWeeklyMenuDay.findOneAndUpdate(
    { planId, dayNumber },
    { $set: { status: 'completed', ...data } },
    { returnDocument: 'after' },
  ).exec();
}

export async function updateDayFailed(
  planId: string,
  dayNumber: number,
  errorMessage: string,
): Promise<void> {
  await AiWeeklyMenuDay.findOneAndUpdate(
    { planId, dayNumber },
    { $set: { status: 'failed', errorMessage } },
    { returnDocument: 'after' },
  ).exec();
}

export async function findDaysByPlanId(planId: string): Promise<AiWeeklyMenuDayDocument[]> {
  const docs = await AiWeeklyMenuDay.find({ planId }).sort({ dayNumber: 1 }).lean().exec();
  return docs as AiWeeklyMenuDayDocument[];
}
