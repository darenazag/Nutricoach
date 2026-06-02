/**
 * @file Envoltorio para controladores asincronos.
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
 * se reenvie automaticamente a `next()` y lo capture el middleware de errores.
 *
 * @param {AsyncController} fn - Controlador async.
 * @returns {(req: Request, res: Response, next: NextFunction) => void}
 */
export function asyncHandler(fn: AsyncController) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
