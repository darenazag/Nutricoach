import {
  aiProfileExplanationRequestSchema,
  aiProfileExplanationResponseSchema,
} from '../schemas/index.js';
import type { AiSafetyOutput } from '../schemas/index.js';
import {
  AI_PROFILE_EXPLANATION_PROMPT_KEY,
  buildRenderedPrompt,
  type RenderPromptVariables,
} from '../prompts/index.js';
import { AiProviderError } from '../providers/index.js';
import { generateTextJson } from './aiProviderRouter.service.js';
import {
  addMessage,
  createConversation,
} from '../repositories/aiConversation.repository.js';
import { AiServiceError } from './aiServiceError.js';
import { getDefaultPromptTemplate } from './aiPrompt.service.js';
import { validateAiResponse } from './aiValidation.service.js';
import { generateConversationId, generateMessageId } from './aiId.service.js';
import {
  buildCacheKey,
  getCacheTtlSeconds,
  storeCache,
  tryGetCached,
} from './aiCache.service.js';
import type {
  AiProfileExplanationRequest,
  AiProfileExplanationResponse,
  AiServiceResult,
} from './aiResponse.types.js';
import type { AiProvider } from '../types/index.js';

export interface AiProfileExplanationServiceResult
  extends AiServiceResult<AiProfileExplanationResponse['structuredData']> {
  safety: AiProfileExplanationResponse['safety'];
  conversationId: string;
}

/**
 * Flattens the profile explanation request into the variable map expected by
 * the user prompt template. Missing optional values become empty strings so
 * the renderer never leaves raw {{placeholders}} in the rendered prompt.
 */
function buildProfilePromptVariables(
  req: AiProfileExplanationRequest,
): RenderPromptVariables {
  return {
    objective: req.objective,
    basalMetabolicRate: req.basalMetabolicRate,
    totalDailyEnergyExpenditure: req.totalDailyEnergyExpenditure,
    caloriesTarget: req.caloriesTarget,
    proteinTarget: req.proteinTarget ?? '',
    carbsTarget: req.carbsTarget ?? '',
    fatTarget: req.fatTarget ?? '',
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
 * Serializes the profile explanation request for storage as the "user"
 * message content. `userId` is dropped because it is already a top-level
 * field on AiMessage.
 */
function serializeProfileRequestForPersistence(
  req: AiProfileExplanationRequest,
): string {
  const { userId, ...rest } = req;
  void userId;
  return JSON.stringify(rest, null, 2);
}

/**
 * Orchestrates a single AI profile explanation turn with minimal Mongo
 * persistence:
 *   1. Validate the request with `aiProfileExplanationRequestSchema`.
 *   2. Create a brand-new conversation with type 'profile_explanation'.
 *   3. Persist the serialized request as the user message.
 *   4. Load the active prompt template, render, call Gemini.
 *   5. Validate the parsed JSON with `aiProfileExplanationResponseSchema`.
 *   6. Persist the assistant message (with provider, model, promptVersion, safety).
 *   7. Return the typed service result including `conversationId`.
 *
 * Errors are normalized to `AiServiceError` with one of:
 *   - 'validation_error'  (request or AI response failed Zod)
 *   - 'prompt_not_found'  (no template registered)
 *   - 'provider_error'    (Gemini SDK failure, wrapped from AiProviderError)
 *   - 'persistence_error' (any Mongo write/read failure)
 *
 * Like menu generation, each call creates its own conversation: profile
 * explanation is one-shot. A user that re-runs onboarding produces a new
 * conversation, which keeps the audit trail clean and simple.
 *
 * NOTE: the prompt explicitly instructs the model NOT to recalculate any
 * value — the backend has already computed BMR / TDEE / targets. The model
 * only explains them in plain Spanish.
 */
export async function runAiProfileExplanation(
  input: unknown,
): Promise<AiProfileExplanationServiceResult> {
  const requestResult = aiProfileExplanationRequestSchema.safeParse(input);
  if (!requestResult.success) {
    throw new AiServiceError(
      'AI profile explanation request failed Zod validation.',
      'validation_error',
      { cause: requestResult.error, details: requestResult.error.issues },
    );
  }
  const request = requestResult.data;

  const conversationId = generateConversationId();

  await persist(
    'createConversation (profile_explanation)',
    () =>
      createConversation({
        conversationId,
        userId: request.userId,
        type: 'profile_explanation',
        provider: 'gemini',
      }),
    { conversationId, userId: request.userId },
  );

  await persist(
    'addMessage (user, profile_explanation)',
    () =>
      addMessage({
        messageId: generateMessageId(),
        conversationId,
        userId: request.userId,
        role: 'user',
        content: serializeProfileRequestForPersistence(request),
        provider: 'gemini',
      }),
    { conversationId, userId: request.userId, role: 'user' },
  );

  const template = getDefaultPromptTemplate(AI_PROFILE_EXPLANATION_PROMPT_KEY);

  const { systemPrompt, userPrompt } = buildRenderedPrompt({
    systemPrompt: template.systemPrompt,
    userPromptTemplate: template.userPromptTemplate,
    variables: buildProfilePromptVariables(request),
  });

  // Cache key only depends on what determines the output: rendered prompts +
  // model + prompt version. See aiCache.service.ts for the contract.
  const resolvedModel = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
  const cacheKey = buildCacheKey({
    systemPrompt,
    userPrompt,
    model: resolvedModel,
    promptVersion: template.version,
  });

  let cachedJson: unknown = null;
  try {
    cachedJson = await tryGetCached<unknown>(cacheKey);
  } catch (err) {
    // The cache must never break the user flow. Log and fall through to Gemini.
    console.warn('[aiCache] tryGetCached failed:', err);
  }

  let aiResponse: AiProfileExplanationResponse;
  let usedProvider: AiProvider;
  let usedModel: string;
  let cached: boolean;

  if (cachedJson !== null) {
    // HIT — validate the cached payload with the same schema.
    aiResponse = validateAiResponse(aiProfileExplanationResponseSchema, cachedJson);
    usedProvider = 'gemini';
    usedModel = resolvedModel;
    cached = true;
  } else {
    // MISS — call Gemini, validate, store in cache (best-effort).
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

    aiResponse = validateAiResponse(
      aiProfileExplanationResponseSchema,
      providerResponse.parsed,
    );

    try {
      await storeCache({
        cacheKey,
        type: 'profile_explanation',
        inputHash: cacheKey,
        resultText: providerResponse.text,
        resultJson: aiResponse,
        provider: providerResponse.metadata.provider,
        model: providerResponse.metadata.model,
        promptVersion: template.version,
        ttlSeconds: getCacheTtlSeconds(),
      });
    } catch (err) {
      console.warn('[aiCache] storeCache failed:', err);
    }

    usedProvider = providerResponse.metadata.provider;
    usedModel = providerResponse.metadata.model;
    cached = false;
  }

  await persist(
    'addMessage (assistant, profile_explanation)',
    () =>
      addMessage({
        messageId: generateMessageId(),
        conversationId,
        userId: request.userId,
        role: 'assistant',
        content: aiResponse.responseText,
        structuredData: aiResponse.structuredData,
        provider: usedProvider,
        model: usedModel,
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
      provider: usedProvider,
      model: usedModel,
      promptVersion: template.version,
      cached,
    },
  };
}
