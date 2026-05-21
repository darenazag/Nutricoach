import { GoogleGenAI } from '@google/genai';
import { AiProviderError } from './aiProvider.types.js';
import type { AiProviderRequest, AiProviderJsonResponse } from './aiProvider.types.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * Creates a configured GoogleGenAI instance.
 * Throws AiProviderError('missing_api_key') if GEMINI_API_KEY is not set.
 * Call lazily — do NOT call at module load or app startup.
 */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new AiProviderError(
      'GEMINI_API_KEY is not set. Add it to your .env file.',
      'missing_api_key',
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Sends a structured prompt to Gemini and returns the parsed JSON response.
 *
 * Behavior:
 * - Uses responseMimeType 'application/json' to enforce strict JSON output.
 * - Throws AiProviderError('missing_api_key')  if the API key is absent.
 * - Throws AiProviderError('invalid_response')  if Gemini returns empty text.
 * - Throws AiProviderError('provider_error')    if the Gemini API call fails.
 * - Throws AiProviderError('json_parse_error')  if the response is not valid JSON.
 *
 * Zod validation and Mongo persistence are the responsibility of the service layer.
 */
export async function generateGeminiJson<T = unknown>(
  request: AiProviderRequest,
): Promise<AiProviderJsonResponse<T>> {
  const model = request.model ?? process.env['GEMINI_MODEL'] ?? DEFAULT_MODEL;

  const client = createGeminiClient();

  let rawText: string;
  let rawResponse: unknown;

  try {
    const response = await client.models.generateContent({
      model,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        responseMimeType: 'application/json',
        ...(request.temperature !== undefined && { temperature: request.temperature }),
        ...(request.maxOutputTokens !== undefined && {
          maxOutputTokens: request.maxOutputTokens,
        }),
      },
    });

    rawResponse = response;
    rawText = response.text ?? '';

    if (!rawText.trim()) {
      throw new AiProviderError(
        'Gemini returned an empty response. Check the model and prompt.',
        'invalid_response',
        response,
      );
    }
  } catch (err) {
    if (err instanceof AiProviderError) throw err;
    throw new AiProviderError(
      `Gemini API call failed: ${err instanceof Error ? err.message : String(err)}`,
      'provider_error',
      err,
    );
  }

  let parsed: T;
  try {
    parsed = JSON.parse(rawText) as T;
  } catch (err) {
    throw new AiProviderError(
      `Gemini response is not valid JSON. First 300 chars: ${rawText.slice(0, 300)}`,
      'json_parse_error',
      err,
    );
  }

  return {
    text: rawText,
    parsed,
    raw: rawResponse,
    metadata: {
      provider: 'gemini',
      model,
      cached: false,
    },
  };
}
