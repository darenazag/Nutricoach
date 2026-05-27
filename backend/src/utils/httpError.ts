/**
 * @file Error HTTP con código de estado asociado.
 * Se propaga hasta el middleware central de errores, que responde con
 * el status HTTP adecuado en formato JSON.
 */

/**
 * Error con un código de estado HTTP.
 */
export class HttpError extends Error {
  /** Código de estado HTTP (ej. 400, 401, 404, 409, 500). */
  public readonly status: number;

  /**
   * @param {number} status - Código de estado HTTP.
   * @param {string} message - Mensaje descriptivo del error.
   */
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    Object.setPrototypeOf(this, HttpError.prototype);
  }

  /**
   * Atajo para 400 Bad Request.
   *
   * @param {string} [message] - Mensaje descriptivo.
   * @returns {HttpError}
   */
  static badRequest(message = 'Petición inválida'): HttpError {
    return new HttpError(400, message);
  }

  /**
   * Atajo para 401 Unauthorized.
   *
   * @param {string} [message] - Mensaje descriptivo.
   * @returns {HttpError}
   */
  static unauthorized(message = 'No autorizado'): HttpError {
    return new HttpError(401, message);
  }

  /**
   * Atajo para 404 Not Found.
   *
   * @param {string} [message] - Mensaje descriptivo.
   * @returns {HttpError}
   */
  static notFound(message = 'Recurso no encontrado'): HttpError {
    return new HttpError(404, message);
  }

  /**
   * Atajo para 409 Conflict.
   *
   * @param {string} [message] - Mensaje descriptivo.
   * @returns {HttpError}
   */
  static conflict(message = 'Conflicto con el estado actual'): HttpError {
    return new HttpError(409, message);
  }
}
