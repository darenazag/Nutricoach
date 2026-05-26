import {
  AiProviderError,
  generateGeminiJson,
  generateGeminiJsonWithImage,
  generateDeepSeekJson,
} from '../providers/index.js';
import type {
  AiProviderRequest,
  AiProviderImageRequest,
  AiProviderJsonResponse,
} from '../providers/index.js';
import { AiServiceError } from './aiServiceError.js';

function isDeepSeekEnabled(): boolean {
  return (
    process.env['AI_ENABLE_DEEPSEEK'] === 'true' &&
    (process.env['AI_TEXT_PROVIDER'] ?? 'gemini') === 'deepseek'
  );
}

/**
 * Routes a text-only AI request to the configured provider:
 *   - DeepSeek when AI_ENABLE_DEEPSEEK=true and AI_TEXT_PROVIDER=deepseek
 *     (falls back to Gemini on any AiProviderError from DeepSeek)
 *   - Gemini in all other configurations (default)
 *
 * Non-AiProviderError exceptions (programming bugs) propagate unchanged.
 */
export async function generateTextJson<T = unknown>(
  request: AiProviderRequest,
): Promise<AiProviderJsonResponse<T>> {
  if (isDeepSeekEnabled()) {
    try {
      return await generateDeepSeekJson<T>(request);
    } catch (err) {
      if (err instanceof AiProviderError) {
        console.warn(`[aiProviderRouter] DeepSeek failed (${err.code}), falling back to Gemini.`);
      } else {
        throw err;
      }
    }
  }
  return generateGeminiJson<T>(request);
}

/**
 * Like generateTextJson, but also validates the parsed response with a caller-supplied
 * validator function. If the provider was DeepSeek and validation throws
 * AiServiceError('validation_error'), the call is transparently retried with Gemini.
 *
 * This catches the class of bug where DeepSeek returns structurally valid JSON but
 * with wrong key names (e.g. "follUpQuestions" instead of "followUpQuestions").
 *
 * Error contract:
 *   - AiProviderError             — network/HTTP failure from either provider (propagates to service catch)
 *   - AiServiceError('validation_error') — both DeepSeek AND Gemini failed validation,
 *                                          or Gemini was the primary and failed validation
 *   - Any other error from validate — bug in the validator; propagates unchanged
 */
export async function generateTextJsonWithFallback<T = unknown>(
  request: AiProviderRequest,
  validate: (parsed: unknown) => T,
): Promise<{ text: string; parsed: T; raw: unknown; metadata: AiProviderJsonResponse<unknown>['metadata'] }> {
  const providerResponse = await generateTextJson<unknown>(request);

  try {
    const parsed = validate(providerResponse.parsed);
    return { text: providerResponse.text, parsed, raw: providerResponse.raw, metadata: providerResponse.metadata };
  } catch (err) {
    if (
      err instanceof AiServiceError &&
      err.code === 'validation_error' &&
      providerResponse.metadata.provider === 'deepseek'
    ) {
      console.warn(
        `[aiProviderRouter] DeepSeek response failed schema validation, falling back to Gemini. Reason: ${err.message}`,
      );
      const geminiResponse = await generateGeminiJson<unknown>(request);
      const parsed = validate(geminiResponse.parsed);
      return { text: geminiResponse.text, parsed, raw: geminiResponse.raw, metadata: geminiResponse.metadata };
    }
    throw err;
  }
}

/**
 * Always routes image requests to Gemini — DeepSeek does not support images.
 */
export async function generateImageJson<T = unknown>(
  request: AiProviderImageRequest,
): Promise<AiProviderJsonResponse<T>> {
  return generateGeminiJsonWithImage<T>(request);
}
