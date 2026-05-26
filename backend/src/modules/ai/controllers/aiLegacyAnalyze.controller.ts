import type { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { AiServiceError } from '../services/aiServiceError.js';
import { runAiPlateAnalysis } from '../services/aiPlateAnalysis.service.js';
import { buildAiPlateContextFromP0User } from '../adapters/index.js';

// ── Upload config (mirrors aiPlateAnalysis.controller limits) ─────────────────

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, ACCEPTED_MIME_TYPES.has(file.mimetype));
  },
});

function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single('image')(req, res, (err: unknown) => {
    if (!err) { next(); return; }
    if (err instanceof multer.MulterError) {
      next(new AiServiceError(
        `Image upload rejected: ${err.message} (code: ${err.code})`,
        'invalid_image',
        { cause: err },
      ));
    } else {
      next(err);
    }
  });
}

// ── Shared image processor ────────────────────────────────────────────────────

interface ProcessedImage {
  imageBuffer: Buffer;
  imageMetadata: { mimeType: string; sizeBytes: number; width: number; height: number };
}

async function processUploadedImage(req: Request): Promise<ProcessedImage> {
  if (!req.file) {
    throw new AiServiceError(
      'No image provided. Send a JPEG, PNG or WebP as multipart field "image".',
      'invalid_image',
    );
  }
  const file = req.file;
  const meta = await sharp(file.buffer).metadata();
  const origWidth = meta.width ?? 0;
  const origHeight = meta.height ?? 0;

  let processedBuffer = file.buffer;
  let finalWidth = origWidth;
  let finalHeight = origHeight;

  if (origWidth > MAX_DIMENSION || origHeight > MAX_DIMENSION) {
    const resized = await sharp(file.buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });
    processedBuffer = resized.data;
    finalWidth = resized.info.width;
    finalHeight = resized.info.height;
  }

  return {
    imageBuffer: processedBuffer,
    imageMetadata: {
      mimeType: file.mimetype,
      sizeBytes: processedBuffer.length,
      width: finalWidth,
      height: finalHeight,
    },
  };
}

// ── POST /api/ai/analyze ──────────────────────────────────────────────────────
// Legacy adapter for AIBubble.tsx. Caller only checks res.ok — body is not consumed.

const postAnalyze: RequestHandler = async (req, res, next) => {
  try {
    const { imageBuffer, imageMetadata } = await processUploadedImage(req);
    const aiContext = await buildAiPlateContextFromP0User(req.auth!.sub);
    const result = await runAiPlateAnalysis({ ...aiContext, imageBuffer, imageMetadata });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/ai/analyze-preview ──────────────────────────────────────────────
// Legacy adapter for RegistrarComida.tsx.
// Maps plate-analysis estimatedNutrition ranges to the flat Analysis shape the
// component reads: { analysis: { name, calories, protein, fat, carbs, source } }

const postAnalyzePreview: RequestHandler = async (req, res, next) => {
  try {
    const { imageBuffer, imageMetadata } = await processUploadedImage(req);
    const aiContext = await buildAiPlateContextFromP0User(req.auth!.sub);
    const result = await runAiPlateAnalysis({ ...aiContext, imageBuffer, imageMetadata });

    const n = result.structuredData.estimatedNutrition;
    const analysis = {
      name: result.structuredData.detectedFoods.map(f => f.name).join(', ') || 'Plato analizado',
      calories: Math.round((n.caloriesRange.min + n.caloriesRange.max) / 2),
      protein:  Math.round((n.proteinRange.min  + n.proteinRange.max)  / 2),
      fat:      Math.round((n.fatRange.min      + n.fatRange.max)      / 2),
      carbs:    Math.round((n.carbsRange.min    + n.carbsRange.max)    / 2),
      source: 'Análisis IA (NutriCoach)',
    };

    res.status(200).json({ analysis });
  } catch (err) {
    next(err);
  }
};

export const handleAnalyze: RequestHandler[]        = [uploadMiddleware, postAnalyze];
export const handleAnalyzePreview: RequestHandler[] = [uploadMiddleware, postAnalyzePreview];
