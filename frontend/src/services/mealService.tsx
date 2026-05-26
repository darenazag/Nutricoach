import { api } from './api'
import type { Meal, Analysis, CreateMealPayload } from '../types'

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

  analyzeImage(file: File): Promise<{ analysis: Analysis }> {
    const form = new FormData()
    form.append('image', file)
    return api.postFormData<{ analysis: Analysis }>('/ai/analyze-preview', form)
  },

  analyzeImageQuick(file: File): Promise<void> {
    const form = new FormData()
    form.append('image', file)
    return api.postFormData<void>('/ai/analyze', form)
  },
}
