/**
 * @file Controladores de autenticacion: registro y login.
 */

import { Request, Response } from 'express';
import * as userModel from '../models/userModel.js';
import {
  hashPassword,
  resolveRole,
  signToken,
  verifyPassword,
} from '../services/authService.js';
import { HttpError } from '../utils/httpError.js';
import { LoginInput, RegisterInput } from '../validators/schemas.js';

/**
 * POST /api/auth/register - Registra un usuario con la contrasenia hasheada
 * y devuelve un token JWT.
 *
 * @param {Request} req - Peticion con { name, email, password } validados.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 409 si el email ya esta registrado.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body as RegisterInput;

  if (await userModel.existsByEmail(email)) {
    throw HttpError.conflict('El email ya esta registrado');
  }

  const userId = await userModel.nextId();
  const hashed = await hashPassword(password);
  const user = await userModel.create({
    user_id: userId,
    name,
    email,
    password: hashed,
  });

  const token = signToken({
    sub: user.user_id,
    email: user.email,
    role: resolveRole(user.email),
  });
  res.status(201).json({ user, token });
}

/**
 * POST /api/auth/login - Verifica credenciales y devuelve un token JWT.
 *
 * @param {Request} req - Peticion con { email, password } validados.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 401 si las credenciales son invalidas.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new HttpError(401, 'Credenciales invalidas');
  }

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    throw new HttpError(401, 'Credenciales invalidas');
  }

  const token = signToken({
    sub: user.user_id,
    email: user.email,
    role: resolveRole(user.email),
  });
  res.json({
    user: { user_id: user.user_id, name: user.name, email: user.email },
    token,
  });
}

/**
 * GET /api/auth/me - Devuelve el usuario autenticado a partir del token.
 *
 * @param {Request} req - Peticion con `req.auth` poblado por el middleware.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el usuario ya no existe.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.sub;
  const user = await userModel.findById(userId);
  if (!user) {
    throw HttpError.notFound('El usuario ya no existe');
  }
  res.json({ ...user, role: req.auth!.role });
}
