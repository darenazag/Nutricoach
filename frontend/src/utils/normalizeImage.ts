// Normaliza una imagen antes de enviarla al backend.
// Problema: móvil puede subir HEIC/HEIF (solo iOS Safari lo decodifica) o JPEGs
// de cámara >5 MB que el backend rechaza.
// Solución: cargar con <img> (el navegador decodifica el formato nativo),
// dibujar en canvas, exportar como JPEG con calidad progresiva hasta quedar
// bajo MAX_SAFE_BYTES. El backend acepta jpeg/png/webp hasta 5 MB.

const MAX_DIMENSION = 1920
const MAX_SAFE_BYTES = 4 * 1024 * 1024 // 4 MB — margen por debajo del límite de 5 MB del backend
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen. Verifica que sea una foto válida.'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Error al convertir la imagen'))),
      type,
      quality,
    )
  })
}

/**
 * Devuelve un File normalizado listo para enviar al backend:
 * - Convierte cualquier formato (incluido HEIC en Safari) a JPEG
 * - Escala la imagen al lado más largo ≤ MAX_DIMENSION px si es necesario
 * - Comprime progresivamente hasta que el tamaño quede ≤ MAX_SAFE_BYTES
 * - Si ya es jpeg/png/webp y pesa ≤ 4 MB devuelve el File original sin tocar
 */
export async function normalizeImageForUpload(file: File): Promise<File> {
  if (ACCEPTED_TYPES.has(file.type) && file.size <= MAX_SAFE_BYTES) {
    return file
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImg(objectUrl)

    let w = img.naturalWidth
    let h = img.naturalHeight

    if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
      if (w >= h) {
        h = Math.round((h / w) * MAX_DIMENSION)
        w = MAX_DIMENSION
      } else {
        w = Math.round((w / h) * MAX_DIMENSION)
        h = MAX_DIMENSION
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible en este dispositivo')
    ctx.drawImage(img, 0, 0, w, h)

    // Reducir calidad en pasos hasta que quepa dentro del límite
    for (let quality = 0.85; quality >= 0.35; quality = Math.round((quality - 0.1) * 100) / 100) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
      if (blob.size <= MAX_SAFE_BYTES) {
        return new File([blob], 'image.jpg', { type: 'image/jpeg' })
      }
    }

    throw new Error('La imagen es demasiado grande incluso comprimida. Intenta con una foto más pequeña.')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
