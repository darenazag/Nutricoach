/**
 * @file Controladores para los endpoints de alimentos (Food_item).
 * Los datos llegan ya validados y coercionados por Zod.
 */

import { Request, Response } from 'express';
import * as foodItemModel from '../models/foodItemModel.js';
import { HttpError } from '../utils/httpError.js';
import { CreateFoodInput } from '../validators/schemas.js';

/**
 * GET /api/foods - Lista todos los alimentos.
 *
 * @param {Request} _req - Peticion.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(_req: Request, res: Response): Promise<void> {
  const foods = await foodItemModel.findAll();
  res.json(foods);
}

/**
 * GET /api/foods/:id - Devuelve un alimento por id.
 *
 * @param {Request} req - Peticion con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const food = await foodItemModel.findById(id);
  if (!food) {
    throw HttpError.notFound(`No existe el alimento ${id}`);
  }
  res.json(food);
}

/**
 * POST /api/foods - Crea un alimento. Requiere autenticacion.
 *
 * @param {Request} req - Peticion con el alimento validado en el body.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateFoodInput;
  const food = await foodItemModel.create(input);
  res.status(201).json(food);
}

/**
 * DELETE /api/foods/:id - Elimina un alimento. Requiere autenticacion.
 *
 * @param {Request} req - Peticion con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const deleted = await foodItemModel.remove(id);
  if (!deleted) {
    throw HttpError.notFound(`No existe el alimento ${id}`);
  }
  res.status(204).send();
}
