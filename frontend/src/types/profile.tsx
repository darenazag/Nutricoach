export interface ProfileData {
  weight: number
  age: number
  height: number
  gender: 'M' | 'F'
  activityFactor: 'S' | 'A' | 'M'
  objective: 'P' | 'M' | 'G'
  basalMetabolicRate: number
  totalDailyEnergyExpenditure: number
}

export interface CreateProfilePayload {
  weight: number
  height: number
  age: number
  gender: string
  activityFactor: string
  objective: string
  basalMetabolicRate: number
  totalDailyEnergyExpenditure: number
}

export interface StreakData {
  streak: number
  history: { label: string; done: boolean }[]
  mealCount: number
}

export interface RecomendacionMenuComida {
  categoria: string
  kcal: number
  alimentos?: string[]
}

export interface RecomendacionMenu {
  desayuno: RecomendacionMenuComida
  almuerzo: RecomendacionMenuComida
  cena: RecomendacionMenuComida
}

export interface DiaProyeccion {
  dia: number
  calorias_consumidas: number
  balance_energetico: number
  peso_proyectado: number
  recomendacion_menu: RecomendacionMenu
}

export interface RecommendationData {
  datos_usuario: { tmb: string; getd: string }
  objetivo_usuario: string
  proyeccion_diaria: DiaProyeccion[]
}

export const objectiveForApi: Record<string, string> = {
  P: 'bajar',
  M: 'mantener',
  G: 'subir',
}

export const objectiveLabel: Record<string, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
}

export const activityLabel: Record<string, string> = {
  S: 'Sedentario',
  A: 'Activo',
  M: 'Muy activo',
}

export const genderLabel: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
}
