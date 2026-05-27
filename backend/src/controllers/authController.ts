/**
 * @file Controladores de autenticación: registro (con cálculo metabólico
 * automático) y login.
 *
 * El user_id es generado por SERIAL en la BD, eliminando la condición de
 * carrera que existía con el patrón MAX()+1.
 */

import { Request, Response } from 'express';
import { withTransaction } from '../config/db.js';

import * as userModel from '../models/userModel.js';
import {
  hashPassword,
  resolveRole,
  signToken,
  verifyPassword,
} from '../services/authService.js';
import type { Profile, SafeUser, User } from '../types/domain.js';
import { HttpError } from '../utils/httpError.js';
import { calculateMetabolism } from '../utils/metabolism.js';
import type { LoginInput, RegisterInput } from '../validators/schemas.js';

/**
 * POST /api/auth/register
 *
 * Registra un nuevo usuario con su perfil fisiológico en una sola transacción:
 * 1. Valida que el email no esté en uso.
 * 2. Calcula BMR y TDEE automáticamente (Mifflin-St Jeor).
 * 3. Inserta el User (SERIAL genera el id) y el Profile atómicamente.
 * 4. Devuelve el usuario creado y un JWT.
 *
 * @param {Request} req - Petición con los campos de RegisterInput validados.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 409 si el email ya está registrado.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const {
    name, email, password,
    weight, age, height, gender, activityFactor, objective,
  } = req.body as RegisterInput;

  if (await userModel.existsByEmail(email)) {
    throw HttpError.conflict('El email ya está registrado');
  }

  const hashed = await hashPassword(password);

  // Calcular BMR y TDEE con la ecuación de Mifflin-St Jeor
  const { bmr, tdee } = calculateMetabolism(weight, height, age, gender, activityFactor);

  // Insertar User y Profile en una transacción atómica.
  // El user_id es generado por SERIAL; se obtiene del RETURNING.
  const { safeUser, profile } = await withTransaction(async (client) => {
    // 1. Crear el User; SERIAL asigna user_id
    const userResult = await client.query<SafeUser>(
      `INSERT INTO public."User" (name, password, email)
       VALUES ($1, $2, $3)
       RETURNING user_id, name, email`,
      [name, hashed, email]
    );
    const createdUser = userResult.rows[0];
    const userId = createdUser.user_id;

    // 2. Crear el Profile con el user_id recién generado
    const profileResult = await client.query<Profile>(
      `INSERT INTO public."Profile"
         (user_id, weight, age, height, gender, "activityFactor", "objective",
          "basalMetabolicRate", "totalDailyEnergyExpenditure")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING
         user_id, weight, age, height, gender,
         "activityFactor"              AS "activityFactor",
         "objective"                   AS "objective",
         "basalMetabolicRate"          AS "basalMetabolicRate",
         "totalDailyEnergyExpenditure" AS "totalDailyEnergyExpenditure"`,
      [userId, weight, age, height, gender, activityFactor, objective, bmr, tdee]
    );

    return { safeUser: createdUser, profile: profileResult.rows[0] };
  });

  const token = signToken({
    sub:   safeUser.user_id,
    email: safeUser.email,
    role:  resolveRole(safeUser.email),
  });

  res.status(201).json({ user: safeUser, profile, token });
}

/**
 * POST /api/auth/login
 *
 * Verifica credenciales y devuelve un JWT.
 *
 * @param {Request} req - Petición con { email, password } validados por Zod.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 401 si las credenciales son inválidas.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginInput;

  const user = await userModel.findByEmail(email) as (User | null);
  if (!user) {
    throw new HttpError(401, 'Credenciales inválidas');
  }

  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    throw new HttpError(401, 'Credenciales inválidas');
  }

  const token = signToken({
    sub:   user.user_id,
    email: user.email,
    role:  resolveRole(user.email),
  });

  res.json({
    user:  { user_id: user.user_id, name: user.name, email: user.email },
    token,
  });
}

/**
 * GET /api/auth/me
 *
 * Devuelve el usuario autenticado a partir del token JWT.
 *
 * @param {Request} req - Petición con `req.auth` poblado por el middleware.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el usuario ya no existe en la BD.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.sub;
  const user = await userModel.findById(userId);
  if (!user) {
    throw HttpError.notFound('El usuario ya no existe');
  }
  res.json({ ...user, role: req.auth!.role });
}
