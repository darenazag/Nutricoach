export type AiInteractionType =
  | 'chat'
  | 'menu_generation'
  | 'plate_analysis'
  | 'profile_explanation'
  | 'weekly_menu_generation';

export type AiObjective = 'lose_weight' | 'maintain' | 'gain_muscle';

export type AiWeeklyMenuPlanStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'partial_failed';

export type AiWeeklyMenuDayStatus = 'pending' | 'generating' | 'completed' | 'failed';

export type AiRole = 'user' | 'assistant' | 'system';

export type AiConfidence = 'low' | 'medium' | 'high';

export type AiProvider = 'gemini';

export type AiPlan = 'free' | 'pro';

export type AiConversationStatus = 'active' | 'archived';

export const AI_INTERACTION_TYPES: AiInteractionType[] = [
  'chat',
  'menu_generation',
  'plate_analysis',
  'profile_explanation',
  'weekly_menu_generation',
];

export const AI_OBJECTIVES: AiObjective[] = ['lose_weight', 'maintain', 'gain_muscle'];

export const AI_WEEKLY_PLAN_STATUSES: AiWeeklyMenuPlanStatus[] = [
  'pending',
  'generating',
  'completed',
  'failed',
  'partial_failed',
];

export const AI_WEEKLY_DAY_STATUSES: AiWeeklyMenuDayStatus[] = [
  'pending',
  'generating',
  'completed',
  'failed',
];

export const AI_ROLES: AiRole[] = ['user', 'assistant', 'system'];

export const AI_CONFIDENCE_LEVELS: AiConfidence[] = ['low', 'medium', 'high'];

export const AI_PROVIDERS: AiProvider[] = ['gemini'];

export const AI_PLANS: AiPlan[] = ['free', 'pro'];

export const AI_CONVERSATION_STATUSES: AiConversationStatus[] = ['active', 'archived'];

export interface AiTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface AiCostEstimate {
  amount: number;
  currency: string;
}

export interface AiSafetyInfo {
  blocked: boolean;
  reason: string;
}

export interface AiDetectedFood {
  name: string;
  estimatedQuantity: string;
  confidence: AiConfidence;
}

export interface AiEstimatedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AiPlateProportions {
  protein: string;
  carbs: string;
  vegetables: string;
  fats: string;
}

export interface AiImageMetadata {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export interface AiFutureEmbedding {
  embedding?: number[];
  embeddingModel?: string;
  embeddingVersion?: string;
}
