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

// ── Menu ───────────────────────────────────────────────────────────────────

export interface AiMenuRequest {
  userId: string;
  objective: AiObjective;
  caloriesTarget: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  days?: number;
  mealsPerDay?: number;
  notes?: string;
  plan?: AiPlan;
}

export interface AiMenuMeal {
  name: string;
  description: string;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
}

export interface AiMenuDay {
  day: number;
  meals: AiMenuMeal[];
}

export interface AiMenuStructuredData {
  dailyCalories: number;
  days: AiMenuDay[];
  recommendations: string[];
  warnings: string[];
}

export interface AiMenuResponseData {
  responseText: string;
  structuredData: AiMenuStructuredData;
  safety: AiSafety;
  metadata: AiMetadata;
  conversationId: string;
}

// ── Profile explanation ─────────────────────────────────────────────────────

export interface AiProfileExplanationRequest {
  userId: string;
  objective: AiObjective;
  basalMetabolicRate: number;
  totalDailyEnergyExpenditure: number;
  caloriesTarget: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  plan?: AiPlan;
}

export interface AiProfileExplanationStructuredData {
  explainedMetrics: string[];
  recommendations: string[];
  warnings: string[];
  confidence: AiConfidence;
}

export interface AiProfileExplanationResponseData {
  responseText: string;
  structuredData: AiProfileExplanationStructuredData;
  safety: AiSafety;
  metadata: AiMetadata;
  conversationId: string;
}

// ── Conversations ───────────────────────────────────────────────────────────

export interface AiConversationEntry {
  conversationId: string;
  userId: string;
  type: string;
  status: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationMessage {
  messageId: string;
  conversationId: string;
  userId: string;
  role: string;
  content: string;
  structuredData: unknown;
  provider: string;
  model: string;
  promptVersion: string;
  safety: AiSafety;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationData {
  conversation: AiConversationEntry;
  messages: AiConversationMessage[];
}

// ── Weekly menu async ───────────────────────────────────────────────────────

export type AiWeeklyPlanStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed'
  | 'partial_failed';

export type AiWeeklyDayStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface AiWeeklyMenuRequest {
  userId: string;
  objective: AiObjective;
  caloriesTarget: number;
  proteinTarget?: number;
  carbsTarget?: number;
  fatTarget?: number;
  mealsPerDay?: number;
  notes?: string;
  plan?: AiPlan;
}

export interface AiWeeklyMenuCreateResponse {
  planId: string;
  status: 'generating';
  totalDays: number;
  message: string;
}

export interface AiWeeklyMenuMeal {
  name: string;
  description: string;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
}

export interface AiWeeklyMenuDayDto {
  dayNumber: number;
  status: AiWeeklyDayStatus;
  cached: boolean;
  dailyCalories: number;
  meals: AiWeeklyMenuMeal[];
  recommendations: string[];
  warnings: string[];
  errorMessage: string;
}

export interface AiWeeklyMenuProgress {
  completedDays: number;
  totalDays: number;
  percentage: number;
}

export interface AiWeeklyUsageEstimation {
  providerCallsPlanned: number;
  providerCallsCompleted: number;
  cacheHits: number;
  cacheMisses: number;
  realTokensAvailable: false;
}

export interface AiWeeklyMenuPlanDto {
  planId: string;
  status: AiWeeklyPlanStatus;
  userId: string;
  objective: string;
  caloriesTarget: number;
  mealsPerDay: number;
  totalDays: number;
  completedDays: number;
  progress: AiWeeklyMenuProgress;
  days: AiWeeklyMenuDayDto[];
  usageEstimation: AiWeeklyUsageEstimation;
  errorDetails?: unknown;
  createdAt: string;
  updatedAt: string;
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
