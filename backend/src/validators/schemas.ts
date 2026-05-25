/**
 * @file Esquemas de validacion con Zod para los cuerpos y parametros de las
 * peticiones. Centralizar aqui las reglas mantiene los controladores limpios.
 */

import { z } from 'zod';

/** Numero que puede llegar como string desde JSON o query params. */
const numeric = z.coerce.number();

/** Parametro de ruta `:id` numerico y positivo. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Body de registro de usuario. */
export const registerSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email().max(50),
  password: z.string().min(8).max(72), // bcrypt limita a 72 bytes
});

/** Body de login. */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Food_item
// ---------------------------------------------------------------------------

/** Body para crear un alimento. */
export const createFoodSchema = z.object({
  food_id: numeric.int().positive(),
  protein: numeric.min(0).default(0),
  calories: numeric.min(0).default(0),
  carbs: numeric.min(0).default(0),
  fat: numeric.min(0).default(0),
  source: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Meal
// ---------------------------------------------------------------------------

/** Body para crear una comida con ingredientes opcionales. */
export const createMealSchema = z.object({
  meal_id: numeric.int().positive(),
  name: z.string().min(1).max(100),
  calories: numeric.min(0).default(0),
  protein: numeric.min(0).default(0),
  fat: numeric.min(0).default(0),
  carbs: numeric.min(0).default(0),
  img: z.string().nullish(),
  source: z.string().nullish(),
  foodIds: z.array(numeric.int().positive()).default([]),
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/** Body para crear/actualizar un perfil. */
export const createProfileSchema = z.object({
  user_id: numeric.int().positive(),
  weight: numeric.positive(),
  age: numeric.int().positive(),
  height: numeric.positive(),
  gender: z.enum(['M', 'F']),
  activityFactor: z.enum(['S', 'A', 'M']),
  objective: z.enum(['P', 'M', 'G']),
  basalMetabolicRate: numeric.min(0).default(0),
  totalDailyEnergyExpenditure: numeric.min(0).default(0),
});

/** Body para asignar una comida a un perfil. */
export const assignMealSchema = z.object({
  mealId: numeric.int().positive(),
});

// Tipos inferidos para usar en los controladores.
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateFoodInput = z.infer<typeof createFoodSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type AssignMealInput = z.infer<typeof assignMealSchema>;
