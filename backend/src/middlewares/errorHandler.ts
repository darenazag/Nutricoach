/**
 * @file Middleware central de manejo de errores.
 */

import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError.js';

/**
 * Middleware de manejo de errores. Responde en JSON con el status apropiado.
 *
 * @param {unknown} err - Error capturado.
 * @param {Request} _req - Peticion (no usada).
 * @param {Response} res - Respuesta.
 * @param {NextFunction} _next - Siguiente middleware (no usado, requerido por Express).
 * @returns {void}
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const message =
    err instanceof Error ? err.message : 'Error interno del servidor';
  console.error('[error]', message);
  res.status(500).json({ error: 'Error interno del servidor' });
}

/**
 * Middleware para rutas no encontradas (404).
 *
 * @param {Request} req - Peticion entrante.
 * @param {Response} res - Respuesta.
 * @returns {void}
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}
