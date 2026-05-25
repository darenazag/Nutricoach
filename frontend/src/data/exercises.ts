export interface Exercise {
  exercise_id: number
  name: string
  calories_per_hour: number
}

export const exercises: Exercise[] = [
  { exercise_id: 1,  name: 'Correr (8 km/h)',          calories_per_hour: 480 },
  { exercise_id: 2,  name: 'Ciclismo (moderado)',      calories_per_hour: 400 },
  { exercise_id: 3,  name: 'Natación',                 calories_per_hour: 500 },
  { exercise_id: 4,  name: 'Entrenamiento de fuerza',  calories_per_hour: 350 },
  { exercise_id: 5,  name: 'Yoga',                     calories_per_hour: 200 },
  { exercise_id: 6,  name: 'Caminar (5 km/h)',         calories_per_hour: 220 },
  { exercise_id: 7,  name: 'HIIT',                     calories_per_hour: 600 },
  { exercise_id: 8,  name: 'Elíptica',                 calories_per_hour: 450 },
  { exercise_id: 9,  name: 'Pilates',                  calories_per_hour: 250 },
  { exercise_id: 10, name: 'Boxeo',                    calories_per_hour: 550 },
]
