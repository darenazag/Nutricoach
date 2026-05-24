import { createHash, randomUUID } from 'node:crypto';
import { aiPlateAnalysisRequestSchema, aiPlateAnalysisResponseSchema } from '../schemas/index.js';
import type { AiSafetyOutput } from '../schemas/index.js';
import {
  AI_PLATE_ANALYSIS_PROMPT_KEY,
  buildRenderedPrompt,
  type RenderPromptVariables,
} from '../prompts/index.js';
import { AiProviderError, generateGeminiJsonWithImage } from '../providers/index.js';
import { AiPlateAnalysis } from '../models/index.js';
import { AiServiceError } from './aiServiceError.js';
import { getDefaultPromptTemplate } from './aiPrompt.service.js';
import { validateAiResponse } from './aiValidation.service.js';
import { tryGetCached, storeCache, getCacheTtlSeconds } from './aiCache.service.js';
import type { AiPlateAnalysisResponse, AiServiceMetadata } from './aiResponse.types.js';
import type { AiProvider } from '../types/index.js';

// ── Input / Output types ───────────────────────────────────────────────────

export interface AiPlateAnalysisInput {
  userId: string;
  mealId?: string;
  imageBuffer: Buffer;
  imageMetadata: {
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
  };
  objective?: 'lose_weight' | 'maintain' | 'gain_muscle';
  caloriesTarget?: number;
  plan?: 'free' | 'pro';
}

