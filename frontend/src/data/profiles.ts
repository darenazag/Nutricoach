export interface Profile {
  user_id: number
  weight: number
  age: number
  height: number
  gender: 'M' | 'F'
  activityFactor: 'S' | 'A' | 'M'
  objective: 'P' | 'M' | 'G'
  basalMetabolicRate: number
  totalDailyEnergyExpenditure: number
}

export const profiles: Profile[] = [
  {
    user_id: 1,
    weight: 80.5,
    age: 28,
    height: 180,
    gender: 'M',
    activityFactor: 'A',
    objective: 'G',
    basalMetabolicRate: 1800,
    totalDailyEnergyExpenditure: 2800,
  },
  {
    user_id: 2,
    weight: 62.0,
    age: 32,
    height: 165,
    gender: 'F',
    activityFactor: 'M',
    objective: 'P',
    basalMetabolicRate: 1400,
    totalDailyEnergyExpenditure: 2100,
  },
  {
    user_id: 3,
    weight: 70.0,
    age: 24,
    height: 172,
    gender: 'F',
    activityFactor: 'S',
    objective: 'M',
    basalMetabolicRate: 1500,
    totalDailyEnergyExpenditure: 1850,
  },
]
