/**
 * @file Carga, valida y expone las variables de entorno de forma tipada.
 * Se llama una única vez al arrancar el servidor.
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Devuelve una variable de entorno opcional con fallback.
 *
 * @param {string} key - Nombre de la variable.
 * @param {string} [fallback] - Valor por defecto.
 * @returns {string | undefined} El valor o el fallback.
 */
function optional(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

/** Configuración centralizada y tipada de la aplicación. */
export const env = {
  /** Puerto del servidor HTTP. */
  port: Number(optional('PORT', '3000')),
  /** Entorno de ejecución. */
  nodeEnv: optional('NODE_ENV', 'development') as string,

  /** Configuración de la base de datos. */
  db: {
    /** URL completa de conexión (tiene prioridad si está definida). */
    url: optional('DATABASE_URL'),
    host:     optional('DB_HOST', 'localhost') as string,
    port:     Number(optional('DB_PORT', '5432')),
    user:     optional('DB_USER', 'postgres') as string,
    password: optional('DB_PASSWORD', 'postgres') as string,
    database: optional('DB_NAME', 'nutricoach_db') as string,
  },

  /**
   * Configuración de Open Food Facts.
   * No requiere clave; solo pide un User-Agent para identificar la app.
   */
  openFoodFacts: {
    userAgent: optional(
      'OFF_USER_AGENT',
      'NutriCoach/1.0 (contacto@nutricoach.com)'
    ) as string,
  },

  /** Configuración de TheMealDB. "1" es la clave de desarrollo gratuita. */
  theMealDb: {
    apiKey: optional('THEMEALDB_API_KEY', '1') as string,
  },

  /** Configuración de autenticación JWT y bcrypt. */
  auth: {
    jwtSecret: optional('JWT_SECRET', 'dev_insecure_secret_change_me') as string,
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '1h') as string,
    bcryptSaltRounds: Number(optional('BCRYPT_SALT_ROUNDS', '10')),
    adminEmail: optional('ADMIN_EMAIL', '')?.trim().toLowerCase() ?? '',
  },

  /**
   * Orígenes permitidos para CORS.
   * Separados por coma. En desarrollo acepta localhost por defecto.
   */
  allowedOrigins: optional(
    'ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:5173,http://localhost:4173'
  )!
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
} as const;

/** Valores de JWT_SECRET que se consideran inseguros. */
const INSECURE_SECRETS = new Set([
  'dev_insecure_secret_change_me',
  'cambia_esto_por_un_secreto_largo_y_aleatorio',
  'cambia_esto_en_produccion',
]);

/**
 * Verifica que la configuración de autenticación sea segura.
 * En producción lanza si el secreto es el por defecto o demasiado corto.
 * En desarrollo emite advertencias.
 *
 * @throws {Error} Si en producción el secreto es inseguro.
 * @returns {void}
 */
export function assertAuthConfig(): void {
  const secret = env.auth.jwtSecret;
  const isProduction = env.nodeEnv === 'production';

  if (INSECURE_SECRETS.has(secret)) {
    const msg = 'JWT_SECRET usa un valor inseguro por defecto. Genera uno con: openssl rand -base64 64';
    if (isProduction) throw new Error(msg);
    console.warn(`[config] ⚠️  ${msg}`);
  }

  if (secret.length < 32) {
    const msg = `JWT_SECRET demasiado corto (${secret.length} chars). Mínimo recomendado: 32.`;
    if (isProduction) throw new Error(msg);
    console.warn(`[config] ⚠️  ${msg}`);
  }

  if (!env.auth.adminEmail) {
    console.warn('[config] ⚠️  ADMIN_EMAIL no configurado: ningún usuario tendrá rol admin.');
  }
}