export interface AiPlateAnalysisServiceResult {
  responseText: string;
  structuredData: {
    detectedFoods: Array<{ name: string; estimatedQuantity: string; confidence: string }>;
    estimatedNutrition: {
      caloriesRange: { min: number; max: number };
      proteinRange: { min: number; max: number };
      carbsRange: { min: number; max: number };
      fatRange: { min: number; max: number };
    };
    assumptions: string[];
    confidenceReason: string;
    proportions: { protein: string; carbs: string; vegetables: string; fats: string };
    recommendations: string[];
    warnings: string[];
    confidence: string;
  };
  safety: AiSafetyOutput;
  metadata: AiServiceMetadata;
  analysisId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * SHA-256 hex digest of the processed image buffer.
 * Used as part of the plate-analysis cache key so that two different images
 * with identical prompt parameters never collide in the cache.
 */
function buildImageBufferHash(imageBuffer: Buffer): string {
  return createHash('sha256').update(imageBuffer).digest('hex');
}

/**
 * Compound cache key for plate analysis.
 *
 * Unlike the one-shot text endpoints (menu, profile-explanation) whose output
 * depends only on the rendered prompts + model + version, plate analysis is
 * multimodal: the same prompt parameters with a different image must produce a
 * different cache key. We include the image SHA-256 to guarantee that.
 *
 * A local function is used instead of extending `buildCacheKey` from
 * aiCache.service.ts to avoid any risk of breaking the existing contract for
 * menu and profile-explanation.
 */
function buildPlateAnalysisCacheKey(params: {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  promptVersion: string;
  imageHash: string;
}): string {
  return createHash('sha256').update(JSON.stringify(params)).digest('hex');
}

function buildPlateAnalysisVariables(
  input: AiPlateAnalysisInput,
): RenderPromptVariables {
  return {
    mimeType: input.imageMetadata.mimeType,
    sizeBytes: input.imageMetadata.sizeBytes,
    width: input.imageMetadata.width ?? '',
    height: input.imageMetadata.height ?? '',
    objective: input.objective ?? '',
    caloriesTarget: input.caloriesTarget ?? '',
    plan: input.plan ?? '',
  };
}

async function persistAnalysis(
  analysisId: string,
  input: AiPlateAnalysisInput,
  aiResponse: AiPlateAnalysisResponse,
  rawResponse: unknown,
): Promise<void> {
  try {
    await AiPlateAnalysis.create({
      analysisId,
      userId: input.userId,
      mealId: input.mealId ?? null,
      imageStored: false,
      imageMetadata: input.imageMetadata,
      detectedFoods: aiResponse.structuredData.detectedFoods,
      estimatedNutrition: aiResponse.structuredData.estimatedNutrition,
      assumptions: aiResponse.structuredData.assumptions,
      confidenceReason: aiResponse.structuredData.confidenceReason,
      proportions: aiResponse.structuredData.proportions,
      confidence: aiResponse.structuredData.confidence,
      recommendations: aiResponse.structuredData.recommendations,
      warnings: aiResponse.structuredData.warnings,
      rawAiResponse: rawResponse,
    });
  } catch (err) {
    throw new AiServiceError(
      `Persistence failed for analysisId "${analysisId}": ${
        err instanceof Error ? err.message : String(err)
      }`,
      'persistence_error',
      { cause: err, details: { analysisId, userId: input.userId } },
    );
  }
}

// ── Main orchestrator ──────────────────────────────────────────────────────

/**
 * Orchestrates a single plate-analysis turn with cache support:
 *   1. Validates the request metadata with aiPlateAnalysisRequestSchema.
 *   2. Retrieves and renders the plate-analysis prompt template.
 *   3. Builds a compound cache key: SHA256({ prompts, model, version, imageHash }).
 *   4. On CACHE HIT: validates cached JSON, skips Gemini call.
 *   5. On CACHE MISS: calls Gemini with base64 image, validates, stores in cache.
 *   6. Always persists a new AiPlateAnalysis document (audit trail per request).
 *   7. Returns the typed service result including analysisId and metadata.cached.
 *
 * Errors are normalised to AiServiceError:
 *   - 'validation_error'  — request or AI response failed Zod.
 *   - 'prompt_not_found'  — no template registered.
 *   - 'provider_error'    — Gemini SDK failure.
 *   - 'persistence_error' — Mongo write failed.
 *
 * Cache errors (read or write) are swallowed as warnings so they never
 * interrupt the user-facing flow.
 */
export async function runAiPlateAnalysis(
  input: AiPlateAnalysisInput,
): Promise<AiPlateAnalysisServiceResult> {
  // 1. Validate request metadata (imageBuffer is not part of the schema)
  const requestResult = aiPlateAnalysisRequestSchema.safeParse({
    userId: input.userId,
    mealId: input.mealId,
    imageMetadata: input.imageMetadata,
    objective: input.objective,
    caloriesTarget: input.caloriesTarget,
    plan: input.plan,
  });

  if (!requestResult.success) {
    throw new AiServiceError(
      'Plate analysis request failed Zod validation.',
      'validation_error',
      { cause: requestResult.error, details: requestResult.error.issues },
    );
  }
  const request = requestResult.data;

  // 2. Prompt template + render
  const template = getDefaultPromptTemplate(AI_PLATE_ANALYSIS_PROMPT_KEY);

  const { systemPrompt, userPrompt } = buildRenderedPrompt({
    systemPrompt: template.systemPrompt,
    userPromptTemplate: template.userPromptTemplate,
    variables: buildPlateAnalysisVariables(input),
  });

  // 3. Build cache key — includes image hash to avoid cross-image collisions
  const imageHash = buildImageBufferHash(input.imageBuffer);
  const resolvedModel = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-flash';
  const cacheKey = buildPlateAnalysisCacheKey({
    systemPrompt,
    userPrompt,
    model: resolvedModel,
    promptVersion: template.version,
    imageHash,
  });

  // 4. Try cache
  let cachedJson: unknown = null;
  try {
    cachedJson = await tryGetCached<unknown>(cacheKey);
  } catch (err) {
    console.warn('[aiCache] tryGetCached (plate-analysis) failed:', err);
  }

  let aiResponse: AiPlateAnalysisResponse;
  let usedProvider: AiProvider;
  let usedModel: string;
  let cached: boolean;
  let rawForPersistence: unknown;

  if (cachedJson !== null) {
    // HIT — validate cached payload with the same schema to catch poisoned entries
    aiResponse = validateAiResponse(aiPlateAnalysisResponseSchema, cachedJson);
    usedProvider = 'gemini';
    usedModel = resolvedModel;
    cached = true;
    rawForPersistence = cachedJson;
  } else {
    // MISS — call Gemini, validate, then store in cache (best-effort)
    let providerResponse;
    try {
      providerResponse = await generateGeminiJsonWithImage<unknown>({
        systemPrompt,
        userPrompt,
        imageBuffer: input.imageBuffer,
        mimeType: request.imageMetadata.mimeType,
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

    aiResponse = validateAiResponse(aiPlateAnalysisResponseSchema, providerResponse.parsed);

    try {
      await storeCache({
        cacheKey,
        type: 'plate_analysis',
        // inputHash stores the image SHA-256 (the primary discriminator).
        // The cacheKey is a compound hash of image + prompts + model.
        inputHash: imageHash,
        resultText: aiResponse.responseText,
        resultJson: aiResponse,
        provider: providerResponse.metadata.provider,
        model: providerResponse.metadata.model,
        promptVersion: template.version,
        ttlSeconds: getCacheTtlSeconds(),
      });
    } catch (err) {
      console.warn('[aiCache] storeCache (plate-analysis) failed:', err);
    }

    usedProvider = providerResponse.metadata.provider;
    usedModel = providerResponse.metadata.model;
    cached = false;
    rawForPersistence = providerResponse.parsed;
  }

  // 5. Persist AiPlateAnalysis — always, even on cache hit (new analysisId per request)
  const analysisId = `analysis_${randomUUID()}`;
  await persistAnalysis(analysisId, input, aiResponse, rawForPersistence);

  // 6. Return result
  return {
    responseText: aiResponse.responseText,
    structuredData: aiResponse.structuredData,
    safety: aiResponse.safety,
    metadata: {
      provider: usedProvider,
      model: usedModel,
      promptVersion: template.version,
      cached,
    },
    analysisId,
  };
}
