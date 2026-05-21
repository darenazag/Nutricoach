export type AiObjective = 'lose_weight' | 'maintain' | 'gain_muscle';
export type AiPlan = 'free' | 'pro';
export type AiConfidence = 'low' | 'medium' | 'high';

export interface AiUserContext {
  objective?: AiObjective;
  caloriesTarget?: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
}

export interface AiChatRequest {
  userId: string;
  conversationId?: string;
  message: string;
  userContext?: AiUserContext;
  plan?: AiPlan;
}

export interface AiChatStructuredData {
  recommendations: string[];
  warnings: string[];
  followUpQuestions: string[];
  confidence: AiConfidence;
}

export interface AiSafety {
  isOutOfScope: boolean;
  flags: string[];
  escalationMessage: string | null;
}

export interface AiMetadata {
  provider: 'gemini';
  model: string;
  promptVersion: string;
  cached: boolean;
}

export interface AiChatResponseData {
  responseText: string;
  structuredData: AiChatStructuredData;
  safety: AiSafety;
  conversationId: string;
  metadata: AiMetadata;
}

// ── Plate analysis ─────────────────────────────────────────────────────────

export interface NutritionRange {
  min: number;
  max: number;
}

export interface EstimatedNutrition {
  caloriesRange: NutritionRange;
  proteinRange: NutritionRange;
  carbsRange: NutritionRange;
  fatRange: NutritionRange;
}

export interface DetectedFood {
  name: string;
  estimatedQuantity: string;
  confidence: AiConfidence;
}

export interface PlateProportions {
  protein: string;
  carbs: string;
  vegetables: string;
  fats: string;
}

export interface PlateAnalysisStructuredData {
  detectedFoods: DetectedFood[];
  estimatedNutrition: EstimatedNutrition;
  assumptions: string[];
  confidenceReason: string;
  proportions: PlateProportions;
  recommendations: string[];
  warnings: string[];
  confidence: AiConfidence;
}

export interface AiPlateAnalysisResponseData {
  responseText: string;
  structuredData: PlateAnalysisStructuredData;
  safety: AiSafety;
  metadata: AiMetadata;
  analysisId: string;
}

export interface AiPlateAnalysisFormPayload {
  userId: string;
  objective?: AiObjective;
  caloriesTarget?: number;
  plan?: AiPlan;
  image: File;
}

// ── Shared errors ───────────────────────────────────────────────────────────

export interface AiApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface AiApiResponse<T = AiChatResponseData> {
  success: boolean;
  data?: T;
  error?: AiApiError;
}
