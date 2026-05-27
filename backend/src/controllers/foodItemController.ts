/**
 * @file Controladores para los endpoints de alimentos (Food_item).
 * Los datos llegan ya validados y coercionados por Zod.
 * Los IDs son generados por SERIAL; el cliente no los provee en la creación.
 */

import { Request, Response } from 'express';
import * as foodItemModel from '../models/foodItemModel.js';
import { HttpError } from '../utils/httpError.js';
import type { CreateFoodInput, PaginationInput } from '../validators/schemas.js';

/**
 * GET /api/foods - Lista alimentos paginados.
 *
 * @param {Request} req - Petición con query params { page, limit } validados.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.query as unknown as PaginationInput;
  const offset = (page - 1) * limit;
  const { data, total } = await foodItemModel.findAll(limit, offset);
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
 * GET /api/foods/:id - Devuelve un alimento por id.
 *
 * @param {Request} req - Petición con :id validado por Zod.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = (req.params as unknown as { id: number }).id;
  const food = await foodItemModel.findById(id);
  if (!food) {
    throw HttpError.notFound(`No existe el alimento ${id}`);
  }
  res.json(food);
}

/**
 * POST /api/foods - Crea un alimento. Requiere rol admin.
 * El food_id es asignado por SERIAL en la BD.
 *
 * @param {Request} req - Petición con el alimento validado en el body.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateFoodInput;
  const food = await foodItemModel.create(input);
  res.status(201).json(food);
}

/**
 * DELETE /api/foods/:id - Elimina un alimento. Requiere rol admin.
 *
 * @param {Request} req - Petición con :id validado.
 * @param {Response} res - Respuesta 204 sin cuerpo.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = (req.params as unknown as { id: number }).id;
  const deleted = await foodItemModel.remove(id);
  if (!deleted) {
    throw HttpError.notFound(`No existe el alimento ${id}`);
  }
  res.status(204).send();
}
