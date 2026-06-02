/**
 * @file Carga, valida y expone las variables de entorno de forma tipada.
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Devuelve una variable de entorno obligatoria o lanza un error si falta.
 *
 * @param {string} key - Nombre de la variable.
 * @param {string} [fallback] - Valor por defecto opcional.
 * @returns {string} El valor de la variable.
 * @throws {Error} Si la variable no existe y no hay fallback.
 */
function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
  }
  return value;
}

/**
 * Devuelve una variable opcional.
 *
 * @param {string} key - Nombre de la variable.
 * @param {string} [fallback] - Valor por defecto.
 * @returns {string | undefined} El valor o el fallback.
 */
function optional(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

/** Configuracion centralizada y tipada de la aplicacion. */
export const env = {
  /** Puerto del servidor HTTP. */
  port: Number(optional('PORT', '3000')),
  /** Entorno de ejecucion. */
  nodeEnv: optional('NODE_ENV', 'development') as string,

  /** Configuracion de la base de datos. */
  db: {
    /** URL completa de conexion (tiene prioridad si esta definida). */
    url: optional('DATABASE_URL'),
    host: optional('DB_HOST', 'localhost') as string,
    port: Number(optional('DB_PORT', '5432')),
    user: optional('DB_USER', 'postgres') as string,
    password: optional('DB_PASSWORD', 'postgres') as string,
    database: optional('DB_NAME', 'nutricoach') as string,
  },

  /** Configuracion de Open Food Facts (API principal de alimentos). */
  openFoodFacts: {
    /**
     * User-Agent requerido por Open Food Facts para identificar la app.
     * Formato recomendado: AppName/Version (email de contacto).
     */
    userAgent: optional(
      'OFF_USER_AGENT',
      'NutriCoach/1.0 (contacto@nutricoach.com)'
    ) as string,
  },

  /** Configuracion de TheMealDB (API secundaria de recetas). */
  theMealDb: {
    /** Clave de API. "1" es la clave de desarrollo gratuita. */
    apiKey: optional('THEMEALDB_API_KEY', '1') as string,
  },

  /** Configuracion de autenticacion. */
  auth: {
    /** Secreto para firmar los JWT. */
    jwtSecret: optional('JWT_SECRET', 'dev_insecure_secret_change_me') as string,
    /** Caducidad del token (formato de la libreria jsonwebtoken). */
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '1h') as string,
    /** Rondas de sal para bcrypt. */
    bcryptSaltRounds: Number(optional('BCRYPT_SALT_ROUNDS', '10')),
    /** Email que recibe rol admin (vacio = no hay admin por entorno). */
    adminEmail: optional('ADMIN_EMAIL', '')?.trim().toLowerCase() ?? '',
  },
} as const;

/**
 * Las APIs externas (Open Food Facts y TheMealDB) no requieren credenciales
 * obligatorias: Open Food Facts solo pide un User-Agent (que tiene valor por
 * defecto) y TheMealDB usa la clave de desarrollo "1". Esta funcion se
 * mantiene como punto de extension por si en el futuro se aniaden claves.
 *
 * @returns {void}
 */
export function assertExternalApisConfig(): void {
  if (!env.openFoodFacts.userAgent) {
    throw new Error('Falta OFF_USER_AGENT para Open Food Facts');
  }
}

// Reexporta `required` por si algun modulo necesita una variable estricta.
export { required };

/**
 * Verifica que en produccion el secreto JWT no sea el inseguro por defecto
 * y que CLIENT_URL este definida (evita CORS wildcard).
 *
 * @throws {Error} Si NODE_ENV es production y falta alguna variable critica.
 */
export function assertAuthConfig(): void {
  if (env.nodeEnv !== 'production') return;

  if (!process.env.JWT_SECRET || env.auth.jwtSecret === 'dev_insecure_secret_change_me') {
    throw new Error('JWT_SECRET debe configurarse con un valor seguro en produccion');
  }

  if (!process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL debe configurarse en produccion (evita CORS wildcard)');
  }
}
