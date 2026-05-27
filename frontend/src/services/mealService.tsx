import { api } from './api'
import type { Meal, CreateMealPayload, SaveAnalyzedMealPayload, AnalyzePreviewResponse } from '../types'

export const mealService = {
  getAll(): Promise<{ meals: Meal[] }> {
    return api.get<{ meals: Meal[] }>('/meals')
  },

  getMyMeals(): Promise<{ meals: Meal[] }> {
    return api.get<{ meals: Meal[] }>('/meals/profile/mine')
  },

  create(data: CreateMealPayload): Promise<{ meal: Meal }> {
    return api.post<{ meal: Meal }>('/meals', data)
  },

  assign(mealId: number, mealType?: string): Promise<void> {
    return api.post<void>('/meals/profile/assign', { mealId, mealType })
  },

  analyzeImage(file: File): Promise<AnalyzePreviewResponse> {
    const form = new FormData()
    form.append('image', file)
    return api.postFormData<AnalyzePreviewResponse>('/ai/analyze-preview', form)
  },

  analyzeImageQuick(file: File): Promise<void> {
    const form = new FormData()
    form.append('image', file)
    return api.postFormData<void>('/ai/analyze', form)
  },

  saveAnalyzedMeal(payload: SaveAnalyzedMealPayload): Promise<{ success: boolean; data: { meal: Meal } }> {
    return api.post<{ success: boolean; data: { meal: Meal } }>('/ai/save-analyzed-meal', payload)
  },
}
