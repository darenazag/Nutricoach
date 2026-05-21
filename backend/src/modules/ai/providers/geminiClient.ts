import type { GoogleGenAI } from '@google/genai' with { 'resolution-mode': 'import' };
import { AiProviderError } from './aiProvider.types.js';
import type { AiProviderRequest, AiProviderJsonResponse } from './aiProvider.types.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

function parseNumberEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// @google/genai is ESM-only; the backend currently compiles to CJS
// (no "type": "module" in package.json). A static import would fail TS1479
// under module: Node16. Dynamic import works at runtime because Node lets
// CJS load ESM via `import()`.
export async function createGeminiClient(): Promise<GoogleGenAI> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    throw new AiProviderError(
      'GEMINI_API_KEY is not set. Add it to your .env file.',
      'missing_api_key',
    );
  }
  const { GoogleGenAI } = await import('@google/genai');
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
  const temperature =
    request.temperature ??
    parseNumberEnv(process.env['GEMINI_TEMPERATURE'], DEFAULT_TEMPERATURE);
  const maxOutputTokens = Math.trunc(
    request.maxOutputTokens ??
      parseNumberEnv(process.env['GEMINI_MAX_OUTPUT_TOKENS'], DEFAULT_MAX_OUTPUT_TOKENS),
  );

  const client = await createGeminiClient();

  let rawText: string;
  let rawResponse: unknown;

  try {
    const response = await client.models.generateContent({
      model,
      contents: request.userPrompt,
      config: {
        systemInstruction: request.systemPrompt,
        responseMimeType: 'application/json',
        temperature,
        maxOutputTokens,
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
