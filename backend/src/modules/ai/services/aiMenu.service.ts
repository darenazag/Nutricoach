import { aiMenuRequestSchema, aiMenuResponseSchema } from '../schemas/index.js';
import type { AiSafetyOutput } from '../schemas/index.js';
import {
  AI_MENU_PROMPT_KEY,
  buildRenderedPrompt,
  type RenderPromptVariables,
} from '../prompts/index.js';
import {
  AiProviderError,
  generateGeminiJson,
} from '../providers/index.js';
import {
  addMessage,
  createConversation,
} from '../repositories/aiConversation.repository.js';
import { AiServiceError } from './aiServiceError.js';
import { getDefaultPromptTemplate } from './aiPrompt.service.js';
import { validateAiResponse } from './aiValidation.service.js';
import { generateConversationId, generateMessageId } from './aiId.service.js';
import type {
  AiMenuRequest,
  AiMenuResponse,
  AiServiceResult,
} from './aiResponse.types.js';

export interface AiMenuServiceResult
  extends AiServiceResult<AiMenuResponse['structuredData']> {
  safety: AiMenuResponse['safety'];
  conversationId: string;
}

/**
 * Flattens the menu request into the variable map expected by the user prompt
 * template. Missing optional values become empty strings so the renderer never
 * leaves raw {{placeholders}} in the rendered prompt.
 */
function buildMenuPromptVariables(req: AiMenuRequest): RenderPromptVariables {
  return {
    objective: req.objective,
    caloriesTarget: req.caloriesTarget,
    proteinTarget: req.proteinTarget ?? '',
    carbsTarget: req.carbsTarget ?? '',
    fatTarget: req.fatTarget ?? '',
    days: req.days ?? '',
    mealsPerDay: req.mealsPerDay ?? '',
    notes: req.notes ?? '',
    plan: req.plan ?? '',
  };
}

/**
 * Maps the Zod-validated AI safety output (isOutOfScope / flags / escalationMessage)
 * into the persistence shape used by AiMessage.safety ({ blocked, reason }).
 * The full safety object is still exposed in the service result for the caller.
 */
function mapSafetyForPersistence(
  safety: AiSafetyOutput,
): { blocked: boolean; reason: string } {
  const blocked = safety.isOutOfScope ?? false;
  const escalation = safety.escalationMessage ?? '';
  const flagsJoined = (safety.flags ?? []).join(', ');
  return {
    blocked,
    reason: escalation || flagsJoined,
  };
}

/**
 * Wraps a repository call so any Mongoose / driver failure becomes
 * AiServiceError('persistence_error') without leaking implementation details.
 */
async function persist<T>(
  action: string,
  fn: () => Promise<T>,
  details?: Record<string, unknown>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    throw new AiServiceError(
      `Persistence failed during "${action}": ${
        err instanceof Error ? err.message : String(err)
      }`,
      'persistence_error',
      { cause: err, details: { action, ...details } },
    );
  }
}

/**
 * Serializes the menu request for storage as the "user" message content.
 * `userId` is dropped because it is already a top-level field on AiMessage.
 */
function serializeMenuRequestForPersistence(req: AiMenuRequest): string {
  const { userId, ...rest } = req;
  void userId;
  return JSON.stringify(rest, null, 2);
}

/**
 * Orchestrates a single AI menu generation turn with minimal Mongo persistence:
 *   1. Validate the request with `aiMenuRequestSchema`.
 *   2. Create a brand-new conversation with type 'menu_generation'.
 *   3. Persist the serialized request as the user message.
 *   4. Load the active prompt template, render, call Gemini.
 *   5. Validate the parsed JSON with `aiMenuResponseSchema`.
 *   6. Persist the assistant message (with provider, model, promptVersion, safety).
 *   7. Return the typed service result including `conversationId`.
 *
 * Errors are normalized to `AiServiceError` with one of:
 *   - 'validation_error'  (request or AI response failed Zod)
 *   - 'prompt_not_found'  (no template registered)
 *   - 'provider_error'    (Gemini SDK failure, wrapped from AiProviderError)
 *   - 'persistence_error' (any Mongo write/read failure)
 *
 * Unlike chat, each call creates its own conversation: menu generation is
 * one-shot. A user that regenerates a menu produces a new conversation,
 * which is the simplest contract and matches today's UX.
 */
export async function runAiMenu(input: unknown): Promise<AiMenuServiceResult> {
  const requestResult = aiMenuRequestSchema.safeParse(input);
  if (!requestResult.success) {
    throw new AiServiceError(
      'AI menu request failed Zod validation.',
      'validation_error',
      { cause: requestResult.error, details: requestResult.error.issues },
    );
  }
  const request = requestResult.data;

  const conversationId = generateConversationId();

  await persist(
    'createConversation (menu)',
    () =>
      createConversation({
        conversationId,
        userId: request.userId,
        type: 'menu_generation',
        provider: 'gemini',
      }),
    { conversationId, userId: request.userId },
  );

  await persist(
    'addMessage (user, menu)',
    () =>
      addMessage({
        messageId: generateMessageId(),
        conversationId,
        userId: request.userId,
        role: 'user',
        content: serializeMenuRequestForPersistence(request),
        provider: 'gemini',
      }),
    { conversationId, userId: request.userId, role: 'user' },
  );

  const template = getDefaultPromptTemplate(AI_MENU_PROMPT_KEY);

  const { systemPrompt, userPrompt } = buildRenderedPrompt({
    systemPrompt: template.systemPrompt,
    userPromptTemplate: template.userPromptTemplate,
    variables: buildMenuPromptVariables(request),
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

  const aiResponse = validateAiResponse(aiMenuResponseSchema, providerResponse.parsed);

  await persist(
    'addMessage (assistant, menu)',
    () =>
      addMessage({
        messageId: generateMessageId(),
        conversationId,
        userId: request.userId,
        role: 'assistant',
        content: aiResponse.responseText,
        structuredData: aiResponse.structuredData,
        provider: providerResponse.metadata.provider,
        model: providerResponse.metadata.model,
        promptVersion: template.version,
        safety: mapSafetyForPersistence(aiResponse.safety),
      }),
    { conversationId, userId: request.userId, role: 'assistant' },
  );

  return {
    responseText: aiResponse.responseText,
    structuredData: aiResponse.structuredData,
    safety: aiResponse.safety,
    conversationId,
    metadata: {
      provider: providerResponse.metadata.provider,
      model: providerResponse.metadata.model,
      promptVersion: template.version,
      cached: providerResponse.metadata.cached,
    },
  };
}
