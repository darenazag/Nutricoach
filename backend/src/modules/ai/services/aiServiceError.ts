export type AiServiceErrorCode =
  | 'prompt_not_found'
  | 'validation_error'
  | 'provider_error'
  | 'persistence_error'
  | 'invalid_image';

/**
 * Thrown by the AI service layer.
 * Controllers/routes (when added) should map each code to an HTTP status.
 */
export class AiServiceError extends Error {
  readonly code: AiServiceErrorCode;
  readonly details?: unknown;

  constructor(
    message: string,
    code: AiServiceErrorCode,
    options?: { cause?: unknown; details?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AiServiceError';
    this.code = code;
    this.details = options?.details;
  }
}
