export interface FoodItem {
  food_id: number
  protein: number
  calories: number
  carbs: number
  fat: number
  source: string
}

export const foodItems: FoodItem[] = [
  {
    food_id: 101,
    protein: 23.0,
    calories: 165,
    carbs: 0.0,
    fat: 3.6,
    source: 'Pechuga de Pollo',
  },
  {
    food_id: 102,
    protein: 2.7,
    calories: 130,
    carbs: 28.0,
    fat: 0.3,
    source: 'Arroz Integral',
  },
  {
    food_id: 103,
    protein: 13.0,
    calories: 155,
    carbs: 1.1,
    fat: 11.0,
    source: 'Huevo Entero',
  },
  {
    food_id: 104,
    protein: 2.0,
    calories: 49,
    carbs: 12.0,
    fat: 0.1,
    source: 'Avena en copos',
  },
  {
    food_id: 105,
    protein: 0.9,
    calories: 22,
    carbs: 3.9,
    fat: 0.2,
    source: 'Brócoli Hervido',
  },
  {
    food_id: 106,
    protein: 2.0,
    calories: 160,
    carbs: 9.0,
    fat: 15.0,
    source: 'Aguacate',
  },
]
