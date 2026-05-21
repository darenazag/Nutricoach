import { z } from 'zod';
import { AiServiceError } from './aiServiceError.js';

/**
 * Validates `data` against the given Zod schema and returns the parsed value.
 *
 * On failure, throws `AiServiceError('validation_error')` with the zod issues
 * attached as `details`, preserving the original ZodError as `cause`.
 */
export function validateAiResponse<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AiServiceError(
      'AI response failed Zod validation.',
      'validation_error',
      { cause: result.error, details: result.error.issues },
    );
  }
  return result.data;
}
