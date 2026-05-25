/**
 * @file Middleware de autenticacion. Verifica el JWT del header Authorization
 * y adjunta el payload a `req.auth`.
 */

import { NextFunction, Request, Response } from 'express';
import { JwtPayload, verifyToken } from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Payload del usuario autenticado, presente tras `authenticate`. */
      auth?: JwtPayload;
    }
  }
}

/**
 * Middleware que exige un JWT valido en `Authorization: Bearer <token>`.
 * Si es valido, adjunta el payload a `req.auth`; si no, responde 401.
 *
 * @param {Request} req - Peticion entrante.
 * @param {Response} _res - Respuesta (no usada).
 * @param {NextFunction} next - Siguiente middleware.
 * @returns {void}
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new HttpError(401, 'Falta el token de autenticacion'));
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Token invalido o expirado'));
  }
}
