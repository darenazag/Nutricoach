/**
 * @file Controladores para los endpoints de perfiles (Profile).
 * Los datos llegan ya validados y coercionados por Zod.
 */

import { Request, Response } from 'express';
import * as mealModel from '../models/mealModel.js';
import * as profileModel from '../models/profileModel.js';
import { HttpError } from '../utils/httpError.js';
import { MealWithItems } from '../types/domain.js';
import { AssignMealInput, CreateProfileInput } from '../validators/schemas.js';

/**
 * GET /api/profiles - Lista todos los perfiles.
 *
 * @param {Request} _req - Peticion.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(_req: Request, res: Response): Promise<void> {
  const profiles = await profileModel.findAll();
  res.json(profiles);
}

/**
 * GET /api/profiles/:id - Devuelve un perfil por id.
 *
 * @param {Request} req - Peticion con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }
  res.json(profile);
}

/**
 * GET /api/profiles/:id/meals - Comidas asignadas a un perfil con ingredientes.
 *
 * @param {Request} req - Peticion con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el perfil no existe.
 */
export async function getMeals(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }
  const mealIds = await profileModel.findMealIds(id);
  const meals: MealWithItems[] = [];
  for (const mealId of mealIds) {
    const meal = await mealModel.findByIdWithItems(mealId);
    if (meal) {
      meals.push(meal);
    }
  }
  res.json(meals);
}

/**
 * POST /api/profiles - Crea o actualiza un perfil. Requiere auth.
 *
 * @param {Request} req - Peticion con el perfil validado en el body.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateProfileInput;
  // Regla: un usuario normal solo puede crear/modificar su propio perfil.
  // El admin puede operar sobre cualquiera.
  if (req.auth!.role !== 'admin' && input.user_id !== req.auth!.sub) {
    throw new HttpError(403, 'Solo puedes modificar tu propio perfil');
  }
  const profile = await profileModel.create(input);
  res.status(201).json(profile);
}

/**
 * POST /api/profiles/:id/meals - Asigna una comida a un perfil. Requiere auth.
 *
 * @param {Request} req - Peticion con :id validado y { mealId } en el body.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el perfil no existe.
 */
export async function assignMeal(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const { mealId } = req.body as AssignMealInput;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }
  await profileModel.assignMeal(id, mealId);
  res.status(201).json({ message: 'Comida asignada', userId: id, mealId });
}
