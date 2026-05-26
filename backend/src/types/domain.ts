/**
 * @file Tipos del dominio que reflejan el esquema de la base de datos.
 * Los codigos de un solo caracter respetan el tipo `"char"` de PostgreSQL.
 */

/** Genero del perfil: 'M' (Masculino) | 'F' (Femenino). */
export type Gender = 'M' | 'F';

/** Rol de autorizacion del usuario. */
export type Role = 'user' | 'admin';

/**
 * Factor de actividad fisica.
 * 'S' = Sedentario, 'A' = Activo, 'M' = Muy activo.
 */
export type ActivityFactor = 'S' | 'A' | 'M';

/**
 * Objetivo nutricional.
 * 'P' = Perder, 'M' = Mantener, 'G' = Ganar.
 */
export type Objective = 'P' | 'M' | 'G';

/**
 * Perfil fisiologico de un usuario.
 * Corresponde a la tabla `public."Profile"`.
 */
export interface Profile {
  /** Identificador del usuario (PK). */
  user_id: number;
  /** Peso en kilogramos. */
  weight: number;
  /** Edad en anios. */
  age: number;
  /** Altura en centimetros. */
  height: number;
  /** Genero ('M' | 'F'). */
  gender: Gender;
  /** Factor de actividad ('S' | 'A'). */
  activityFactor: ActivityFactor;
  /** Objetivo ('P' | 'M' | 'G'). */
  objective: Objective;
  /** Tasa metabolica basal (kcal). */
  basalMetabolicRate: number;
  /** Gasto energetico diario total (kcal). */
  totalDailyEnergyExpenditure: number;
}

/** Datos necesarios para crear un perfil (sin valores calculados opcionales). */
export type ProfileInput = Omit<
  Profile,
  'basalMetabolicRate' | 'totalDailyEnergyExpenditure'
> & {
  basalMetabolicRate?: number;
  totalDailyEnergyExpenditure?: number;
};

/**
 * Usuario con credenciales.
 * Corresponde a la tabla `public."User"`.
 */
export interface User {
  /** Identificador (PK y FK hacia Profile). */
  user_id: number;
  /** Nombre visible. */
  name: string;
  /** Contrasenia. En produccion deberia almacenarse hasheada. */
  password: string;
  /** Correo electronico. */
  email: string;
}

/** Usuario expuesto en respuestas, sin la contrasenia. */
export type SafeUser = Omit<User, 'password'>;

/**
 * Comida o plato preparado con macros totales.
 * Corresponde a la tabla `public."Meal"`.
 */
export interface Meal {
  /** Identificador (PK). */
  meal_id: number;
  /** Nombre del plato. */
  name: string;
  /** Calorias totales (kcal). */
  calories: number;
  /** Proteina total (g). */
  protein: number;
  /** Grasa total (g). */
  fat: number;
  /** Carbohidratos totales (g). */
  carbs: number;
  /** Ruta o URL de la imagen (opcional). */
  img: string | null;
  /** Fuente o descripcion (opcional). */
  source: string | null;
}

/**
 * Alimento individual por porcion estandar (ej. 100 g).
 * Corresponde a la tabla `public."Food_item"`.
 */
export interface FoodItem {
  /** Identificador (PK). */
  food_id: number;
  /** Proteina (g). */
  protein: number;
  /** Calorias (kcal). */
  calories: number;
  /** Carbohidratos (g). */
  carbs: number;
  /** Grasa (g). */
  fat: number;
  /** Nombre / fuente del alimento. */
  source: string;
}

/** Relacion N:M entre Meal y Food_item. */
export interface MealFoodItem {
  Meal_meal_id: number;
  Food_item_food_id: number;
}

/** Relacion N:M entre Profile y Meal. */
export interface ProfileMeal {
  Profile_user_id: number;
  Meal_meal_id: number;
}

/** Comida con la lista de alimentos que la componen. */
export interface MealWithItems extends Meal {
  items: FoodItem[];
}


/**
 * Proyección de un día en la simulación Monte Carlo.
 */
export interface DiaProyeccion {
  /** Número de día (1 a 100) */
  dia: number;
  /** Calorías consumidas ese día (con variación ±50 kcal) */
  calorias_consumidas: number;
  /** Balance energético (calorías_consumidas - GETD) */
  balance_energetico: number;
  /** Peso proyectado al final del día (kg) */
  peso_proyectado: number;
  /** Menú recomendado para ese día (categorías calóricas) */
  recomendacion_menu: {
    desayuno: { categoria: string; kcal: number };
    almuerzo: { categoria: string; kcal: number };
    cena: { categoria: string; kcal: number };
  };
}
