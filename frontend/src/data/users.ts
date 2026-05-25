export interface User {
  user_id: number
  name: string
  email: string
  password: string
}

export const users: User[] = [
  {
    user_id: 1,
    name: 'Carlos Entrenador',
    email: 'carlos@nutricoach.com',
    password: 'claveloca123',
  },
  {
    user_id: 2,
    name: 'Elena Runner',
    email: 'elena@nutricoach.com',
    password: 'securepass99',
  },
  {
    user_id: 3,
    name: 'Sofia Health',
    email: 'sofia@nutricoach.com',
    password: 'sofia2026',
  },
]
