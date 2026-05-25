/**
 * @file Controladores para los endpoints de comidas (Meal).
 * Los datos llegan ya validados y coercionados por Zod.
 */

import { Request, Response } from 'express';
import * as mealModel from '../models/mealModel.js';
import * as profileModel from '../models/profileModel.js';
import { HttpError } from '../utils/httpError.js';
import { CreateMealInput } from '../validators/schemas.js';
import type { Objective } from '../types/domain.js';

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

// ── Recomendacion de menú ────────────────────────────────────────────────────

/** Kcal por categoria de comida. */
const KCAL: Record<string, number> = { bajo: 250, medio: 500, alto: 750 };

type Cat = 'bajo' | 'medio' | 'alto';

interface Combo { desayuno: Cat; almuerzo: Cat; cena: Cat }

/** Todas las combinaciones ordenadas de menor a mayor total. */
const COMBOS: Combo[] = [
  { desayuno: 'bajo',  almuerzo: 'bajo',  cena: 'bajo'  }, // 750
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

/** Elige el mejor combo según el objetivo nutricional. */
function pickCombo(tmb: number, getd: number, objective: Objective): Combo {
  if (objective === 'P') {
    // Máximo que sea >= TMB y < GETD
    const valid = COMBOS.filter(c => comboTotal(c) >= tmb && comboTotal(c) < getd);
    if (valid.length > 0) return valid[valid.length - 1];
    // Fallback: más cercano al punto medio TMB–GETD
    const mid = (tmb + getd) / 2;
    return COMBOS.reduce((best, c) =>
      Math.abs(comboTotal(c) - mid) < Math.abs(comboTotal(best) - mid) ? c : best
    );
  }

  if (objective === 'G') {
    const lo = getd * 1.10;
    const hi = getd * 1.15;
    const valid = COMBOS.filter(c => comboTotal(c) >= lo && comboTotal(c) <= hi);
    if (valid.length > 0) return valid[0];
    // Fallback: más cercano al centro de la banda
    const mid = (lo + hi) / 2;
    return COMBOS.reduce((best, c) =>
      Math.abs(comboTotal(c) - mid) < Math.abs(comboTotal(best) - mid) ? c : best
    );
  }

  // 'M': más cercano a GETD con |balance| <= 100 preferente
  return COMBOS.reduce((best, c) =>
    Math.abs(comboTotal(c) - getd) < Math.abs(comboTotal(best) - getd) ? c : best
  );
}

const OBJECTIVE_LABEL: Record<Objective, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
};

/**
 * GET /api/meals/recommend - Proyeccion de 100 dias personalizada. Requiere auth.
 *
 * @param {Request} req - Peticion autenticada.
 * @param {Response} res - Respuesta con proyeccion.
 * @returns {Promise<void>}
 * @throws {HttpError} 404 si el usuario no tiene perfil.
 */
export async function recommend(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.sub;

  const profile = await profileModel.findById(userId);
  if (!profile) {
    throw HttpError.notFound('El usuario no tiene perfil registrado');
  }

  const { basalMetabolicRate: tmb, totalDailyEnergyExpenditure: getd, objective, weight } = profile;

  const combo = pickCombo(tmb, getd, objective);
  const dailyKcal = comboTotal(combo);
  const dailyBalance = dailyKcal - getd;

  const proyeccion_diaria = [];
  let pesoActual = weight;

  for (let dia = 1; dia <= 100; dia++) {
    pesoActual = pesoActual + dailyBalance / 7700;
    proyeccion_diaria.push({
      dia,
      calorias_consumidas: dailyKcal,
      balance_energetico: Math.round(dailyBalance),
      peso_proyectado: Math.round(pesoActual * 100) / 100,
      recomendacion_menu: {
        desayuno: { categoria: combo.desayuno, kcal: KCAL[combo.desayuno] },
        almuerzo: { categoria: combo.almuerzo, kcal: KCAL[combo.almuerzo] },
        cena:     { categoria: combo.cena,     kcal: KCAL[combo.cena]     },
      },
    });
  }

  res.json({
    datos_usuario: {
      tmb:  `${tmb} kcal`,
      getd: `${getd} kcal`,
    },
    objetivo_usuario: OBJECTIVE_LABEL[objective],
    proyeccion_diaria,
  });
}
