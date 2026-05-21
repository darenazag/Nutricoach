import { randomUUID } from 'node:crypto';
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
import type { AiServiceMetadata } from './aiResponse.types.js';

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
  aiResponse: ReturnType<typeof validateAiResponse<typeof aiPlateAnalysisResponseSchema>>,
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
 * Orchestrates a single plate-analysis turn:
 *   1. Validates the request metadata with aiPlateAnalysisRequestSchema.
 *   2. Retrieves and renders the plate-analysis prompt template.
 *   3. Calls Gemini with the image as base64 inlineData.
 *   4. Validates the AI response with aiPlateAnalysisResponseSchema.
 *   5. Persists the result in AiPlateAnalysis (image binary is never stored).
 *   6. Returns the typed service result including analysisId.
 *
 * Errors are normalised to AiServiceError:
 *   - 'validation_error'  — request or AI response failed Zod.
 *   - 'prompt_not_found'  — no template registered.
 *   - 'provider_error'    — Gemini SDK failure.
 *   - 'persistence_error' — Mongo write failed.
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

  // 3. Call Gemini with image
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

  // 4. Validate AI response
  const aiResponse = validateAiResponse(aiPlateAnalysisResponseSchema, providerResponse.parsed);

  // 5. Persist
  const analysisId = `analysis_${randomUUID()}`;
  await persistAnalysis(analysisId, input, aiResponse, providerResponse.parsed);

  // 6. Return result
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
    analysisId,
  };
}
