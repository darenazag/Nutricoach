export interface Goal {
  goal_id: number
  user_id: number
  type: string
  target: number
  start_date: string
  end_date: string | null
}

export const goals: Goal[] = [
  { goal_id: 1, user_id: 1, type: 'weight',  target: 78,  start_date: '2026-05-01', end_date: '2026-08-01' },
  { goal_id: 2, user_id: 1, type: 'protein', target: 160, start_date: '2026-05-01', end_date: null },
  { goal_id: 3, user_id: 2, type: 'weight',  target: 58,  start_date: '2026-05-01', end_date: '2026-07-01' },
  { goal_id: 4, user_id: 2, type: 'calories',target: 1800,start_date: '2026-05-01', end_date: null },
  { goal_id: 5, user_id: 3, type: 'weight',  target: 73,  start_date: '2026-05-01', end_date: '2026-09-01' },
  { goal_id: 6, user_id: 3, type: 'protein', target: 100, start_date: '2026-05-01', end_date: null },
]
