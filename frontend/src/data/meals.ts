export interface Meal {
  meal_id: number
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  img: string | null
  source: string
}

export const meals: Meal[] = [
  {
    meal_id: 201,
    name: 'Pollo con Arroz y Brócoli Fit',
    calories: 489,
    protein: 51.6,
    fat: 7.7,
    carbs: 59.9,
    img: 'pollo_arroz.jpg',
    source: 'Almuerzo limpio post-entreno',
  },
  {
    meal_id: 202,
    name: 'Tortilla de Avena y Aguacate',
    calories: 393,
    protein: 21.0,
    fat: 21.1,
    carbs: 33.1,
    img: 'tortilla_avena.jpg',
    source: 'Desayuno energético',
  },
  {
    meal_id: 203,
    name: 'Bowl de Arroz, Huevo y Aguacate',
    calories: 600,
    protein: 31.4,
    fat: 27.3,
    carbs: 66.1,
    img: 'bowl_healthy.jpg',
    source: 'Cena completa alta en grasas buenas',
  },
]
