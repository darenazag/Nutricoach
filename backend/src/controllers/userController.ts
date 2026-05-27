/**
 * @file Controladores para los endpoints de usuarios (User).
 * La creación de usuarios se realiza exclusivamente vía /api/auth/register.
 */

import { Request, Response } from 'express';
import * as userModel from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';
import type { PaginationInput } from '../validators/schemas.js';

/**
 * GET /api/users - Lista usuarios paginados (sin contraseña). Requiere rol admin.
 *
 * @param {Request} req - Petición con query params { page, limit } validados.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.query as unknown as PaginationInput;
  const offset = (page - 1) * limit;
  const { data, total } = await userModel.findAll(limit, offset);
  res.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * GET /api/users/:id - Devuelve un usuario por id (sin contraseña). Requiere rol admin.
 *
 * @param {Request} req - Petición con :id ya validado por Zod.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = (req.params as unknown as { id: number }).id;
  const user = await userModel.findById(id);
  if (!user) {
    throw HttpError.notFound(`No existe el usuario ${id}`);
  }
  res.json(user);
}
