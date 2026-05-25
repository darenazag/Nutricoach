export interface WeightLog {
  log_id: number
  user_id: number
  weight: number
  date: string
}

export const weightLogs: WeightLog[] = [
  { log_id: 1,  user_id: 1, weight: 80.5, date: '2026-05-18' },
  { log_id: 2,  user_id: 1, weight: 80.3, date: '2026-05-19' },
  { log_id: 3,  user_id: 1, weight: 80.0, date: '2026-05-20' },
  { log_id: 4,  user_id: 1, weight: 80.4, date: '2026-05-21' },
  { log_id: 5,  user_id: 1, weight: 80.1, date: '2026-05-22' },
  { log_id: 6,  user_id: 1, weight: 79.8, date: '2026-05-23' },
  { log_id: 7,  user_id: 1, weight: 80.0, date: '2026-05-24' },

  { log_id: 8,  user_id: 2, weight: 62.0, date: '2026-05-18' },
  { log_id: 9,  user_id: 2, weight: 61.7, date: '2026-05-19' },
  { log_id: 10, user_id: 2, weight: 61.9, date: '2026-05-20' },
  { log_id: 11, user_id: 2, weight: 61.5, date: '2026-05-21' },
  { log_id: 12, user_id: 2, weight: 61.6, date: '2026-05-22' },
  { log_id: 13, user_id: 2, weight: 61.3, date: '2026-05-23' },
  { log_id: 14, user_id: 2, weight: 61.4, date: '2026-05-24' },

  { log_id: 15, user_id: 3, weight: 70.0, date: '2026-05-18' },
  { log_id: 16, user_id: 3, weight: 70.2, date: '2026-05-19' },
  { log_id: 17, user_id: 3, weight: 70.1, date: '2026-05-20' },
  { log_id: 18, user_id: 3, weight: 70.5, date: '2026-05-21' },
  { log_id: 19, user_id: 3, weight: 70.4, date: '2026-05-22' },
  { log_id: 20, user_id: 3, weight: 70.7, date: '2026-05-23' },
  { log_id: 21, user_id: 3, weight: 70.9, date: '2026-05-24' },
]
