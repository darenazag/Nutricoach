import type { ErrorRequestHandler } from 'express';
import { AiServiceError, type AiServiceErrorCode } from '../modules/ai/index.js';
import { AiProviderError } from '../modules/ai/index.js';

/**
 * Maps known AI service error codes to HTTP status codes.
 * Anything else (or anything not from the AI layer) falls back to 500.
 */
const STATUS_BY_AI_SERVICE_CODE: Record<AiServiceErrorCode, number> = {
  validation_error: 400,
  prompt_not_found: 500,
  provider_error: 502,
  persistence_error: 500,
};

/**
 * Global Express error middleware. Must be registered last in app.ts.
 *
 * Response shape (always):
 * {
 *   success: false,
 *   error: { code: string, message: string, details?: unknown, stack?: string }
 * }
 *
 * `details` and `stack` are only included when NODE_ENV !== 'production'.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (err instanceof AiServiceError) {
    const status = STATUS_BY_AI_SERVICE_CODE[err.code] ?? 500;
    res.status(status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(isProd ? {} : { details: err.details, stack: err.stack }),
      },
    });
    return;
  }

  // AiProviderError should normally be caught and re-thrown as AiServiceError
  // by the service layer. We map it defensively in case it ever escapes.
  if (err instanceof AiProviderError) {
    res.status(502).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(isProd ? {} : { stack: err.stack }),
      },
    });
    return;
  }

  console.error('[errorHandler] Unhandled error:', err);
  const message = err instanceof Error ? err.message : 'Unexpected error';
  const stack = err instanceof Error ? err.stack : undefined;
  res.status(500).json({
    success: false,
    error: {
      code: 'internal_error',
      message,
      ...(isProd ? {} : { stack }),
    },
  });
};
