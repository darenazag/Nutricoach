/**
 * @file Servicio de autenticación: hashing de contraseñas (bcrypt) y
 * emisión/verificación de tokens JWT.
 */

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../types/domain.js';

/** Payload que se incrusta en el JWT. */
export interface JwtPayload {
  /** Id del usuario autenticado (subject). */
  sub: number;
  /** Email del usuario. */
  email: string;
  /** Rol de autorización. */
  role: Role;
}

/**
 * Determina el rol de un usuario a partir de su email.
 * Es admin si coincide con ADMIN_EMAIL (sin distinguir mayúsculas).
 *
 * @param {string} email - Email del usuario.
 * @returns {Role} 'admin' o 'user'.
 */
export function resolveRole(email: string): Role {
  const adminEmail = env.auth.adminEmail;
  if (adminEmail && email.trim().toLowerCase() === adminEmail) {
    return 'admin';
  }
  return 'user';
}

/**
 * Hashea una contraseña en texto plano con bcrypt.
 *
 * @param {string} plain - Contraseña en claro.
 * @returns {Promise<string>} El hash resultante.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.auth.bcryptSaltRounds);
}

/**
 * Compara una contraseña en claro contra su hash bcrypt almacenado.
 * Solo acepta hashes bcrypt válidos ($2b/$2a/$2y). No hay fallback en texto plano.
 *
 * @param {string} plain  - Contraseña introducida por el usuario.
 * @param {string} stored - Hash bcrypt almacenado en la base de datos.
 * @returns {Promise<boolean>} true si coinciden.
 */
export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  // Solo se aceptan hashes bcrypt. Ningún fallback en texto plano.
  return bcrypt.compare(plain, stored);
}

/**
 * Firma un JWT con el payload del usuario.
 *
 * @param {JwtPayload} payload - Datos a incrustar en el token.
 * @returns {string} Token firmado.
 */
export function signToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.auth.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.auth.jwtSecret, options);
}

/**
 * Verifica y decodifica un JWT.
 *
 * @param {string} token - Token a verificar.
 * @returns {JwtPayload} El payload decodificado.
 * @throws {jwt.JsonWebTokenError} Si el token es inválido o ha expirado.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.auth.jwtSecret) as unknown as JwtPayload;
}
