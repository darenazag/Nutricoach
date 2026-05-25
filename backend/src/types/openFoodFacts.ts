/**
 * @file Tipos para las respuestas relevantes de Open Food Facts.
 * Solo se modelan los campos que consume el seeder; la respuesta real
 * contiene muchos mas campos que se ignoran de forma segura.
 */

/**
 * Nutrientes de un producto. Open Food Facts expone valores por 100 g con el
 * sufijo `_100g`. Las claves con guion (`energy-kcal_100g`) requieren acceso
 * por indice de cadena.
 */
export interface OffNutriments {
  /** Energia en kcal por 100 g. */
  'energy-kcal_100g'?: number;
  /** Proteinas (g) por 100 g. */
  proteins_100g?: number;
  /** Carbohidratos (g) por 100 g. */
  carbohydrates_100g?: number;
  /** Grasas (g) por 100 g. */
  fat_100g?: number;
  /** Permite acceder a otros nutrientes no tipados explicitamente. */
  [key: string]: number | undefined;
}

/** Producto de Open Food Facts (campos usados por el seeder). */
export interface OffProduct {
  /** Codigo de barras del producto. */
  code?: string;
  /** Nombre del producto. */
  product_name?: string;
  /** Marcas asociadas. */
  brands?: string;
  /** Nutrientes del producto. */
  nutriments?: OffNutriments;
  /** URL de la imagen del producto. */
  image_url?: string;
}

/** Respuesta del endpoint de busqueda por texto (cgi/search.pl). */
export interface OffSearchResponse {
  count: number;
  page?: number;
  page_size?: number;
  products: OffProduct[];
}

/** Respuesta del endpoint de producto por barcode (api/v2/product). */
export interface OffProductResponse {
  code: string;
  status: number;
  status_verbose?: string;
  product?: OffProduct;
}
