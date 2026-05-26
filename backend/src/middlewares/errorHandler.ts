import type { ErrorRequestHandler, Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';
import { AiServiceError, type AiServiceErrorCode } from '../modules/ai/index.js';
import { AiProviderError } from '../modules/ai/index.js';

const STATUS_BY_AI_SERVICE_CODE: Record<AiServiceErrorCode, number> = {
  invalid_image: 400,
  validation_error: 400,
  not_found: 404,
  prompt_not_found: 500,
  provider_error: 502,
  persistence_error: 500,
};

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

  // P0 routes use HttpError — keep the { error: string } contract the frontend expects.
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  console.error('[error]', message);
  res.status(500).json({ error: 'Error interno del servidor' });
};

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: `Ruta no encontrada: ${_req.method} ${_req.path}` });
}
