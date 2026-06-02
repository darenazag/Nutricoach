/**
 * @file Error HTTP con codigo de estado asociado.
 */

/**
 * Error con un codigo de estado HTTP, para propagarlo hasta el middleware
 * de manejo de errores y responder con el status adecuado.
 */
export class HttpError extends Error {
  /** Codigo de estado HTTP (ej. 404, 400). */
  public readonly status: number;

  /**
   * @param {number} status - Codigo de estado HTTP.
   * @param {string} message - Mensaje descriptivo.
   */
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  /** Atajo para 404 Not Found. */
  static notFound(message = 'Recurso no encontrado'): HttpError {
    return new HttpError(404, message);
  }

  /** Atajo para 400 Bad Request. */
  static badRequest(message = 'Peticion invalida'): HttpError {
    return new HttpError(400, message);
  }

  /** Atajo para 409 Conflict. */
  static conflict(message = 'Conflicto con el estado actual'): HttpError {
    return new HttpError(409, message);
  }
}
