/**
 * @file Tipos del dominio que reflejan el esquema de la base de datos.
 * Los códigos de un solo carácter respetan el tipo `"char"` de PostgreSQL.
 */

/** Género del perfil: 'M' (Masculino) | 'F' (Femenino). */
export type Gender = 'M' | 'F';

/** Rol de autorización del usuario. */
export type Role = 'user' | 'admin';

/**
 * Factor de actividad física.
 * 'S' = Sedentario, 'L' = Ligero, 'A' = Activo (moderado), 'V' = Muy activo.
 */
export type ActivityFactor = 'S' | 'L' | 'A' | 'V';

/**
 * Objetivo nutricional.
 * 'P' = Perder peso, 'M' = Mantener peso, 'G' = Ganar masa muscular.
 */
export type Objective = 'P' | 'M' | 'G';

/**
 * Usuario con credenciales.
 * Corresponde a la tabla `public."User"`.
 */
export interface User {
  /** Identificador generado por SERIAL (PK). */
  user_id: number;
  /** Nombre visible. */
  name: string;
  /** Contraseña almacenada hasheada con bcrypt. */
  password: string;
  /** Correo electrónico único. */
  email: string;
}

/** Usuario expuesto en respuestas API, sin la contraseña. */
export type SafeUser = Omit<User, 'password'>;

/**
 * Perfil fisiológico de un usuario.
 * Corresponde a la tabla `public."Profile"`.
 */
export interface Profile {
  /** Identificador del usuario (PK y FK → User). */
  user_id: number;
  /** Peso en kilogramos. */
  weight: number;
  /** Edad en años. */
  age: number;
  /** Altura en centímetros. */
  height: number;
  /** Género ('M' | 'F'). */
  gender: Gender;
  /** Factor de actividad ('S' | 'L' | 'A' | 'V'). */
  activityFactor: ActivityFactor;
  /** Objetivo ('P' | 'M' | 'G'). */
  objective: Objective;
  /** Tasa Metabólica Basal en kcal (calculada automáticamente). */
  basalMetabolicRate: number;
  /** Gasto Energético Total Diario en kcal (calculado automáticamente). */
  totalDailyEnergyExpenditure: number;
}

/**
 * Comida o plato preparado con sus macros totales.
 * Corresponde a la tabla `public."Meal"`.
 */
export interface Meal {
  /** Identificador generado por SERIAL (PK). */
  meal_id: number;
  /** Nombre del plato. */
  name: string;
  /** Calorías totales (kcal). */
  calories: number;
  /** Proteína total (g). */
  protein: number;
  /** Grasa total (g). */
  fat: number;
  /** Carbohidratos totales (g). */
  carbs: number;
  /** Ruta o URL de la imagen (opcional). */
  img: string | null;
  /** Fuente o descripción (opcional). */
  source: string | null;
}

/**
 * Alimento individual por porción estándar (ej. 100 g).
 * Corresponde a la tabla `public."Food_item"`.
 */
export interface FoodItem {
  /** Identificador generado por SERIAL (PK). */
  food_id: number;
  /** Nombre del alimento para mostrar. */
  name: string;
  /** Proteína (g). */
  protein: number;
  /** Calorías (kcal). */
  calories: number;
  /** Carbohidratos (g). */
  carbs: number;
  /** Grasa (g). */
  fat: number;
  /** Fuente u origen del dato nutricional. */
  source: string;
}

/** Comida con la lista de alimentos que la componen. */
export interface MealWithItems extends Meal {
  items: FoodItem[];
}

/** Respuesta paginada genérica. */
export interface Paginated<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
