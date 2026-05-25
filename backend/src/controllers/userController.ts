/**
 * @file Controladores para los endpoints de usuarios (User).
 * La creacion de usuarios se realiza via /api/auth/register.
 */

import { Request, Response } from 'express';
import * as userModel from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';

/**
 * GET /api/users - Lista usuarios (sin password). Requiere autenticacion.
 *
 * @param {Request} _req - Peticion.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(_req: Request, res: Response): Promise<void> {
  const users = await userModel.findAll();
  res.json(users);
}

/**
 * GET /api/users/:id - Devuelve un usuario por id (sin password).
 *
 * @param {Request} req - Peticion con :id ya validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const user = await userModel.findById(id);
  if (!user) {
    throw HttpError.notFound(`No existe el usuario ${id}`);
  }
  res.json(user);
}
