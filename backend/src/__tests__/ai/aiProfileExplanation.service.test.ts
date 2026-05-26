import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { runAiProfileExplanation } from '../../modules/ai/services/aiProfileExplanation.service.js';
import { generateGeminiJson } from '../../modules/ai/providers/index.js';

// ── Mock payload — must match aiProfileExplanationResponseSchema exactly ─────

const PROFILE_RESPONSE = {
  responseText: 'Tu perfil nutricional indica lo siguiente.',
  structuredData: {
    explainedMetrics: ['Tu metabolismo basal es de 1600 kcal/día'],
    recommendations: ['Mantén una dieta equilibrada'],
    warnings: [],
    confidence: 'high' as const,
  },
  safety: { isOutOfScope: false, flags: [], escalationMessage: null },
};

const PROVIDER_RESPONSE = {
  text: JSON.stringify(PROFILE_RESPONSE),
  parsed: PROFILE_RESPONSE,
  raw: {},
  metadata: { provider: 'gemini' as const, model: 'gemini-2.5-flash', cached: false },
};

// ── Valid request ─────────────────────────────────────────────────────────────

const VALID_REQUEST = {
  userId: 'test-user',
  objective: 'lose_weight' as const,
  basalMetabolicRate: 1600,
  totalDailyEnergyExpenditure: 2000,
  caloriesTarget: 1800,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runAiProfileExplanation', () => {
  beforeEach(() => {
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockReset();
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockResolvedValue(PROVIDER_RESPONSE);
  });

  it('throws validation_error when required fields are missing', async () => {
    await expect(runAiProfileExplanation({ userId: 'u' })).rejects.toMatchObject({
      name: 'AiServiceError',
      code: 'validation_error',
    });
  });

  it('returns result with metadata.cached = false on first call (MISS)', async () => {
    const result = await runAiProfileExplanation(VALID_REQUEST);

    expect(result.metadata.cached).toBe(false);
    expect(result.responseText).toBe(PROFILE_RESPONSE.responseText);
    expect(vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown)).toHaveBeenCalledTimes(1);
  });

  it('returns metadata.cached = true on second identical call (HIT)', async () => {
    await runAiProfileExplanation(VALID_REQUEST);
    vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown).mockClear();

    const hit = await runAiProfileExplanation(VALID_REQUEST);

    expect(hit.metadata.cached).toBe(true);
    expect(vi.mocked(generateGeminiJson as (...args: unknown[]) => unknown)).not.toHaveBeenCalled();
  });

  it('HIT and MISS return the same conversationId prefix pattern', async () => {
    const miss = await runAiProfileExplanation(VALID_REQUEST);
    const hit = await runAiProfileExplanation(VALID_REQUEST);

    // Different conversationIds — each call creates its own
    expect(miss.conversationId).not.toBe(hit.conversationId);
    expect(miss.conversationId).toMatch(/^conv_/);
    expect(hit.conversationId).toMatch(/^conv_/);
  });
});
