import { aiChatRequestSchema, aiChatResponseSchema } from '../schemas/index.js';
import type { AiSafetyOutput } from '../schemas/index.js';
import {
  AI_CHAT_PROMPT_KEY,
  buildRenderedPrompt,
  type RenderPromptVariables,
} from '../prompts/index.js';
import { AiProviderError } from '../providers/index.js';
import { generateTextJson } from './aiProviderRouter.service.js';
import {
  addMessage,
  createConversation,
  findConversationById,
} from '../repositories/aiConversation.repository.js';
import { AiServiceError, type AiServiceErrorCode } from './aiServiceError.js';
import { getDefaultPromptTemplate } from './aiPrompt.service.js';
import { validateAiResponse } from './aiValidation.service.js';
import { generateConversationId, generateMessageId } from './aiId.service.js';
import type {
  AiChatRequest,
  AiChatResponse,
  AiServiceResult,
} from './aiResponse.types.js';

export interface AiChatServiceResult
  extends AiServiceResult<AiChatResponse['structuredData']> {
  safety: AiChatResponse['safety'];
  conversationId: string;
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
 * Resolves the conversation for this turn:
 *   - if request.conversationId is provided and the doc exists → reuse it
 *   - if request.conversationId is provided but no doc exists → create with that id
 *   - if no conversationId is provided → generate one and create the doc
 *
 * Either way returns the conversationId to use for the subsequent messages.
 */
async function resolveConversationId(request: AiChatRequest): Promise<string> {
  if (request.conversationId) {
    const existing = await persist(
      'findConversationById',
      () => findConversationById(request.conversationId as string),
      { conversationId: request.conversationId },
    );
    if (existing) return request.conversationId;

    await persist(
      'createConversation (with provided id)',
      () =>
        createConversation({
          conversationId: request.conversationId,
          userId: request.userId,
          type: 'chat',
          provider: 'gemini',
        }),
      { conversationId: request.conversationId, userId: request.userId },
    );
    return request.conversationId;
  }

  const newId = generateConversationId();
  await persist(
    'createConversation (new id)',
    () =>
      createConversation({
        conversationId: newId,
        userId: request.userId,
        type: 'chat',
        provider: 'gemini',
      }),
    { conversationId: newId, userId: request.userId },
  );
  return newId;
}

/**
 * Orchestrates a single AI chat turn with minimal Mongo persistence:
 *   1. Validate the request with `aiChatRequestSchema`.
 *   2. Resolve (or create) the conversation by `conversationId`.
 *   3. Persist the user message.
 *   4. Load the active prompt template, render, call Gemini.
 *   5. Validate the parsed JSON with `aiChatResponseSchema`.
 *   6. Persist the assistant message (with provider, model, promptVersion, safety).
 *   7. Return the typed service result including `conversationId`.
 *
 * Errors are normalized to `AiServiceError` with one of:
 *   - 'validation_error'  (request or AI response failed Zod)
 *   - 'prompt_not_found'  (no template registered)
 *   - 'provider_error'    (Gemini SDK failure, wrapped from AiProviderError)
 *   - 'persistence_error' (any Mongo write/read failure)
 *
 * Side-effect note: if Gemini fails AFTER the user message has been written,
 * the conversation + user message remain stored. This is intentional — it
 * mirrors how a real chat behaves and lets the client retry the same turn.
 *
 * Caching (AiCacheEntry) and real token usage are intentionally NOT done here.
 * The AiMessage.tokenUsage / costEstimate fields default to zero until Gemini
 * exposes them and we plumb them through the provider.
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

  const conversationId = await resolveConversationId(request);

  await persist(
    'addMessage (user)',
    () =>
      addMessage({
        messageId: generateMessageId(),
        conversationId,
        userId: request.userId,
        role: 'user',
        content: request.message,
        provider: 'gemini',
      }),
    { conversationId, userId: request.userId, role: 'user' },
  );

  const template = getDefaultPromptTemplate(AI_CHAT_PROMPT_KEY);

  const { systemPrompt, userPrompt } = buildRenderedPrompt({
    systemPrompt: template.systemPrompt,
    userPromptTemplate: template.userPromptTemplate,
    variables: buildChatPromptVariables(request),
  });

  let providerResponse;
  try {
    providerResponse = await generateTextJson<unknown>({
      systemPrompt,
      userPrompt,
    });
  } catch (err) {
    if (err instanceof AiProviderError) {
      throw new AiServiceError(
        `AI provider failed: ${err.message}`,
        'provider_error',
        { cause: err, details: { providerCode: err.code } },
      );
    }
    throw err;
  }

  const aiResponse = validateAiResponse(aiChatResponseSchema, providerResponse.parsed);

  await persist(
    'addMessage (assistant)',
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

// Re-export for convenience — controllers (when added) will need to surface
// this code in HTTP responses.
export type { AiServiceErrorCode };
