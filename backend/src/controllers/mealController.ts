/**
 * @file Controladores para los endpoints de comidas (Meal).
 * Los datos llegan ya validados y coercionados por Zod.
 */

import { Request, Response } from 'express';
import * as mealModel from '../models/mealModel.js';
import { HttpError } from '../utils/httpError.js';
import { CreateMealInput } from '../validators/schemas.js';

/**
 * GET /api/meals - Lista todas las comidas.
 *
 * @param {Request} _req - Peticion.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(_req: Request, res: Response): Promise<void> {
  const meals = await mealModel.findAll();
  res.json(meals);
}

/**
 * GET /api/meals/:id - Devuelve una comida con sus ingredientes.
 *
 * @param {Request} req - Peticion con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const meal = await mealModel.findByIdWithItems(id);
  if (!meal) {
    throw HttpError.notFound(`No existe la comida ${id}`);
  }
  res.json(meal);
}

/**
 * POST /api/meals - Crea una comida y enlaza sus alimentos. Requiere auth.
 *
 * @param {Request} req - Peticion con la comida validada (incluye foodIds).
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function create(req: Request, res: Response): Promise<void> {
  const { foodIds, img, source, ...rest } = req.body as CreateMealInput;
  const meal = {
    ...rest,
    img: img ?? null,
    source: source ?? null,
  };
  const result = await mealModel.createWithItems(meal, foodIds);
  res.status(201).json(result);
}
