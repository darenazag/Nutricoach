import { createHash, randomUUID } from 'node:crypto';
import {
  aiWeeklyMenuRequestSchema,
  aiWeeklyMenuDayGeminiResponseSchema,
  type AiWeeklyMenuRequest,
} from '../schemas/index.js';
import { AI_WEEKLY_MENU_DAY_PROMPT_KEY, buildRenderedPrompt } from '../prompts/index.js';
import { AiProviderError } from '../providers/index.js';
import { generateTextJson } from './aiProviderRouter.service.js';
import type { AiProvider } from '../types/index.js';
import {
  createPlan,
  createDay,
  findPlanById,
  findDaysByPlanId,
  updatePlanStatus,
  incrementPlanProgress,
  incrementPlanCacheHit,
  incrementPlanCacheMiss,
  updateDayStatus,
  updateDayCompleted,
  updateDayFailed,
} from '../repositories/aiWeeklyMenu.repository.js';
import type { AiWeeklyMenuPlanDocument, AiWeeklyMenuDayDocument } from '../models/index.js';
import type { AiWeeklyMenuPlanStatus } from '../types/ai.types.js';
import { AiServiceError } from './aiServiceError.js';
import { getDefaultPromptTemplate } from './aiPrompt.service.js';
import { validateAiResponse } from './aiValidation.service.js';
import { buildCacheKey, getCacheTtlSeconds, storeCache, tryGetCached } from './aiCache.service.js';
import type { RenderPromptVariables } from '../prompts/index.js';
import type { AiMenuResponse } from './aiResponse.types.js';

// ── Public result types ───────────────────────────────────────────────────────

export interface WeeklyMenuMealDto {
  name: string;
  description: string;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
}

export interface WeeklyMenuDayDto {
  dayNumber: number;
  status: string;
  cached: boolean;
  dailyCalories: number;
  meals: WeeklyMenuMealDto[];
  recommendations: string[];
  warnings: string[];
  errorMessage: string;
}

export interface WeeklyMenuPlanDto {
  planId: string;
  status: string;
  userId: string;
  objective: string;
  caloriesTarget: number;
  mealsPerDay: number;
  totalDays: number;
  completedDays: number;
  progress: { completedDays: number; totalDays: number; percentage: number };
  days: WeeklyMenuDayDto[];
  usageEstimation: {
    providerCallsPlanned: number;
    providerCallsCompleted: number;
    cacheHits: number;
    cacheMisses: number;
    realTokensAvailable: false;
  };
  errorDetails?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWeeklyMenuPlanResult {
  planId: string;
  status: 'generating';
  totalDays: 7;
  message: string;
}

// ── Internal types ────────────────────────────────────────────────────────────

interface DaySummaryMeal {
  name: string;
  mainFoods: string;
}

interface DaySummary {
  day: number;
  meals: DaySummaryMeal[];
}

// ── persist helper ────────────────────────────────────────────────────────────

async function persist<T>(action: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new AiServiceError(
      `Persistence failed during "${action}": ${err instanceof Error ? err.message : String(err)}`,
      'persistence_error',
      { cause: err, details: { action } },
    );
  }
}

// ── Prompt variable helpers ───────────────────────────────────────────────────

function buildWeeklyMenuDayPromptVariables(
  req: AiWeeklyMenuRequest,
  dayNumber: number,
  previousDaysSummary: string,
  previousSummaryHash: string,
): RenderPromptVariables {
  return {
    objective:            req.objective,
    caloriesTarget:       req.caloriesTarget,
    proteinTarget:        req.proteinTarget ?? '',
    carbsTarget:          req.carbsTarget ?? '',
    fatTarget:            req.fatTarget ?? '',
    mealsPerDay:          req.mealsPerDay ?? '',
    notes:                req.notes ?? '',
    plan:                 req.plan ?? '',
    dayNumber,
    previousDaysSummary,
    previousSummaryHash,
  };
}

function extractMainFoods(mealName: string): string {
  // Take first 3 nouns: strip stop words and grab key ingredients
  const stopWords = new Set(['al', 'con', 'de', 'en', 'y', 'a', 'el', 'la', 'los', 'las', 'un', 'una']);
  const words = mealName
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  return words.slice(0, 3).join(', ') || mealName;
}

function renderPreviousDaysSummary(summaries: DaySummary[]): string {
  if (summaries.length === 0) return 'Ninguno (primer día del plan).';
  const lines = summaries.map((s) => {
    const mealsText = s.meals.map((m) => `${m.name} (${m.mainFoods})`).join(', ');
    return `Día ${String(s.day)}: ${mealsText}`;
  });
  return lines.join('\n');
}

function buildPreviousSummaryHash(summaries: DaySummary[]): string {
  if (summaries.length === 0) return 'no_prev';
  return createHash('sha256')
    .update(JSON.stringify(summaries))
    .digest('hex')
    .slice(0, 16);
}

