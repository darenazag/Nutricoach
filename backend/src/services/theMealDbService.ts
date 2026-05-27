/**
 * @file Cliente de TheMealDB (API secundaria de recetas).
 * Usa `fetch` nativo (Node 18+). La clave de desarrollo "1" es gratuita.
 * TheMealDB NO devuelve datos nutricionales; aporta ingredientes, medidas
 * e instrucciones. Las calorías/macros deben calcularse aparte.
 *
 * Docs: https://www.themealdb.com/api.php
 */

import { env } from '../config/env.js';
import type { MealDbMeal, MealDbResponse } from '../types/theMealDb.js';

/** Ingrediente extraído de una receta de TheMealDB. */
export interface MealDbIngredient {
  /** Nombre del ingrediente. */
  name: string;
  /** Medida en texto libre (ej. "200g", "1 cup"). */
  measure: string;
}

/**
 * Construye la URL base con la clave de API configurada.
 *
 * @param {string} endpoint - Nombre del endpoint (ej. "search.php").
 * @returns {string} URL base sin query params.
 */
function baseUrl(endpoint: string): string {
  return `https://www.themealdb.com/api/json/v1/${env.theMealDb.apiKey}/${endpoint}`;
}

/**
 * Realiza un GET y parsea el JSON como MealDbResponse.
 *
 * @param {string} url - URL completa.
 * @returns {Promise<MealDbResponse>} La respuesta tipada.
 * @throws {Error} Si la respuesta HTTP no es satisfactoria.
 */
async function getJson(url: string): Promise<MealDbResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `TheMealDB respondió ${response.status} ${response.statusText}`
    );
  }
  return (await response.json()) as MealDbResponse;
}

/**
 * Busca una receta por nombre y devuelve la primera coincidencia.
 *
 * @param {string} name - Nombre o término del plato (ej. "chicken").
 * @returns {Promise<MealDbMeal | null>} La receta o null si no hay match.
 */
export async function searchMealByName(name: string): Promise<MealDbMeal | null> {
  const params = new URLSearchParams({ s: name });
  const data = await getJson(`${baseUrl('search.php')}?${params.toString()}`);
  return data.meals?.[0] ?? null;
}

/**
 * Obtiene una receta completa por su id de TheMealDB.
 *
 * @param {string} id - Id de la receta.
 * @returns {Promise<MealDbMeal | null>} La receta o null.
 */
export async function lookupMealById(id: string): Promise<MealDbMeal | null> {
  const params = new URLSearchParams({ i: id });
  const data = await getJson(`${baseUrl('lookup.php')}?${params.toString()}`);
  return data.meals?.[0] ?? null;
}

/**
 * Extrae la lista de ingredientes (nombre + medida) de una receta.
 * TheMealDB usa campos planos numerados strIngredient1..20 / strMeasure1..20.
 *
 * @param {MealDbMeal} meal - Receta de TheMealDB.
 * @returns {MealDbIngredient[]} Lista de ingredientes no vacíos.
 */
export function extractIngredients(meal: MealDbMeal): MealDbIngredient[] {
  const ingredients: MealDbIngredient[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const name    = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim() !== '') {
      ingredients.push({
        name:    name.trim(),
        measure: (measure ?? '').trim(),
      });
    }
  }
  return ingredients;
}
