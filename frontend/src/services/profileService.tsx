import { api } from './api'
import type { ProfileData, CreateProfilePayload, StreakData, RecommendationData } from '../types'

export const profileService = {
  get(): Promise<{ profile: ProfileData }> {
    return api.get<{ profile: ProfileData }>('/profile')
  },

  create(data: CreateProfilePayload): Promise<{ profile: ProfileData }> {
    return api.post<{ profile: ProfileData }>('/profile', data)
  },

  getStreak(): Promise<StreakData> {
    return api.get<StreakData>('/profile/streak')
  },

  getRecommendation(userId: number, objective: string): Promise<RecommendationData> {
    return api.get<RecommendationData>(
      `/meals/recommend?userId=${userId}&objective=${objective}`,
    )
  },
}
