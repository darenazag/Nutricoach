export interface Meal {
  meal_id: number
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  img: string | null
  source: string
  ingredients?: string[]
  confidence?: number
  mealType?: string
}

export interface DetectedFood {
  name: string
  estimatedQuantity: string
  confidence: 'low' | 'medium' | 'high'
}

export interface Analysis {
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  source: string
  // Optional rich fields from /analyze-preview
  analysisId?: string
  responseText?: string
  detectedFoods?: DetectedFood[]
  proportions?: { protein: string; carbs: string; vegetables: string; fats: string }
  recommendations?: string[]
  warnings?: string[]
  confidence?: 'low' | 'medium' | 'high'
}

export interface CreateMealPayload {
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  source: string
}

export interface AssignMealPayload {
  mealId: number
  mealType?: string
}

export interface SaveAnalyzedMealPayload {
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  mealType?: string
  analysisId?: string
}

export interface AnalyzePreviewResponse {
  analysis: { name: string; calories: number; protein: number; fat: number; carbs: number; source: string }
  analysisId?: string
  responseText?: string
  detectedFoods?: DetectedFood[]
  proportions?: { protein: string; carbs: string; vegetables: string; fats: string }
  recommendations?: string[]
  warnings?: string[]
  confidence?: 'low' | 'medium' | 'high'
}
