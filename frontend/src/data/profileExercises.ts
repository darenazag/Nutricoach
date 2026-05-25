export interface ProfileExercise {
  log_id: number
  Profile_user_id: number
  Exercise_exercise_id: number
  duration_min: number
  date: string
}

export const profileExercises: ProfileExercise[] = [
  { log_id: 1, Profile_user_id: 1, Exercise_exercise_id: 4, duration_min: 45, date: '2026-05-24' },
  { log_id: 2, Profile_user_id: 1, Exercise_exercise_id: 1, duration_min: 30, date: '2026-05-22' },
  { log_id: 3, Profile_user_id: 2, Exercise_exercise_id: 2, duration_min: 50, date: '2026-05-24' },
  { log_id: 4, Profile_user_id: 2, Exercise_exercise_id: 5, duration_min: 40, date: '2026-05-23' },
  { log_id: 5, Profile_user_id: 3, Exercise_exercise_id: 6, duration_min: 35, date: '2026-05-24' },
  { log_id: 6, Profile_user_id: 3, Exercise_exercise_id: 9, duration_min: 40, date: '2026-05-23' },
]
