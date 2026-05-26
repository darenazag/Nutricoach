import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Must be hoisted before any import that pulls the controller.
vi.mock('../../modules/ai/services/aiPlateAnalysis.service.js', () => ({
  runAiPlateAnalysis: vi.fn(),
}));

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 100, height: 100 }),
    resize: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: Buffer.from('processed'),
      info: { width: 100, height: 100 },
    }),
  })),
}));

import { runAiPlateAnalysis } from '../../modules/ai/services/aiPlateAnalysis.service.js';
import { handleAnalyze, handleAnalyzePreview } from '../../modules/ai/controllers/aiLegacyAnalyze.controller.js';

// ── Mock plate-analysis result ────────────────────────────────────────────────

const MOCK_RESULT = {
  responseText: 'He detectado los siguientes alimentos.',
  structuredData: {
    detectedFoods: [
      { name: 'Pechuga de pollo', estimatedQuantity: '150g', confidence: 'high' },
      { name: 'Arroz blanco',     estimatedQuantity: '100g', confidence: 'medium' },
    ],
    estimatedNutrition: {
      caloriesRange: { min: 350, max: 450 },
      proteinRange:  { min: 30,  max: 40  },
      carbsRange:    { min: 40,  max: 50  },
      fatRange:      { min: 8,   max: 12  },
    },
    assumptions: [],
    confidenceReason: 'Imagen clara',
    proportions: { protein: '40%', carbs: '40%', vegetables: '10%', fats: '10%' },
    recommendations: [],
    warnings: [],
    confidence: 'high',
  },
  safety: { isOutOfScope: false, flags: [], escalationMessage: null },
  metadata: { provider: 'gemini', model: 'gemini-2.5-flash', promptVersion: 'v1', cached: false },
  analysisId: 'analysis_test-legacy-123',
};

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeReqWithFile(): Request {
  return {
    file: {
      fieldname: 'image',
      originalname: 'food.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
      size: 1024,
    },
    body: {},
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json:   vi.fn().mockReturnThis(),
  } as unknown as Response;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/ai/analyze — legacy adapter (AIBubble)', () => {
  const handler = handleAnalyze[1] as NonNullable<typeof handleAnalyze[1]>;
  const next = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runAiPlateAnalysis).mockResolvedValue(MOCK_RESULT as never);
  });

  it('returns HTTP 200 — endpoint exists, does not 404', async () => {
    const res = makeRes();
    await handler(makeReqWithFile(), res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns { success: true }', async () => {
    const res = makeRes();
    await handler(makeReqWithFile(), res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it('delegates to runAiPlateAnalysis with userId "legacy_adapter"', async () => {
    const res = makeRes();
    await handler(makeReqWithFile(), res, next);
    expect(runAiPlateAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'legacy_adapter' }),
    );
  });

  it('calls next(AiServiceError invalid_image) when no image field provided', async () => {
    const req = { file: undefined, body: {} } as unknown as Request;
    const res = makeRes();
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_image' }),
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('POST /api/ai/analyze-preview — legacy adapter (RegistrarComida)', () => {
  const handler = handleAnalyzePreview[1] as NonNullable<typeof handleAnalyzePreview[1]>;
  const next = vi.fn() as unknown as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runAiPlateAnalysis).mockResolvedValue(MOCK_RESULT as never);
  });

  it('returns HTTP 200 — endpoint exists, does not 404', async () => {
    const res = makeRes();
    await handler(makeReqWithFile(), res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns { analysis: { name, calories, protein, fat, carbs, source } }', async () => {
    const res = makeRes();
    await handler(makeReqWithFile(), res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        analysis: expect.objectContaining({
          name:     expect.any(String),
          calories: expect.any(Number),
          protein:  expect.any(Number),
          fat:      expect.any(Number),
          carbs:    expect.any(Number),
          source:   expect.any(String),
        }),
      }),
    );
  });

  it('maps calorie midpoint correctly: (350+450)/2 = 400', async () => {
    const res = makeRes();
    await handler(makeReqWithFile(), res, next);
    const body = (vi.mocked(res.json).mock.calls[0] as [Record<string, unknown>])[0];
    expect((body['analysis'] as Record<string, unknown>)['calories']).toBe(400);
  });

  it('joins detected food names for the name field', async () => {
    const res = makeRes();
    await handler(makeReqWithFile(), res, next);
    const body = (vi.mocked(res.json).mock.calls[0] as [Record<string, unknown>])[0];
    expect((body['analysis'] as Record<string, unknown>)['name']).toBe(
      'Pechuga de pollo, Arroz blanco',
    );
  });

  it('calls next(AiServiceError invalid_image) when no image field provided', async () => {
    const req = { file: undefined, body: {} } as unknown as Request;
    const res = makeRes();
    await handler(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'invalid_image' }),
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});
