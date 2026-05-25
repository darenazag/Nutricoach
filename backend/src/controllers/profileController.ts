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

/**
 * GET /api/profile - Devuelve el perfil del usuario autenticado.
 *
 * Alias de compatibilidad para el frontend, usando req.auth.sub.
 *
 * @param {Request} req - Peticion autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function getMine(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }
  res.json({ profile });
}

/**
 * POST /api/profile - Crea o actualiza el perfil del usuario autenticado.
 *
 * Alias de compatibilidad para el frontend. El user_id se toma del JWT,
 * no del body.
 *
 * @param {Request} req - Peticion autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function createMine(req: Request, res: Response): Promise<void> {
  const input = {
    ...(req.body as Omit<CreateProfileInput, 'user_id'>),
    user_id: req.auth!.sub,
  } as CreateProfileInput;

  const profile = await profileModel.create(input);
  res.status(201).json({ profile });
}

/**
 * GET /api/meals/profile/mine - Devuelve las comidas del usuario autenticado.
 *
 * Alias de compatibilidad para el frontend, usando req.auth.sub.
 *
 * @param {Request} req - Peticion autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function getMyMeals(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;
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

  res.json({ meals });
}

/**
 * POST /api/meals/profile/assign - Asigna una comida al usuario autenticado.
 *
 * Alias de compatibilidad para el frontend. `mealType` se acepta pero se ignora
 * de momento porque la tabla puente actual no tiene columna para tipo de comida.
 *
 * @param {Request} req - Peticion autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function assignMealToMe(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;
  const { mealId } = req.body as AssignMealInput;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }

  await profileModel.assignMeal(id, mealId);
  res.status(201).json({ message: 'Comida asignada', userId: id, mealId });
}

/**
 * GET /api/profile/streak - Devuelve una racha mínima para el dashboard.
 *
 * Implementación MVP: calcula si el usuario tiene comidas asignadas y devuelve
 * una estructura compatible con el frontend. La racha real por días requiere
 * añadir timestamps a Profile_Meal.
 *
 * @param {Request} req - Peticion autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function getMyStreak(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;
  const mealIds = await profileModel.findMealIds(id);
  const hasMeals = mealIds.length > 0;

  res.json({
    streak: hasMeals ? 1 : 0,
    mealCount: mealIds.length,
    history: [
      { label: 'L', done: hasMeals },
      { label: 'M', done: false },
      { label: 'M', done: false },
      { label: 'J', done: false },
      { label: 'V', done: false },
      { label: 'S', done: false },
      { label: 'D', done: false },
    ],
  });
}
