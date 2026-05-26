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

export interface Analysis {
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  source: string
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
