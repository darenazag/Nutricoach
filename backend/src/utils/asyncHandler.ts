/**
 * @file Envoltorio para controladores asíncronos de Express.
 * Captura cualquier error lanzado en el controlador y lo reenvía a next(),
 * donde lo recoge el middleware central de errores.
 */

import { NextFunction, Request, Response } from 'express';

/** Firma de un controlador async de Express. */
type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Envuelve un controlador async para que cualquier rechazo de promesa
 * se reenvíe automáticamente a `next()`.
 *
 * @param {AsyncController} fn - Controlador asíncrono.
 * @returns {(req: Request, res: Response, next: NextFunction) => void}
 */
export function asyncHandler(fn: AsyncController) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
