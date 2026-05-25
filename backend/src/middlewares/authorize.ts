/**
 * @file Middlewares de autorizacion por rol. Deben usarse SIEMPRE despues de
 * `authenticate`, que es quien puebla `req.auth`.
 */

import { NextFunction, Request, Response } from 'express';
import { Role } from '../types/domain.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Construye un middleware que exige uno de los roles indicados.
 *
 * @param {...Role} roles - Roles permitidos.
 * @returns {(req: Request, res: Response, next: NextFunction) => void}
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new HttpError(401, 'No autenticado'));
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(new HttpError(403, 'Permisos insuficientes'));
      return;
    }
    next();
  };
}

/** Middleware que exige rol admin. */
export const requireAdmin = requireRole('admin');

/**
 * Middleware que permite la accion si el usuario actua sobre su propio recurso
 * (el `:id` de la ruta coincide con su `sub`) o si es admin.
 * Implementa la regla: solo el admin puede modificar perfiles ajenos.
 *
 * @param {string} [paramName='id'] - Nombre del parametro de ruta con el id.
 * @returns {(req: Request, res: Response, next: NextFunction) => void}
 */
export function requireSelfOrAdmin(paramName = 'id') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new HttpError(401, 'No autenticado'));
      return;
    }
    const targetId = Number(req.params[paramName]);
    const isSelf = !Number.isNaN(targetId) && targetId === req.auth.sub;
    if (isSelf || req.auth.role === 'admin') {
      next();
      return;
    }
    next(new HttpError(403, 'Solo puedes modificar tu propio perfil'));
  };
}
