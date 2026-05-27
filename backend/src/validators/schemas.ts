/**
 * @file Esquemas de validación con Zod para los cuerpos y parámetros
 * de las peticiones. Centralizar aquí las reglas mantiene los controladores
 * limpios y desacopla la validación del transporte HTTP.
 */

import { z } from 'zod';

/** Número que puede llegar como string desde JSON o query params. */
const numeric = z.coerce.number();

/** Parámetro de ruta `:id` numérico, entero y positivo. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Parámetros de paginación opcionales para los endpoints de listado. */
export const paginationSchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/** Body de registro de usuario con datos de perfil incluidos. */
export const registerSchema = z.object({
  /** Nombre visible del usuario. */
  name:     z.string().min(1).max(50),
  /** Correo electrónico único. */
  email:    z.string().email().max(50),
  /** Contraseña en texto plano (se hashea en el servidor). */
  password: z.string().min(8).max(72), // bcrypt limita a 72 bytes
  /** Peso en kilogramos. */
  weight:   numeric.positive(),
  /** Edad en años. */
  age:      numeric.int().positive(),
  /** Altura en centímetros. */
  height:   numeric.positive(),
  /** Género: 'M' (Masculino) | 'F' (Femenino). */
  gender:   z.enum(['M', 'F']),
  /** Factor de actividad: 'S' | 'L' | 'A' | 'V'. */
  activityFactor: z.enum(['S', 'L', 'A', 'V']),
  /** Objetivo: 'P' (Perder) | 'M' (Mantener) | 'G' (Ganar). */
  objective: z.enum(['P', 'M', 'G']),
});

/** Body de login. */
export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Food_item
// ---------------------------------------------------------------------------

/**
 * Body para crear un alimento.
 * food_id es generado automáticamente por la BD (SERIAL), no se recibe del cliente.
 */
export const createFoodSchema = z.object({
  name:     z.string().min(1).max(100),
  protein:  numeric.min(0).default(0),
  calories: numeric.min(0).default(0),
  carbs:    numeric.min(0).default(0),
  fat:      numeric.min(0).default(0),
  source:   z.string().min(1),
});

// ---------------------------------------------------------------------------
// Meal
// ---------------------------------------------------------------------------

/**
 * Body para crear una comida con sus alimentos opcionales.
 * meal_id es generado automáticamente por la BD (SERIAL), no se recibe del cliente.
 */
export const createMealSchema = z.object({
  name:     z.string().min(1).max(100),
  calories: numeric.min(0).default(0),
  protein:  numeric.min(0).default(0),
  fat:      numeric.min(0).default(0),
  carbs:    numeric.min(0).default(0),
  img:      z.string().nullish(),
  source:   z.string().nullish(),
  /** IDs de los alimentos que componen la comida. */
  foodIds:  z.array(numeric.int().positive()).default([]),
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * Body para crear/actualizar un perfil.
 * BMR y TDEE son opcionales: si se omiten el controlador los calcula
 * automáticamente con la ecuación de Mifflin-St Jeor.
 */
export const createProfileSchema = z.object({
  user_id:        numeric.int().positive(),
  weight:         numeric.positive(),
  age:            numeric.int().positive(),
  height:         numeric.positive(),
  gender:         z.enum(['M', 'F']),
  activityFactor: z.enum(['S', 'L', 'A', 'V']),
  objective:      z.enum(['P', 'M', 'G']),
  basalMetabolicRate:          numeric.min(0).optional(),
  totalDailyEnergyExpenditure: numeric.min(0).optional(),
});

/** Body para asignar una comida a un perfil. */
export const assignMealSchema = z.object({
  mealId: numeric.int().positive(),
});

// ---------------------------------------------------------------------------
// Tipos inferidos (para usar en los controladores con tipado fuerte)
// ---------------------------------------------------------------------------

export type RegisterInput      = z.infer<typeof registerSchema>;
export type LoginInput         = z.infer<typeof loginSchema>;
export type CreateFoodInput    = z.infer<typeof createFoodSchema>;
export type CreateMealInput    = z.infer<typeof createMealSchema>;
export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type AssignMealInput    = z.infer<typeof assignMealSchema>;
export type PaginationInput    = z.infer<typeof paginationSchema>;