function buildCompactDaySummary(
  dayNumber: number,
  dayData: AiMenuResponse['structuredData']['days'][number],
): DaySummary {
  return {
    day: dayNumber,
    meals: dayData.meals.map((m) => ({
      name: m.name,
      mainFoods: extractMainFoods(m.name + ' ' + m.description),
    })),
  };
}

// ── DTO mapper ────────────────────────────────────────────────────────────────

function mapDayToDto(day: AiWeeklyMenuDayDocument): WeeklyMenuDayDto {
  return {
    dayNumber:       day.dayNumber,
    status:          day.status,
    cached:          day.cached,
    dailyCalories:   day.dailyCalories,
    meals:           (day.meals as WeeklyMenuMealDto[]) ?? [],
    recommendations: day.recommendations ?? [],
    warnings:        day.warnings ?? [],
    errorMessage:    day.errorMessage ?? '',
  };
}

function mapPlanToDto(
  plan: AiWeeklyMenuPlanDocument,
  days: AiWeeklyMenuDayDocument[],
): WeeklyMenuPlanDto {
  const completedDays = plan.completedDays;
  const totalDays = plan.totalDays;
  return {
    planId:        plan.planId,
    status:        plan.status,
    userId:        plan.userId,
    objective:     plan.objective,
    caloriesTarget: plan.caloriesTarget,
    mealsPerDay:   plan.mealsPerDay,
    totalDays,
    completedDays,
    progress: {
      completedDays,
      totalDays,
      percentage: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
    },
    days: days.map(mapDayToDto),
    usageEstimation: {
      providerCallsPlanned:   plan.providerCallsPlanned,
      providerCallsCompleted: plan.providerCallsCompleted,
      cacheHits:              plan.cacheHits,
      cacheMisses:            plan.cacheMisses,
      realTokensAvailable:    false,
    },
    errorDetails: plan.errorDetails ?? undefined,
    createdAt: (plan as unknown as { createdAt: Date }).createdAt?.toISOString?.() ?? '',
    updatedAt: (plan as unknown as { updatedAt: Date }).updatedAt?.toISOString?.() ?? '',
  };
}

// ── Per-day generation ────────────────────────────────────────────────────────

async function generateWeeklyMenuDay(
  planId: string,
  req: AiWeeklyMenuRequest,
  dayNumber: number,
  previousSummaries: DaySummary[],
): Promise<AiMenuResponse['structuredData']['days'][number]> {
  await persist('updateDayStatus generating', () =>
    updateDayStatus(planId, dayNumber, 'generating'),
  );

  const template = getDefaultPromptTemplate(AI_WEEKLY_MENU_DAY_PROMPT_KEY);

  const previousDaysSummary = renderPreviousDaysSummary(previousSummaries);
  const previousSummaryHash = buildPreviousSummaryHash(previousSummaries);

  const vars = buildWeeklyMenuDayPromptVariables(req, dayNumber, previousDaysSummary, previousSummaryHash);
  const { systemPrompt, userPrompt } = buildRenderedPrompt({
    systemPrompt: template.systemPrompt,
    userPromptTemplate: template.userPromptTemplate,
    variables: vars,
  });

  const resolvedModel = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
  const cacheKey = buildCacheKey({
    systemPrompt,
    userPrompt,
    model: resolvedModel,
    promptVersion: template.version,
  });

  let cachedJson: unknown = null;
  try {
    cachedJson = await tryGetCached<unknown>(cacheKey);
  } catch (err) {
    console.warn('[aiWeeklyMenu] tryGetCached failed:', err);
  }

  let responseData: AiMenuResponse;
  let usedProvider: AiProvider;
  let usedModel: string;
  let fromCache: boolean;

  if (cachedJson !== null) {
    const validated = aiWeeklyMenuDayGeminiResponseSchema.safeParse(cachedJson);
    if (validated.success) {
      responseData = validated.data;
      usedProvider = 'gemini';
      usedModel = resolvedModel;
      fromCache = true;
      await incrementPlanCacheHit(planId);
    } else {
      // Corrupt or stale cache entry — fall through to provider
      cachedJson = null;
    }
  }

  if (cachedJson === null) {
    let providerResponse;
    try {
      providerResponse = await generateTextJson<unknown>({ systemPrompt, userPrompt });
    } catch (err) {
      if (err instanceof AiProviderError) {
        throw new AiServiceError(
          `AI provider failed on day ${String(dayNumber)}: ${err.message}`,
          'provider_error',
          { cause: err, details: { providerCode: err.code, dayNumber } },
        );
      }
      throw err;
    }

    responseData = validateAiResponse(aiWeeklyMenuDayGeminiResponseSchema, providerResponse.parsed);

    try {
      await storeCache({
        cacheKey,
        type: 'weekly_menu_generation',
        inputHash: cacheKey,
        resultText: providerResponse.text,
        resultJson: responseData,
        provider: providerResponse.metadata.provider,
        model: providerResponse.metadata.model,
        promptVersion: template.version,
        ttlSeconds: getCacheTtlSeconds(),
      });
    } catch (err) {
      console.warn('[aiWeeklyMenu] storeCache failed:', err);
    }

    usedProvider = providerResponse.metadata.provider;
    usedModel = providerResponse.metadata.model;
    fromCache = false;
    await incrementPlanCacheMiss(planId);
  }

  const dayData = responseData!.structuredData.days[0]!;

  await persist('updateDayCompleted', () =>
    updateDayCompleted(planId, dayNumber, {
      cached:          fromCache!,
      cacheKey,
      responseText:    responseData!.responseText,
      dailyCalories:   responseData!.structuredData.dailyCalories,
      meals:           dayData.meals,
      recommendations: responseData!.structuredData.recommendations,
      warnings:        responseData!.structuredData.warnings,
      safety:          responseData!.safety,
      provider:        usedProvider!,
      model:           usedModel!,
      promptVersion:   template.version,
    }),
  );

  return dayData;
}

