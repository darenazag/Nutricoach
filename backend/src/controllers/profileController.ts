/**
 * @file Controladores para los endpoints de perfiles (Profile).
 * Los datos llegan ya validados y coercionados por Zod.
 * El BMR y TDEE se calculan automáticamente si no se proporcionan.
 */

import { Request, Response } from 'express';
import * as mealModel from '../models/mealModel.js';
import * as profileModel from '../models/profileModel.js';
import type { MealWithItems, Profile } from '../types/domain.js';
import { HttpError } from '../utils/httpError.js';
import { calculateMetabolism } from '../utils/metabolism.js';
import type {
  AssignMealInput,
  CreateProfileInput,
  PaginationInput,
} from '../validators/schemas.js';

/** Iniciales de los días en español (domingo = 0). */
const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;

/**
 * Calcula la racha de días consecutivos a partir de un array de fechas ISO
 * (YYYY-MM-DD) en orden descendente. La racha es válida si incluye hoy o ayer.
 *
 * @param {string[]} dates    - Fechas distintas en orden descendente.
 * @param {Date}     todayUtc - Fecha de hoy (UTC, medianoche).
 * @returns {number} Número de días consecutivos.
 */
function calcStreak(dates: string[], todayUtc: Date): number {
  if (dates.length === 0) return 0;

  const yesterdayUtc = new Date(todayUtc.getTime() - 86_400_000);

  // Comprobar si el último día activo fue hoy o ayer
  const mostRecent = new Date(`${dates[0]}T00:00:00Z`);
  const diffDays = Math.round(
    (todayUtc.getTime() - mostRecent.getTime()) / 86_400_000
  );
  if (diffDays > 1) return 0; // La racha está rota

  // Contar días consecutivos hacia atrás desde el más reciente
  let streak = 0;
  let expected = diffDays === 0 ? todayUtc : yesterdayUtc;

  for (const dateStr of dates) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    if (d.getTime() === expected.getTime()) {
      streak++;
      expected = new Date(expected.getTime() - 86_400_000);
    } else {
      break;
    }
  }
  return streak;
}

// ── CRUD canónico (/api/profiles) ───────────────────────────────────────────

/**
 * GET /api/profiles - Lista todos los perfiles. Requiere rol admin.
 *
 * @param {Request} req - Petición con query params { page, limit } validados.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.query as unknown as PaginationInput;
  const offset = (page - 1) * limit;
  const { data, total } = await profileModel.findAll(limit, offset);
  res.json({
    data,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}

/**
 * GET /api/profiles/:id - Devuelve un perfil por id. Requiere auth (propio o admin).
 *
 * @param {Request} req - Petición con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = (req.params as unknown as { id: number }).id;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }
  res.json(profile);
}

/**
 * GET /api/profiles/:id/meals - Comidas asignadas con ingredientes. Requiere auth.
 *
 * @param {Request} req - Petición con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el perfil no existe.
 */
export async function getMeals(req: Request, res: Response): Promise<void> {
  const id = (req.params as unknown as { id: number }).id;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }
  const mealIds = await profileModel.findMealIds(id);
  const meals: MealWithItems[] = [];
  for (const mealId of mealIds) {
    const meal = await mealModel.findByIdWithItems(mealId);
    if (meal) meals.push(meal);
  }
  res.json(meals);
}

/**
 * POST /api/profiles - Crea o actualiza un perfil. Requiere auth.
 * Solo el admin puede modificar perfiles ajenos.
 *
 * @param {Request} req - Petición con el perfil validado en el body.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 403 si un usuario normal intenta modificar un perfil ajeno.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const input = req.body as CreateProfileInput;
  if (req.auth!.role !== 'admin' && input.user_id !== req.auth!.sub) {
    throw new HttpError(403, 'Solo puedes modificar tu propio perfil');
  }

  const { bmr, tdee } = calculateMetabolism(
    input.weight, input.height, input.age, input.gender, input.activityFactor
  );

  const profile: Profile = {
    ...input,
    basalMetabolicRate:          input.basalMetabolicRate          ?? bmr,
    totalDailyEnergyExpenditure: input.totalDailyEnergyExpenditure ?? tdee,
  };

  const saved = await profileModel.create(profile);
  res.status(201).json(saved);
}

/**
 * POST /api/profiles/:id/meals - Asigna una comida a un perfil.
 * Requiere auth (propio o admin).
 *
 * @param {Request} req - Petición con :id validado y { mealId } en el body.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el perfil no existe.
 */
