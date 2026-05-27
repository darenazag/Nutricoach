import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../middlewares/errorHandler.js';
import { AiServiceError } from '../../modules/ai/services/aiServiceError.js';
import { AiProviderError } from '../../modules/ai/providers/aiProvider.types.js';

function makeRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

describe('errorHandler — AiServiceError HTTP mapping', () => {
  it('maps not_found → 404', () => {
    const res = makeRes();
    errorHandler(new AiServiceError('Not found.', 'not_found'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: 'not_found' }) }),
    );
  });

  it('maps validation_error → 400', () => {
    const res = makeRes();
    errorHandler(new AiServiceError('Bad input.', 'validation_error'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('maps invalid_image → 400', () => {
    const res = makeRes();
    errorHandler(new AiServiceError('Bad image.', 'invalid_image'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('maps provider_error → 502', () => {
    const res = makeRes();
    errorHandler(new AiServiceError('Gemini failed.', 'provider_error'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('maps persistence_error → 500', () => {
    const res = makeRes();
    errorHandler(new AiServiceError('Mongo failed.', 'persistence_error'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('errorHandler — AiProviderError fallback', () => {
  it('maps AiProviderError → 502', () => {
    const res = makeRes();
    errorHandler(new AiProviderError('Gemini down.', 'provider_error'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(502);
  });
});

describe('errorHandler — unknown errors', () => {
  it('maps generic Error → 500', () => {
    const res = makeRes();
    errorHandler(new Error('Unexpected.'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Error interno del servidor' }),
    );
  });
});
