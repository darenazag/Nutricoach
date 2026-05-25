/**
 * @file Servicio de autenticacion: hashing de contrasenias (bcrypt) y
 * emision/verificacion de tokens JWT.
 */

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '../types/domain.js';

/** Payload que se incrusta en el JWT. */
export interface JwtPayload {
  /** Id del usuario autenticado (subject). */
  sub: number;
  /** Email del usuario. */
  email: string;
  /** Rol de autorizacion. */
  role: Role;
}

/**
 * Determina el rol de un usuario a partir de su email.
 * Es admin si coincide (sin distinguir mayusculas) con ADMIN_EMAIL.
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
 * Hashea una contrasenia en texto plano.
 *
 * @param {string} plain - Contrasenia en claro.
 * @returns {Promise<string>} El hash resultante.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.auth.bcryptSaltRounds);
}

/**
 * Compara una contrasenia en claro contra su hash.
 * Soporta tambien valores en texto plano heredados del esquema original:
 * si el valor almacenado no parece un hash de bcrypt, se compara directamente.
 *
 * @param {string} plain - Contrasenia introducida.
 * @param {string} stored - Valor almacenado (hash o texto plano heredado).
 * @returns {Promise<boolean>} true si coinciden.
 */
export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  const looksHashed = /^\$2[aby]\$/.test(stored);
  if (looksHashed) {
    return bcrypt.compare(plain, stored);
  }
  // Compatibilidad con contrasenias en texto plano del seed original.
  return plain === stored;
}

/**
 * Firma un JWT para un usuario.
 *
 * @param {JwtPayload} payload - Datos a incrustar.
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
 * @throws {jwt.JsonWebTokenError} Si el token es invalido o ha expirado.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.auth.jwtSecret) as unknown as JwtPayload;
}
