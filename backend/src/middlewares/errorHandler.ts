/**
 * @file Middleware central de manejo de errores.
 * Captura todos los errores propagados con `next(err)` y responde en JSON
 * con el código HTTP adecuado. Gestiona errores de PostgreSQL (23505, etc.)
 * y errores genéricos, diferenciando el logging según entorno.
 */

import { NextFunction, Request, Response } from 'express';
import { DatabaseError } from 'pg';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Middleware de manejo de errores. Debe registrarse al final de la cadena
 * de middlewares de Express (cuatro parámetros obligatorios).
 *
 * @param {unknown} err - Error capturado.
 * @param {Request} req  - Petición.
 * @param {Response} res - Respuesta.
 * @param {NextFunction} _next - Siguiente (requerido por la firma de Express).
 * @returns {void}
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Errores HTTP de dominio (HttpError)
  if (err instanceof HttpError) {
    if (err.status >= 500 || env.nodeEnv !== 'production') {
      console.error(`[error] ${req.method} ${req.path} → HTTP ${err.status}: ${err.message}`);
    }
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Violación de unicidad en PostgreSQL (UNIQUE constraint)
  if (err instanceof DatabaseError && err.code === '23505') {
    console.warn(`[error] ${req.method} ${req.path} → Conflicto unicidad: ${err.detail ?? err.message}`);
    res.status(409).json({ error: 'El recurso ya existe (conflicto de datos únicos).' });
    return;
  }

  // Error de FK en PostgreSQL (integridad referencial)
  if (err instanceof DatabaseError && err.code === '23503') {
    console.warn(`[error] ${req.method} ${req.path} → FK violation: ${err.detail ?? err.message}`);
    res.status(422).json({ error: 'Referencia inválida: uno de los IDs proporcionados no existe.' });
    return;
  }

  // Error genérico / inesperado
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[error] ${req.method} ${req.path} → Excepción no controlada: ${message}`);
  if (err instanceof Error && err.stack && env.nodeEnv !== 'production') {
    console.error(err.stack);
  }
  res.status(500).json({ error: 'Error interno del servidor' });
}

/**
 * Middleware para rutas no encontradas (404).
 * Se registra justo antes del errorHandler.
 *
 * @param {Request} req - Petición entrante.
 * @param {Response} res - Respuesta.
 * @returns {void}
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}