// ── Background plan generation ────────────────────────────────────────────────

export async function generateWeeklyMenuPlan(
  planId: string,
  req: AiWeeklyMenuRequest,
): Promise<void> {
  const summaries: DaySummary[] = [];
  const failedDays: Array<{ day: number; error: string }> = [];
  let completedCount = 0;

  for (let dayNumber = 1; dayNumber <= 7; dayNumber++) {
    try {
      const dayData = await generateWeeklyMenuDay(planId, req, dayNumber, summaries);
      summaries.push(buildCompactDaySummary(dayNumber, dayData));
      completedCount++;
      await incrementPlanProgress(planId, completedCount);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      failedDays.push({ day: dayNumber, error: errMsg });
      try {
        await updateDayFailed(planId, dayNumber, errMsg);
      } catch {
        // best-effort — continue to next day
      }
    }
  }

  const finalStatus: AiWeeklyMenuPlanStatus =
    completedCount === 0
      ? 'failed'
      : failedDays.length > 0
        ? 'partial_failed'
        : 'completed';

  await updatePlanStatus(
    planId,
    finalStatus,
    failedDays.length > 0 ? { failedDays } : null,
  );
}

// ── Public service functions ──────────────────────────────────────────────────

export async function createWeeklyMenuPlan(
  input: unknown,
): Promise<CreateWeeklyMenuPlanResult> {
  const parseResult = aiWeeklyMenuRequestSchema.safeParse(input);
  if (!parseResult.success) {
    throw new AiServiceError(
      'Weekly menu request failed Zod validation.',
      'validation_error',
      { cause: parseResult.error, details: parseResult.error.issues },
    );
  }
  const req = parseResult.data;
  const planId = `plan_${randomUUID()}`;

  await persist('createPlan', () =>
    createPlan({
      planId,
      userId:         req.userId,
      status:         'generating',
      objective:      req.objective,
      caloriesTarget: req.caloriesTarget,
      proteinTarget:  req.proteinTarget ?? null,
      carbsTarget:    req.carbsTarget ?? null,
      fatTarget:      req.fatTarget ?? null,
      mealsPerDay:    req.mealsPerDay ?? 3,
      totalDays:      7,
      notes:          req.notes ?? '',
      plan:           req.plan ?? 'free',
    }),
  );

  for (let day = 1; day <= 7; day++) {
    await persist(`createDay ${String(day)}`, () =>
      createDay({ planId, dayNumber: day, status: 'pending' }),
    );
  }

  // Fire-and-forget: HTTP handler returns 202 immediately.
  // The .catch() captures fatal errors that escape the per-day try/catch.
  void generateWeeklyMenuPlan(planId, req).catch(async (err: unknown) => {
    console.error('[aiWeeklyMenu] Fatal error in generateWeeklyMenuPlan:', err);
    try {
      await updatePlanStatus(planId, 'failed', {
        fatalError: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // best-effort
    }
  });

  return {
    planId,
    status: 'generating',
    totalDays: 7,
    message:
      'Generación iniciada. Consulta GET /api/ai/menu/weekly/:planId para el progreso.',
  };
}

export async function getWeeklyMenuPlanById(planId: string): Promise<WeeklyMenuPlanDto> {
  if (!planId.trim()) {
    throw new AiServiceError('planId must not be empty.', 'validation_error');
  }
  const plan = await findPlanById(planId);
  if (!plan) {
    throw new AiServiceError(`Weekly menu plan not found: ${planId}`, 'not_found');
  }
  const days = await findDaysByPlanId(planId);
  return mapPlanToDto(plan, days);
}
