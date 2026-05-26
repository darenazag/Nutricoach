import { Request, Response } from 'express';
import * as profileModel from '../models/profileModel.js';
import { HttpError } from '../utils/httpError.js';
import type { Objective } from '../types/domain.js';

// ============================================================================
// MONTE CARLO – Proyección de 100 días con variedad de menús
// ============================================================================

/** Kcal por categoría de comida. */
const KCAL: Record<string, number> = { bajo: 250, medio: 500, alto: 750 };
type Categoria = 'bajo' | 'medio' | 'alto';

interface Combo {
  desayuno: Categoria;
  almuerzo: Categoria;
  cena: Categoria;
}

/** Proyección de un día (para tipado de la respuesta) */
interface DiaProyeccion {
  dia: number;
  calorias_consumidas: number;
  balance_energetico: number;
  peso_proyectado: number;
  recomendacion_menu: {
    desayuno: { categoria: string; kcal: number };
    almuerzo: { categoria: string; kcal: number };
    cena: { categoria: string; kcal: number };
  };
}

/**
 * Genera un pool de combinaciones válidas para el objetivo del usuario.
 * @param tmb Tasa metabólica basal (kcal)
 * @param getd Gasto energético total diario (kcal)
 * @param objective Objetivo del perfil ('P' | 'M' | 'G')
 * @param poolSize Número máximo de combinaciones a generar (por defecto 500)
 * @returns Array de combos válidos, cada uno con su estructura, total calórico y balance
 */
function generarPoolValido(
  tmb: number,
  getd: number,
  objective: Objective,
  poolSize: number = 500
): { combo: Combo; totalCalorias: number; balance: number }[] {
  const pool: { combo: Combo; totalCalorias: number; balance: number }[] = [];
  const categorias: Categoria[] = ['bajo', 'medio', 'alto'];

  for (let intento = 0; intento < poolSize; intento++) {
    const desayuno = categorias[Math.floor(Math.random() * categorias.length)];
    const almuerzo = categorias[Math.floor(Math.random() * categorias.length)];
    const cena = categorias[Math.floor(Math.random() * categorias.length)];
    const totalCalorias = KCAL[desayuno] + KCAL[almuerzo] + KCAL[cena];
    const balance = totalCalorias - getd;
    let valido = false;

    if (objective === 'P') {
      valido = totalCalorias < getd && totalCalorias >= tmb;
    } else if (objective === 'G') {
      const minSuperavit = getd * 1.10;
      const maxSuperavit = getd * 1.15;
      valido = totalCalorias >= minSuperavit && totalCalorias <= maxSuperavit;
    } else if (objective === 'M') {
      valido = Math.abs(balance) <= 100;
    }

    if (valido) {
      pool.push({
        combo: { desayuno, almuerzo, cena },
        totalCalorias,
        balance,
      });
    }
  }
  return pool;
}

/**
 * Convierte un valor a número finito o lanza error.
 * (Función auxiliar que ya deberías tener en el controlador)
 */
function toFiniteProfileNumber(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(422, `El perfil tiene un valor numérico inválido en ${field}`);
  }
  return parsed;
}

/**
 * Etiqueta legible del objetivo.
 */
const OBJECTIVE_LABEL: Record<Objective, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
};

/**
 * GET /api/meals/recommend - Proyección de 100 días con simulación Monte Carlo.
 * Requiere autenticación.
 */
export async function recommend(req: Request, res: Response): Promise<void> {
  const userId = req.auth!.sub;

  const profile = await profileModel.findById(userId);
  if (!profile) {
    throw HttpError.notFound('El usuario no tiene perfil registrado');
  }

  const tmb = toFiniteProfileNumber(profile.basalMetabolicRate, 'basalMetabolicRate');
  const getd = toFiniteProfileNumber(profile.totalDailyEnergyExpenditure, 'totalDailyEnergyExpenditure');
  const weightStart = toFiniteProfileNumber(profile.weight, 'weight');
  const objective = profile.objective;

  // 1. Generar el pool de combinaciones válidas
  let pool = generarPoolValido(tmb, getd, objective, 500);
  if (pool.length === 0) {
    // Devolvemos error detallado (similar al JS)
    res.status(422).json({
      error: `No hay combinaciones válidas para el objetivo '${objective}' con los parámetros actuales.`,
      diagnostico: {
        tmb,
        getd,
        objetivo: objective,
        rango_buscado: objective === 'P'
          ? `${tmb} - ${getd} kcal`
          : objective === 'G'
          ? `${(getd * 1.10).toFixed(0)} - ${(getd * 1.15).toFixed(0)} kcal`
          : `${getd - 100} - ${getd + 100} kcal`,
      },
    });
    return;
  }

  // 2. Simular 100 días muestreando sin reemplazo
  const KCAL_POR_KG = 7700;
  let pesoActual = weightStart;
  let poolActual = [...pool];
  const proyeccionDiaria: DiaProyeccion[] = [];

  for (let dia = 1; dia <= 100; dia++) {
    // Regenerar pool si se agota
    if (poolActual.length === 0) {
      poolActual = generarPoolValido(tmb, getd, objective, 500);
      if (poolActual.length === 0) {
        // Si sigue sin haber combinaciones, devolvemos error (no debería ocurrir)
        res.status(422).json({
          error: 'No se pudo generar ningún combo válido para continuar la simulación.',
        });
        return;
      }
    }

    // Seleccionar una combinación aleatoria y eliminarla del pool
    const indice = Math.floor(Math.random() * poolActual.length);
    const { combo, totalCalorias } = poolActual[indice];
    poolActual.splice(indice, 1);

    // Aplicar variación aleatoria de ±50 kcal, acotada al rango seguro según objetivo
    let variacion = (Math.random() - 0.5) * 100;
    let caloriasConVariacion = totalCalorias + variacion;

    if (objective === 'P') {
      caloriasConVariacion = Math.min(Math.max(caloriasConVariacion, tmb), getd);
    } else if (objective === 'G') {
      const minSuperavit = getd * 1.10;
      const maxSuperavit = getd * 1.15;
      caloriasConVariacion = Math.min(Math.max(caloriasConVariacion, minSuperavit), maxSuperavit);
    } else if (objective === 'M') {
      caloriasConVariacion = Math.min(Math.max(caloriasConVariacion, getd - 100), getd + 100);
    }

    const balanceConVariacion = caloriasConVariacion - getd;
    pesoActual += balanceConVariacion / KCAL_POR_KG;

    proyeccionDiaria.push({
      dia,
      calorias_consumidas: Math.round(caloriasConVariacion),
      balance_energetico: Math.round(balanceConVariacion),
      peso_proyectado: Math.round(pesoActual * 100) / 100,
      recomendacion_menu: {
        desayuno: { categoria: combo.desayuno, kcal: KCAL[combo.desayuno] },
        almuerzo: { categoria: combo.almuerzo, kcal: KCAL[combo.almuerzo] },
        cena: { categoria: combo.cena, kcal: KCAL[combo.cena] },
      },
    });
  }

  res.json({
    datos_usuario: {
      tmb: `${tmb} kcal`,
      getd: `${getd} kcal`,
    },
    objetivo_usuario: OBJECTIVE_LABEL[objective],
    metodo: 'Monte Carlo - Muestreo sin reemplazo con variación ±50 kcal acotada',
    pool_size: pool.length,
    proyeccion_diaria: proyeccionDiaria,
  });
}
