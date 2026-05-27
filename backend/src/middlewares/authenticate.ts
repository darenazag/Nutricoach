/**
 * @file Middleware de autenticación.
 * Verifica el JWT del header `Authorization: Bearer <token>` y adjunta
 * el payload decodificado a `req.auth`.
 */

import { NextFunction, Request, Response } from 'express';
import { JwtPayload, verifyToken } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Payload del usuario autenticado.
       * Presente únicamente tras pasar el middleware `authenticate`.
       */
      auth?: JwtPayload;
    }
  }
}

/**
 * Middleware que exige un JWT válido en `Authorization: Bearer <token>`.
 * Si es válido, adjunta el payload a `req.auth` y llama a `next()`.
 * Si no, pasa un HttpError 401 a `next(err)`.
 *
 * @param {Request} req - Petición entrante.
 * @param {Response} _res - Respuesta (no usada).
 * @param {NextFunction} next - Siguiente middleware o manejador de errores.
 * @returns {void}
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(401, 'Falta el token de autenticación'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Token inválido o expirado'));
  }
}
