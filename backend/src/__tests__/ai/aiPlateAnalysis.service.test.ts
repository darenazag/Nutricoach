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

import { runAiPlateAnalysis } from '../../modules/ai/services/aiPlateAnalysis.service.js';
import { generateGeminiJsonWithImage } from '../../modules/ai/providers/index.js';

// ── Mock payload — must match aiPlateAnalysisResponseSchema exactly ───────────

const PLATE_RESPONSE = {
  responseText: 'He analizado tu plato y detectado los siguientes alimentos.',
  structuredData: {
    detectedFoods: [
      { name: 'Arroz blanco', estimatedQuantity: '200g', confidence: 'high' as const },
    ],
    estimatedNutrition: {
      caloriesRange: { min: 220, max: 280 },
      proteinRange: { min: 4, max: 6 },
      carbsRange: { min: 45, max: 55 },
      fatRange: { min: 0, max: 2 },
    },
    assumptions: ['El arroz está cocinado sin aceite adicional'],
    confidenceReason: 'El alimento es claramente identificable por forma y color',
    proportions: { protein: '10%', carbs: '75%', vegetables: '10%', fats: '5%' },
    recommendations: [],
    warnings: [],
    confidence: 'high' as const,
  },
  safety: { isOutOfScope: false, flags: [], escalationMessage: null },
};

const PROVIDER_RESPONSE = {
  text: JSON.stringify(PLATE_RESPONSE),
  parsed: PLATE_RESPONSE,
  raw: {},
  metadata: { provider: 'gemini' as const, model: 'gemini-2.5-flash', cached: false },
};

// ── Dummy image buffers ───────────────────────────────────────────────────────

const BUFFER_A = Buffer.from('fake-image-content-alpha');
const BUFFER_B = Buffer.from('fake-image-content-beta');

function makeInput(imageBuffer: Buffer, overrides: Record<string, unknown> = {}) {
  return {
    userId: 'test-user',
    imageBuffer,
    imageMetadata: {
      mimeType: 'image/jpeg',
      sizeBytes: imageBuffer.length,
      width: 100,
      height: 100,
    },
    objective: 'maintain' as const,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runAiPlateAnalysis', () => {
  beforeEach(() => {
    vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown).mockReset();
    vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown).mockResolvedValue(PROVIDER_RESPONSE);
  });

  it('throws validation_error when userId is missing', async () => {
    await expect(
      runAiPlateAnalysis({
        ...makeInput(BUFFER_A),
        userId: '',
      }),
    ).rejects.toMatchObject({ name: 'AiServiceError', code: 'validation_error' });
  });

  it('returns result with metadata.cached = false on first call (MISS)', async () => {
    const result = await runAiPlateAnalysis(makeInput(BUFFER_A));

    expect(result.metadata.cached).toBe(false);
    expect(result.responseText).toBe(PLATE_RESPONSE.responseText);
    expect(result.analysisId).toMatch(/^analysis_/);
    expect(vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown)).toHaveBeenCalledTimes(1);
  });

  it('returns metadata.cached = true on second call with same imageBuffer (HIT)', async () => {
    // First call — MISS, populates AiCacheEntry
    await runAiPlateAnalysis(makeInput(BUFFER_A));
    vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown).mockClear();

    // Second call — same buffer → same SHA-256 → HIT
    const hit = await runAiPlateAnalysis(makeInput(BUFFER_A));

    expect(hit.metadata.cached).toBe(true);
    expect(vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown)).not.toHaveBeenCalled();
  });

  it('generates a different analysisId on HIT (audit trail per request)', async () => {
    const miss = await runAiPlateAnalysis(makeInput(BUFFER_A));
    const hit = await runAiPlateAnalysis(makeInput(BUFFER_A));
    expect(miss.analysisId).not.toBe(hit.analysisId);
  });

  it('returns metadata.cached = false when imageBuffer differs (MISS)', async () => {
    // First call with BUFFER_A — populates cache for A
    await runAiPlateAnalysis(makeInput(BUFFER_A));
    vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown).mockClear();

    // Second call with BUFFER_B — different SHA-256, must be MISS
    const miss = await runAiPlateAnalysis(makeInput(BUFFER_B));

    expect(miss.metadata.cached).toBe(false);
    expect(vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown)).toHaveBeenCalledTimes(1);
  });

  it('returns metadata.cached = false when objective changes (same image, different context)', async () => {
    await runAiPlateAnalysis(makeInput(BUFFER_A, { objective: 'maintain' }));
    vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown).mockClear();

    // Different objective → different rendered userPrompt → different cache key
    const miss = await runAiPlateAnalysis(makeInput(BUFFER_A, { objective: 'gain_muscle' }));

    expect(miss.metadata.cached).toBe(false);
    expect(vi.mocked(generateGeminiJsonWithImage as (...args: unknown[]) => unknown)).toHaveBeenCalledTimes(1);
  });
});
