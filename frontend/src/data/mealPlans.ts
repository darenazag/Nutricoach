export interface MealPlan {
  plan_id: number
  name: string
  day_of_week: number
  meal_type: string
}

export const mealPlans: MealPlan[] = [
  { plan_id: 1, name: 'Tortilla de Avena y Aguacate',      day_of_week: 1, meal_type: 'desayuno' },
  { plan_id: 2, name: 'Pollo con Arroz y Brócoli Fit',     day_of_week: 1, meal_type: 'almuerzo' },
  { plan_id: 3, name: 'Bowl de Arroz, Huevo y Aguacate',    day_of_week: 1, meal_type: 'cena' },
  { plan_id: 4, name: 'Tortilla de Avena y Aguacate',      day_of_week: 3, meal_type: 'desayuno' },
  { plan_id: 5, name: 'Bowl de Arroz, Huevo y Aguacate',    day_of_week: 3, meal_type: 'almuerzo' },
  { plan_id: 6, name: 'Pollo con Arroz y Brócoli Fit',     day_of_week: 3, meal_type: 'cena' },
  { plan_id: 7, name: 'Bowl de Arroz, Huevo y Aguacate',    day_of_week: 5, meal_type: 'desayuno' },
  { plan_id: 8, name: 'Tortilla de Avena y Aguacate',      day_of_week: 5, meal_type: 'almuerzo' },
  { plan_id: 9, name: 'Pollo con Arroz y Brócoli Fit',     day_of_week: 5, meal_type: 'cena' },
]
