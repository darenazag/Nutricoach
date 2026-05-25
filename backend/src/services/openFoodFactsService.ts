/**
 * @file Cliente de Open Food Facts (API principal de alimentos).
 * Usa `fetch` nativo (Node 18+). No requiere clave, pero Open Food Facts pide
 * un User-Agent personalizado para identificar la app.
 *
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 */

import { env } from '../config/env.js';
import {
  OffProduct,
  OffProductResponse,
  OffSearchResponse,
} from '../types/openFoodFacts.js';

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

/** Campos que solicitamos para minimizar el tamanio de la respuesta. */
const FIELDS = 'code,product_name,brands,nutriments,image_url';

/**
 * Realiza un GET con el User-Agent requerido y parsea el JSON.
 *
 * @template T - Forma esperada del JSON.
 * @param {string} url - URL completa con query string.
 * @returns {Promise<T>} El cuerpo JSON tipado.
 * @throws {Error} Si la respuesta no es satisfactoria.
 */
async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { 'User-Agent': env.openFoodFacts.userAgent },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Open Food Facts respondio ${response.status} ${response.statusText}: ${body.slice(0, 200)}`
    );
  }
  return (await response.json()) as T;
}

/**
 * Busca un producto por texto y devuelve el primero con datos nutricionales.
 * Prioriza productos que tengan al menos energia y proteinas informadas.
 *
 * @param {string} term - Texto a buscar (ej. "chicken breast").
 * @returns {Promise<OffProduct | null>} El producto o null si no hay resultados.
 */
export async function searchProduct(term: string): Promise<OffProduct | null> {
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '10',
    fields: FIELDS,
  });
  const data = await getJson<OffSearchResponse>(
    `${SEARCH_URL}?${params.toString()}`
  );
  if (!data.products || data.products.length === 0) {
    return null;
  }
  // Preferimos un producto que tenga energia y proteinas informadas.
  const withMacros = data.products.find(
    (p) =>
      p.nutriments?.['energy-kcal_100g'] != null &&
      p.nutriments?.proteins_100g != null
  );
  return withMacros ?? data.products[0];
}

/**
 * Obtiene un producto por su codigo de barras.
 *
 * @param {string} barcode - Codigo de barras.
 * @returns {Promise<OffProduct | null>} El producto o null si no existe.
 */
export async function getProductByBarcode(
  barcode: string
): Promise<OffProduct | null> {
  const data = await getJson<OffProductResponse>(
    `${PRODUCT_URL}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`
  );
  return data.status === 1 && data.product ? data.product : null;
}
