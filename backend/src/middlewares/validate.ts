/**
 * @file Middleware de validacion con Zod. Valida body, params o query y
 * sustituye el contenido por la version parseada (con coerciones aplicadas).
 */

import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { HttpError } from '../utils/httpError.js';

/** Parte de la peticion a validar. */
type RequestPart = 'body' | 'params' | 'query';

/**
 * Construye un middleware que valida una parte de la peticion contra un
 * esquema Zod. Si falla, responde 400 con el detalle de los errores.
 *
 * @param {ZodSchema} schema - Esquema Zod a aplicar.
 * @param {RequestPart} [part='body'] - Parte de la peticion a validar.
 * @returns {(req: Request, res: Response, next: NextFunction) => void}
 */
export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(badRequestFromZod(result.error));
      return;
    }
    // Reemplaza con el valor parseado (con defaults y coerciones aplicados).
    // `query` y `params` son de solo lectura en algunas versiones, por eso
    // se asigna con un cast controlado.
    (req as unknown as Record<RequestPart, unknown>)[part] = result.data;
    next();
  };
}

/**
 * Convierte un ZodError en un HttpError 400 con un mensaje legible.
 *
 * @param {ZodError} error - Error de validacion de Zod.
 * @returns {HttpError} Error 400 con los detalles concatenados.
 */
function badRequestFromZod(error: ZodError): HttpError {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.join('.') || '(raiz)';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
  return HttpError.badRequest(`Validacion fallida -> ${details}`);
}