export async function assignMeal(req: Request, res: Response): Promise<void> {
  const id = (req.params as unknown as { id: number }).id;
  const { mealId } = req.body as AssignMealInput;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound(`No existe el perfil ${id}`);
  }
  await profileModel.assignMeal(id, mealId);
  res.status(201).json({ message: 'Comida asignada', userId: id, mealId });
}

// ── Alias de compatibilidad con el frontend (rutas /api/profile) ─────────────

/**
 * GET /api/profile - Devuelve el perfil del usuario autenticado.
 *
 * @param {Request} req - Petición autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el usuario no tiene perfil.
 */
export async function getMine(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound('El usuario no tiene perfil registrado');
  }
  res.json({ profile });
}

/**
 * POST /api/profile - Crea o actualiza el perfil del usuario autenticado.
 * El user_id se toma del JWT, no del body.
 *
 * @param {Request} req - Petición autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function createMine(req: Request, res: Response): Promise<void> {
  const input = req.body as Omit<CreateProfileInput, 'user_id'>;
  const { bmr, tdee } = calculateMetabolism(
    input.weight, input.height, input.age, input.gender, input.activityFactor
  );
  const profile: Profile = {
    ...input,
    user_id:                     req.auth!.sub,
    basalMetabolicRate:          input.basalMetabolicRate          ?? bmr,
    totalDailyEnergyExpenditure: input.totalDailyEnergyExpenditure ?? tdee,
  };
  const saved = await profileModel.create(profile);
  res.status(201).json({ profile: saved });
}

/**
 * GET /api/meals/profile/mine - Comidas del usuario autenticado con ingredientes.
 *
 * @param {Request} req - Petición autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el usuario no tiene perfil.
 */
export async function getMyMeals(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound('El usuario no tiene perfil registrado');
  }
  const mealIds = await profileModel.findMealIds(id);
  const meals: MealWithItems[] = [];
  for (const mealId of mealIds) {
    const meal = await mealModel.findByIdWithItems(mealId);
    if (meal) meals.push(meal);
  }
  res.json({ meals });
}

/**
 * POST /api/meals/profile/assign - Asigna una comida al usuario autenticado.
 *
 * @param {Request} req - Petición autenticada con { mealId } en el body.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el usuario no tiene perfil.
 */
export async function assignMealToMe(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;
  const { mealId } = req.body as AssignMealInput;
  const profile = await profileModel.findById(id);
  if (!profile) {
    throw HttpError.notFound('El usuario no tiene perfil registrado');
  }
  await profileModel.assignMeal(id, mealId);
  res.status(201).json({ message: 'Comida asignada', userId: id, mealId });
}

/**
 * GET /api/profile/streak - Racha semanal del usuario autenticado.
 * Calcula la racha real de días consecutivos en que se asignaron comidas.
 *
 * @param {Request} req - Petición autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function getMyStreak(req: Request, res: Response): Promise<void> {
  const id = req.auth!.sub;

  // Fechas distintas en que el usuario asignó comidas (desc)
  const dates = await profileModel.findMealDates(id);

  // Fecha de hoy a medianoche UTC
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const streak = calcStreak(dates, todayUtc);
  const mealCount = await profileModel.countMeals(id);
  const dateSet = new Set(dates);

  // Historial de los últimos 7 días
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayUtc.getTime() - (6 - i) * 86_400_000);
    const dateStr = d.toISOString().split('T')[0] as string;
    return {
      label: DAY_LABELS[d.getUTCDay()],
      date:  dateStr,
      done:  dateSet.has(dateStr),
    };
  });

  res.json({ streak, mealCount, history });
}
