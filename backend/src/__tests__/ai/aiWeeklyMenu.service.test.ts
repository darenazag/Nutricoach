import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock providers BEFORE any service import (vi.mock is hoisted by Vitest).
vi.mock('../../modules/ai/providers/index.js', () => {
  class AiProviderError extends Error {
    code: string;
    raw?: unknown;
    constructor(message: string, code: string, raw?: unknown) {
      super(message);
      this.name = 'AiProviderError';
      this.code = code;
      this.raw = raw;
    }
  }
  return {
    AiProviderError,
    generateGeminiJson: vi.fn(),
    generateGeminiJsonWithImage: vi.fn(),
    createGeminiClient: vi.fn(),
  };
});

import {
  createWeeklyMenuPlan,
  getWeeklyMenuPlanById,
  generateWeeklyMenuPlan,
} from '../../modules/ai/services/aiWeeklyMenu.service.js';
import { generateGeminiJson } from '../../modules/ai/providers/index.js';
import {
  createPlan,
  createDay,
} from '../../modules/ai/repositories/aiWeeklyMenu.repository.js';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function makeDayResponse(dayNumber: number) {
  return {
    responseText: `Menú orientativo día ${String(dayNumber)}.`,
    structuredData: {
      dailyCalories: 2200,
      days: [
        {
          day: dayNumber,
          meals: [
            {
              name: 'Desayuno',
              description: 'Avena con plátano',
              estimatedCalories: 400,
              estimatedProtein: 12,
              estimatedCarbs: 60,
              estimatedFat: 8,
            },
            {
              name: 'Almuerzo',
              description: 'Pechuga con arroz',
              estimatedCalories: 600,
              estimatedProtein: 45,
              estimatedCarbs: 55,
              estimatedFat: 10,
            },
            {
              name: 'Cena',
              description: 'Merluza con patata',
              estimatedCalories: 450,
              estimatedProtein: 35,
              estimatedCarbs: 40,
              estimatedFat: 9,
            },
          ],
        },
      ],
      recommendations: ['Bebe agua entre comidas'],
      warnings: [],
    },
    safety: { isOutOfScope: false, flags: [], escalationMessage: null },
  };
}

function makeProviderResponse(dayNumber: number) {
  const data = makeDayResponse(dayNumber);
  return {
    text: JSON.stringify(data),
    parsed: data,
    raw: {},
    metadata: { provider: 'gemini' as const, model: 'gemini-2.5-flash', cached: false },
  };
}

const BASE_REQUEST = {
  userId:         'test-user',
  objective:      'maintain' as const,
  caloriesTarget: 2200,
};

let planCounter = 0;

/**
 * Creates a plan + 7 day stubs in the DB WITHOUT firing background generation.
 * Used in generateWeeklyMenuPlan tests to avoid concurrent background calls.
 */
async function setupTestPlan(overrides?: Partial<typeof BASE_REQUEST>) {
  planCounter++;
  const planId = `plan_test-${String(planCounter)}-${Date.now()}`;
  const req = { ...BASE_REQUEST, ...overrides };
  await createPlan({
    planId,
    userId:         req.userId,
    status:         'generating',
    objective:      req.objective,
    caloriesTarget: req.caloriesTarget,
    totalDays:      7,
    mealsPerDay:    3,
  });
  for (let d = 1; d <= 7; d++) {
    await createDay({ planId, dayNumber: d, status: 'pending' });
  }
  return { planId, req };
}

// ── Tests: createWeeklyMenuPlan ───────────────────────────────────────────────

describe('createWeeklyMenuPlan', () => {
  beforeEach(() => {
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockReset();
    // Supply enough responses so the background that fires doesn't error
    for (let d = 1; d <= 7; d++) {
      vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockResolvedValueOnce(
        makeProviderResponse(d),
      );
    }
  });

  it('returns planId, status=generating and totalDays=7 immediately', async () => {
    const result = await createWeeklyMenuPlan(BASE_REQUEST);

    expect(result.planId).toMatch(/^plan_/);
    expect(result.status).toBe('generating');
    expect(result.totalDays).toBe(7);
    expect(result.message).toBeTruthy();
  });

  it('throws validation_error when objective is missing', async () => {
    await expect(
      createWeeklyMenuPlan({ userId: 'u', caloriesTarget: 2000 }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });
  });

  it('throws validation_error when caloriesTarget is below 1200', async () => {
    await expect(
      createWeeklyMenuPlan({ userId: 'u', objective: 'maintain', caloriesTarget: 800 }),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });
});

// ── Tests: getWeeklyMenuPlanById ──────────────────────────────────────────────

describe('getWeeklyMenuPlanById', () => {
  beforeEach(() => {
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockReset();
    for (let d = 1; d <= 7; d++) {
      vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockResolvedValueOnce(
        makeProviderResponse(d),
      );
    }
  });

  it('returns the plan DTO with progress and usageEstimation', async () => {
    const { planId } = await setupTestPlan();

    const dto = await getWeeklyMenuPlanById(planId);

    expect(dto.planId).toBe(planId);
    expect(dto.totalDays).toBe(7);
    expect(dto.progress).toMatchObject({ totalDays: 7 });
    expect(dto.usageEstimation.realTokensAvailable).toBe(false);
    expect(dto.usageEstimation.providerCallsPlanned).toBe(7);
  });

  it('throws not_found for an unknown planId', async () => {
    await expect(getWeeklyMenuPlanById('plan_unknown-xyz-999')).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'not_found',
    });
  });
});

