/**
 * @file Cálculos metabólicos según la ecuación de Mifflin-St Jeor.
 * Extraídos del backend de ELI para reutilizarse en el registro y la
 * actualización de perfil.
 */

import type { ActivityFactor, Gender } from '../types/domain.js';

/** Multiplicadores de actividad por factor. */
const ACTIVITY_MULTIPLIER: Record<ActivityFactor, number> = {
  S: 1.2,    // Sedentario
  L: 1.375,  // Ligero
  A: 1.55,   // Activo (moderado)
  V: 1.725,  // Muy activo
};

/**
 * Resultado del cálculo metabólico.
 */
export interface MetabolismResult {
  /** Tasa Metabólica Basal en kcal (redondeada al entero más cercano). */
  bmr: number;
  /** Gasto Energético Total Diario en kcal (redondeado al entero más cercano). */
  tdee: number;
}

/**
 * Calcula la TMB (Tasa Metabólica Basal) usando la ecuación de Mifflin-St Jeor
 * y el GETD (Gasto Energético Total Diario) aplicando el factor de actividad.
 *
 * @param {number} weight - Peso en kilogramos.
 * @param {number} height - Altura en centímetros.
 * @param {number} age - Edad en años.
 * @param {Gender} gender - Género ('M' o 'F').
 * @param {ActivityFactor} activityFactor - Factor de actividad física.
 * @returns {MetabolismResult} Objeto con bmr y tdee redondeados.
 */
export function calculateMetabolism(
  weight: number,
  height: number,
  age: number,
  gender: Gender,
  activityFactor: ActivityFactor
): MetabolismResult {
  // Ecuación de Mifflin-St Jeor
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  bmr += gender === 'M' ? 5 : -161;

  const multiplier = ACTIVITY_MULTIPLIER[activityFactor];
  const tdee = bmr * multiplier;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}
