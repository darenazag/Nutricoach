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
 * Always routes image requests to Gemini — DeepSeek does not support images.
 */
export async function generateImageJson<T = unknown>(
  request: AiProviderImageRequest,
): Promise<AiProviderJsonResponse<T>> {
  return generateGeminiJsonWithImage<T>(request);
}