// ── Tests: generateWeeklyMenuPlan (awaited directly) ──────────────────────────

describe('generateWeeklyMenuPlan (awaited directly)', () => {
  beforeEach(() => {
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockReset();
  });

  it('calls Gemini 7 times and sets status=completed on happy path', async () => {
    const mock = vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown);
    for (let d = 1; d <= 7; d++) mock.mockResolvedValueOnce(makeProviderResponse(d));

    const { planId, req } = await setupTestPlan();
    await generateWeeklyMenuPlan(planId, req);

    expect(mock).toHaveBeenCalledTimes(7);

    const dto = await getWeeklyMenuPlanById(planId);
    expect(dto.status).toBe('completed');
    expect(dto.completedDays).toBe(7);
  });

  it('includes previousDaysSummary in prompt from day 2 onward', async () => {
    const mock = vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown);
    for (let d = 1; d <= 7; d++) mock.mockResolvedValueOnce(makeProviderResponse(d));

    const { planId, req } = await setupTestPlan({ userId: 'user-prev-summary' });
    await generateWeeklyMenuPlan(planId, req);

    // Day 1 (calls[0]): previousDaysSummary should say "Ninguno"
    const call0 = mock.mock.calls[0] as Array<{ userPrompt: string }>;
    expect(call0[0].userPrompt).toContain('Ninguno');

    // Day 2 (calls[1]): should include "Día 1" in previousDaysSummary
    const call1 = mock.mock.calls[1] as Array<{ userPrompt: string }>;
    expect(call1[0].userPrompt).toContain('Día 1');
  });

  it('skips provider on cache HIT and increments cacheHits', async () => {
    const mock = vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown);

    // First plan: prime the cache
    for (let d = 1; d <= 7; d++) mock.mockResolvedValueOnce(makeProviderResponse(d));
    const { planId: planId1, req } = await setupTestPlan({ userId: 'user-cache-hit' });
    await generateWeeklyMenuPlan(planId1, req);

    // Second plan with identical request: all days should come from cache
    mock.mockReset();
    const { planId: planId2 } = await setupTestPlan({ userId: 'user-cache-hit' });
    await generateWeeklyMenuPlan(planId2, req);

    // Provider should not have been called for any day
    expect(mock).not.toHaveBeenCalled();

    const dto = await getWeeklyMenuPlanById(planId2);
    expect(dto.status).toBe('completed');
    expect(dto.usageEstimation.cacheHits).toBe(7);
    expect(dto.usageEstimation.cacheMisses).toBe(0);
  });

  it('marks day 4 as failed and sets plan to partial_failed, days 1–3 remain completed', async () => {
    const { AiProviderError } = await import('../../modules/ai/providers/index.js');
    const mock = vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown);

    for (let d = 1; d <= 3; d++) mock.mockResolvedValueOnce(makeProviderResponse(d));
    mock.mockRejectedValueOnce(new AiProviderError('quota exceeded', 'quota_error'));
    for (let d = 5; d <= 7; d++) mock.mockResolvedValueOnce(makeProviderResponse(d));

    const { planId, req } = await setupTestPlan({ userId: 'user-partial-fail' });
    await generateWeeklyMenuPlan(planId, req);

    const dto = await getWeeklyMenuPlanById(planId);
    expect(dto.status).toBe('partial_failed');
    expect(dto.completedDays).toBe(6);
    expect(dto.errorDetails).toMatchObject({ failedDays: [{ day: 4 }] });

    const day3 = dto.days.find((d) => d.dayNumber === 3);
    expect(day3?.status).toBe('completed');

    const day4 = dto.days.find((d) => d.dayNumber === 4);
    expect(day4?.status).toBe('failed');
  });

  it('sets status=failed and completedDays=0 when all 7 days fail', async () => {
    const { AiProviderError } = await import('../../modules/ai/providers/index.js');
    const mock = vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown);
    mock.mockRejectedValue(new AiProviderError('service unavailable', 'provider_unavailable'));

    const { planId, req } = await setupTestPlan({
      userId:         'user-all-fail',
      objective:      'gain_muscle',
      caloriesTarget: 2500,
    });
    await generateWeeklyMenuPlan(planId, req);

    const dto = await getWeeklyMenuPlanById(planId);
    expect(dto.status).toBe('failed');
    expect(dto.completedDays).toBe(0);
  });
});
