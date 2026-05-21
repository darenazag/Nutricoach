import { aiChatRequestSchema, aiChatResponseSchema } from '../schemas/index.js';
import {
  AI_CHAT_PROMPT_KEY,
  buildRenderedPrompt,
  type RenderPromptVariables,
} from '../prompts/index.js';
import {
  AiProviderError,
  generateGeminiJson,
} from '../providers/index.js';
import { AiServiceError } from './aiServiceError.js';
import { getDefaultPromptTemplate } from './aiPrompt.service.js';
import { validateAiResponse } from './aiValidation.service.js';
import type {
  AiChatRequest,
  AiChatResponse,
  AiServiceResult,
} from './aiResponse.types.js';

export interface AiChatServiceResult
  extends AiServiceResult<AiChatResponse['structuredData']> {
  safety: AiChatResponse['safety'];
}

/**
 * Flattens the chat request into the variable map expected by the user prompt
 * template. Missing optional values are passed through as empty strings so the
 * renderer does not leave raw {{placeholders}} in the prompt.
 */
function buildChatPromptVariables(req: AiChatRequest): RenderPromptVariables {
  const ctx = req.userContext ?? {};
  return {
    message: req.message,
    objective: ctx.objective ?? '',
    caloriesTarget: ctx.caloriesTarget ?? '',
    proteinTarget: ctx.proteinTarget ?? '',
    carbsTarget: ctx.carbsTarget ?? '',
    fatTarget: ctx.fatTarget ?? '',
    plan: req.plan ?? '',
  };
}

/**
 * Orchestrates a single AI chat turn:
 *   1. Validate the request with `aiChatRequestSchema`.
 *   2. Load the active prompt template for `ai_chat_coach`.
 *   3. Render the user prompt with the request variables.
 *   4. Call Gemini via `generateGeminiJson`.
 *   5. Validate the parsed JSON with `aiChatResponseSchema`.
 *   6. Return a typed service result with safety + metadata.
 *
 * Errors are normalized to `AiServiceError` with one of:
 *   - 'validation_error'  (request shape or AI response shape failed Zod)
 *   - 'prompt_not_found'  (no template registered for the key)
 *   - 'provider_error'    (Gemini SDK failure, wrapped from AiProviderError)
 *
 * Persistence in `AiMessage` / `AiConversation` and caching in
 * `AiCacheEntry` are intentionally NOT done here — they belong to a later
 * feature so this layer stays small and easy to test.
 */
export async function runAiChat(input: unknown): Promise<AiChatServiceResult> {
  const requestResult = aiChatRequestSchema.safeParse(input);
  if (!requestResult.success) {
    throw new AiServiceError(
      'AI chat request failed Zod validation.',
      'validation_error',
      { cause: requestResult.error, details: requestResult.error.issues },
    );
  }
  const request = requestResult.data;

  const template = getDefaultPromptTemplate(AI_CHAT_PROMPT_KEY);

  const { systemPrompt, userPrompt } = buildRenderedPrompt({
    systemPrompt: template.systemPrompt,
    userPromptTemplate: template.userPromptTemplate,
    variables: buildChatPromptVariables(request),
  });

  let providerResponse;
  try {
    providerResponse = await generateGeminiJson<unknown>({
      systemPrompt,
      userPrompt,
    });
  } catch (err) {
    if (err instanceof AiProviderError) {
      throw new AiServiceError(
        `Gemini provider failed: ${err.message}`,
        'provider_error',
        { cause: err, details: { providerCode: err.code } },
      );
    }
    throw err;
  }

  const aiResponse = validateAiResponse(aiChatResponseSchema, providerResponse.parsed);

  return {
    responseText: aiResponse.responseText,
    structuredData: aiResponse.structuredData,
    safety: aiResponse.safety,
    metadata: {
      provider: providerResponse.metadata.provider,
      model: providerResponse.metadata.model,
      promptVersion: template.version,
      cached: providerResponse.metadata.cached,
    },
  };
}
