import { AiProviderError } from './aiProvider.types.js';
import type { AiProviderRequest, AiProviderJsonResponse } from './aiProvider.types.js';

const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;

function parseNumberEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Minimal shape of a DeepSeek (OpenAI-compatible) chat completion response.
interface DeepSeekChoice {
  message: { role: string; content: string };
  finish_reason: string;
}

interface DeepSeekApiResponse {
  choices: DeepSeekChoice[];
}

/**
 * Sends a structured prompt to DeepSeek and returns the parsed JSON response.
 * Uses the OpenAI-compatible Chat Completions endpoint (POST /chat/completions).
 *
 * Error contract mirrors geminiClient.ts:
 *   - AiProviderError('missing_api_key')  — DEEPSEEK_API_KEY absent.
 *   - AiProviderError('provider_error')   — network failure or non-2xx HTTP.
 *   - AiProviderError('invalid_response') — empty choices[0].message.content.
 *   - AiProviderError('json_parse_error') — content is not valid JSON.
 *
 * NOT wired into any service by default. A future provider-router selects it.
 * Image input is NOT supported — route image requests to Gemini instead.
 */
export async function generateDeepSeekJson<T = unknown>(
  request: AiProviderRequest,
): Promise<AiProviderJsonResponse<T>> {
  const apiKey = process.env['DEEPSEEK_API_KEY'];
  if (!apiKey) {
    throw new AiProviderError(
      'DEEPSEEK_API_KEY is not set. Add it to your .env file.',
      'missing_api_key',
    );
  }

  const model = request.model ?? process.env['DEEPSEEK_MODEL'] ?? DEFAULT_MODEL;
  const baseUrl = (process.env['DEEPSEEK_BASE_URL'] ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const temperature =
    request.temperature ??
    parseNumberEnv(process.env['DEEPSEEK_TEMPERATURE'], DEFAULT_TEMPERATURE);
  const maxTokens = Math.trunc(
    request.maxOutputTokens ??
      parseNumberEnv(process.env['DEEPSEEK_MAX_OUTPUT_TOKENS'], DEFAULT_MAX_OUTPUT_TOKENS),
  );

  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user',   content: request.userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature,
    max_tokens: maxTokens,
  });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body,
    });
  } catch (err) {
    throw new AiProviderError(
      `DeepSeek API call failed: ${err instanceof Error ? err.message : String(err)}`,
      'provider_error',
      err,
    );
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }
    throw new AiProviderError(
      `DeepSeek API returned HTTP ${String(response.status)}: ${response.statusText}`,
      'provider_error',
      errorBody,
    );
  }

  let apiResponse: DeepSeekApiResponse;
  try {
    apiResponse = (await response.json()) as DeepSeekApiResponse;
  } catch (err) {
    throw new AiProviderError(
      'DeepSeek API returned a non-JSON body.',
      'provider_error',
      err,
    );
  }

  const rawContent = apiResponse.choices?.[0]?.message?.content ?? '';
  if (!rawContent.trim()) {
    throw new AiProviderError(
      'DeepSeek returned an empty response. Check the model and prompt.',
      'invalid_response',
      apiResponse,
    );
  }

  let parsed: T;
  try {
    parsed = JSON.parse(rawContent) as T;
  } catch (err) {
    throw new AiProviderError(
      `DeepSeek response is not valid JSON. First 300 chars: ${rawContent.slice(0, 300)}`,
      'json_parse_error',
      err,
    );
  }

  return {
    text: rawContent,
    parsed,
    raw: apiResponse,
    metadata: {
      provider: 'deepseek',
      model,
      cached: false,
    },
  };
}
