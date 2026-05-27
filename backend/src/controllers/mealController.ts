/**
 * @file Controladores para los endpoints de comidas (Meal).
 * Incluye la proyección de 100 días con la lógica determinista de DARIO
 * (combos fijos) y la lógica de simulación de ELI (cálculo de balance y
 * peso proyectado día a día).
 *
 * Los IDs son generados por SERIAL; el cliente no los provee en la creación.
 */

import { Request, Response } from 'express';
import * as mealModel from '../models/mealModel.js';
import * as profileModel from '../models/profileModel.js';
import type { Objective } from '../types/domain.js';
import { HttpError } from '../utils/httpError.js';
import type { CreateMealInput, PaginationInput } from '../validators/schemas.js';

/**
 * GET /api/meals - Lista comidas paginadas.
 *
 * @param {Request} req - Petición con query params { page, limit } validados.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function list(req: Request, res: Response): Promise<void> {
  const { page, limit } = req.query as unknown as PaginationInput;
  const offset = (page - 1) * limit;
  const { data, total } = await mealModel.findAll(limit, offset);
  res.json({
    meals: data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

/**
 * GET /api/meals/:id - Devuelve una comida con sus ingredientes.
 *
 * @param {Request} req - Petición con :id validado.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si no existe.
 */
export async function getById(req: Request, res: Response): Promise<void> {
  const id = (req.params as unknown as { id: number }).id;
  const meal = await mealModel.findByIdWithItems(id);
  if (!meal) {
    throw HttpError.notFound(`No existe la comida ${id}`);
  }
  res.json(meal);
}

/**
 * POST /api/meals - Crea una comida y enlaza sus alimentos. Requiere rol admin.
 * El meal_id es asignado por SERIAL en la BD.
 *
 * @param {Request} req - Petición con la comida validada por Zod.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 */
export async function create(req: Request, res: Response): Promise<void> {
  const { foodIds, img, source, ...rest } = req.body as CreateMealInput;
  const meal = { ...rest, img: img ?? null, source: source ?? null };
  const result = await mealModel.createWithItems(meal, foodIds);
  res.status(201).json(result);
}

// ── Recomendación de menú (proyección 100 días) ──────────────────────────────

/** Kcal por categoría de comida. */
const KCAL: Record<string, number> = { bajo: 250, medio: 500, alto: 750 };

type Cat = 'bajo' | 'medio' | 'alto';

interface Combo {
  desayuno: Cat;
  almuerzo: Cat;
  cena: Cat;
}

/**
 * Combinaciones canónicas de comidas (de menor a mayor total calórico).
 * Uso de combos fijos garantiza determinismo.
 */
const COMBOS: Combo[] = [
  { desayuno: 'bajo',  almuerzo: 'bajo',  cena: 'bajo'  }, // 750 kcal
  { desayuno: 'bajo',  almuerzo: 'medio', cena: 'bajo'  }, // 1000
  { desayuno: 'bajo',  almuerzo: 'alto',  cena: 'bajo'  }, // 1250
  { desayuno: 'bajo',  almuerzo: 'alto',  cena: 'medio' }, // 1500
  { desayuno: 'medio', almuerzo: 'medio', cena: 'medio' }, // 1500
  { desayuno: 'medio', almuerzo: 'alto',  cena: 'bajo'  }, // 1500
  { desayuno: 'medio', almuerzo: 'alto',  cena: 'medio' }, // 1750
  { desayuno: 'medio', almuerzo: 'alto',  cena: 'alto'  }, // 2000
  { desayuno: 'alto',  almuerzo: 'alto',  cena: 'alto'  }, // 2250
];

function comboTotal(c: Combo): number {
  return KCAL[c.desayuno] + KCAL[c.almuerzo] + KCAL[c.cena];
}

function pickCombo(tmb: number, getd: number, objective: Objective): Combo {
  if (objective === 'P') {
    const valid = COMBOS.filter((c) => comboTotal(c) >= tmb && comboTotal(c) < getd);
    if (valid.length > 0) return valid[valid.length - 1];
    const mid = (tmb + getd) / 2;
    return COMBOS.reduce((best, c) =>
      Math.abs(comboTotal(c) - mid) < Math.abs(comboTotal(best) - mid) ? c : best
    );
  }
  if (objective === 'G') {
    const lo = getd * 1.10;
    const hi = getd * 1.15;
    const valid = COMBOS.filter((c) => comboTotal(c) >= lo && comboTotal(c) <= hi);
    if (valid.length > 0) return valid[0];
    const mid = (lo + hi) / 2;
    return COMBOS.reduce((best, c) =>
      Math.abs(comboTotal(c) - mid) < Math.abs(comboTotal(best) - mid) ? c : best
    );
  }
  return COMBOS.reduce((best, c) =>
    Math.abs(comboTotal(c) - getd) < Math.abs(comboTotal(best) - getd) ? c : best
  );
}

const OBJECTIVE_LABEL: Record<Objective, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
};

function toFiniteNumber(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(422, `El perfil tiene un valor numérico inválido en ${field}`);
  }
  return parsed;
}

/**
 * GET /api/meals/recommend - Proyección nutricional de 100 días. Requiere auth.
 *
 * @param {Request} req - Petición autenticada.
 * @param {Response} res - Respuesta.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el usuario no tiene perfil registrado.
 */
export async function recommend(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.sub;

  const profile = await profileModel.findById(userId);
  if (!profile) {
    throw HttpError.notFound('El usuario no tiene perfil registrado');
  }

  const tmb    = toFiniteNumber(profile.basalMetabolicRate,          'basalMetabolicRate');
  const getd   = toFiniteNumber(profile.totalDailyEnergyExpenditure, 'totalDailyEnergyExpenditure');
  const weight = toFiniteNumber(profile.weight,                      'weight');

  const combo        = pickCombo(tmb, getd, profile.objective);
  const dailyKcal    = comboTotal(combo);
  const dailyBalance = dailyKcal - getd;

  const KCAL_POR_KG       = 7700;
  const proyeccion_diaria = [];
  let pesoActual = weight;

  for (let dia = 1; dia <= 100; dia++) {
    pesoActual += dailyBalance / KCAL_POR_KG;
    proyeccion_diaria.push({
      dia,
      calorias_consumidas: dailyKcal,
      balance_energetico:  Math.round(dailyBalance),
      peso_proyectado:     Math.round(pesoActual * 100) / 100,
      recomendacion_menu: {
        desayuno: { categoria: combo.desayuno, kcal: KCAL[combo.desayuno] },
        almuerzo: { categoria: combo.almuerzo, kcal: KCAL[combo.almuerzo] },
        cena:     { categoria: combo.cena,     kcal: KCAL[combo.cena]     },
      },
    });
  }

  res.json({
    datos_biometricos: {
      tmb:  `${tmb} kcal`,
      getd: `${getd} kcal`,
    },
    objetivo_usuario: OBJECTIVE_LABEL[profile.objective],
    proyeccion_diaria,
  });
}
