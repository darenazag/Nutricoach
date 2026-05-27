import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the providers module BEFORE importing anything that uses it.
// vi.mock is hoisted by Vitest's transform so this runs first.
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

import { runAiMenu } from '../../modules/ai/services/aiMenu.service.js';
import { generateGeminiJson } from '../../modules/ai/providers/index.js';

// ── Mock payload — must match aiMenuResponseSchema exactly (strict) ─────────

const MENU_RESPONSE = {
  responseText: 'Aquí tienes tu menú semanal orientativo.',
  structuredData: {
    dailyCalories: 2800,
    days: [
      {
        day: 1,
        meals: [
          {
            name: 'Desayuno',
            description: 'Avena con plátano y frutos secos',
            estimatedCalories: 450,
            estimatedProtein: 15,
            estimatedCarbs: 65,
            estimatedFat: 12,
          },
        ],
      },
    ],
    recommendations: [],
    warnings: [],
  },
  safety: { isOutOfScope: false, flags: [], escalationMessage: null },
};

const PROVIDER_RESPONSE = {
  text: JSON.stringify(MENU_RESPONSE),
  parsed: MENU_RESPONSE,
  raw: {},
  metadata: { provider: 'gemini' as const, model: 'gemini-2.5-flash', cached: false },
};

// ── Valid request ─────────────────────────────────────────────────────────────

const VALID_REQUEST = {
  userId: 'test-user',
  objective: 'gain_muscle' as const,
  caloriesTarget: 2800,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runAiMenu', () => {
  beforeEach(() => {
    // Reset mock state between tests (call count, resolved values).
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockReset();
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockResolvedValue(PROVIDER_RESPONSE);
  });

  it('throws validation_error for a request with missing required fields', async () => {
    await expect(runAiMenu({ userId: 'u', objective: 'bad_value' })).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'validation_error',
    });
    expect(vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown)).not.toHaveBeenCalled();
  });

  it('throws validation_error for caloriesTarget below minimum (1200)', async () => {
    await expect(
      runAiMenu({ userId: 'u', objective: 'maintain', caloriesTarget: 500 }),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('returns result with metadata.cached = false on first call (MISS)', async () => {
    const result = await runAiMenu(VALID_REQUEST);

    expect(result.metadata.cached).toBe(false);
    expect(result.responseText).toBe(MENU_RESPONSE.responseText);
    expect(result.structuredData.dailyCalories).toBe(2800);
    expect(vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown)).toHaveBeenCalledTimes(1);
  });

  it('returns metadata.cached = true on second identical call (HIT) without calling Gemini', async () => {
    // First call — populates cache
    await runAiMenu(VALID_REQUEST);
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockClear();

    // Second call — must hit cache
    const hit = await runAiMenu(VALID_REQUEST);

    expect(hit.metadata.cached).toBe(true);
    expect(vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown)).not.toHaveBeenCalled();
  });

  it('HIT result contains the same responseText as the original MISS', async () => {
    await runAiMenu(VALID_REQUEST);
    const hit = await runAiMenu(VALID_REQUEST);
    expect(hit.responseText).toBe(MENU_RESPONSE.responseText);
  });
});
