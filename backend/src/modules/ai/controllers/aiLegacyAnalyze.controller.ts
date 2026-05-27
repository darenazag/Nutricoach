import type { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';
import { AiServiceError } from '../services/aiServiceError.js';
import { runAiPlateAnalysis } from '../services/aiPlateAnalysis.service.js';
import { buildAiPlateContextFromP0User } from '../adapters/index.js';
import * as mealModel from '../../../models/mealModel.js';
import * as profileModel from '../../../models/profileModel.js';

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
    // Meal.name in PostgreSQL is varchar(100); Zod also caps at 100. Truncate to keep both happy.
    const rawName = result.structuredData.detectedFoods.map(f => f.name).join(', ') || 'Plato analizado';
    const analysis = {
      name: rawName.length > 100 ? rawName.slice(0, 97) + '...' : rawName,
      calories: Math.round((n.caloriesRange.min + n.caloriesRange.max) / 2),
      protein:  Math.round((n.proteinRange.min  + n.proteinRange.max)  / 2),
      fat:      Math.round((n.fatRange.min      + n.fatRange.max)      / 2),
      carbs:    Math.round((n.carbsRange.min    + n.carbsRange.max)    / 2),
      source: 'Análisis IA (NutriCoach)',
    };

    res.status(200).json({
      analysis,
      analysisId: result.analysisId,
      responseText: result.responseText,
      detectedFoods: result.structuredData.detectedFoods,
      proportions: result.structuredData.proportions,
      recommendations: result.structuredData.recommendations,
      warnings: result.structuredData.warnings,
      confidence: result.structuredData.confidence,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/ai/save-analyzed-meal ──────────────────────────────────────────
// Creates a meal in PostgreSQL and assigns it to the authenticated user.
// Bypasses requireAdmin: the AI module handles meal creation for analyzed plates.

const saveMealBodySchema = z.object({
  name:       z.string().min(1).max(100),
  calories:   z.number().positive(),
  protein:    z.number().nonnegative(),
  fat:        z.number().nonnegative(),
  carbs:      z.number().nonnegative(),
  source:     z.string().max(200).optional(),
  mealType:   z.string().max(50).optional(),
  analysisId: z.string().optional(),
});

const postSaveAnalyzedMeal: RequestHandler = async (req, res, next) => {
  try {
    const parsed = saveMealBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AiServiceError(
        `Invalid request body: ${parsed.error.issues.map(i => i.message).join(', ')}`,
        'validation_error',
      );
    }
    const { name, calories, protein, fat, carbs, source, mealType } = parsed.data;
    const userId = Number(req.auth!.sub);
    const meal_id = Date.now();

    const meal = await mealModel.create({
      meal_id,
      name,
      calories,
      protein,
      fat,
      carbs,
      img: null,
      source: source ?? `Análisis IA (NutriCoach)${mealType ? ' - ' + mealType.toLowerCase() : ''}`,
    });

    await profileModel.assignMeal(userId, meal_id);

    res.status(201).json({ success: true, data: { meal } });
  } catch (err) {
    next(err);
  }
};

export const handleAnalyze: RequestHandler[]            = [uploadMiddleware, postAnalyze];
export const handleAnalyzePreview: RequestHandler[]     = [uploadMiddleware, postAnalyzePreview];
export const handleSaveAnalyzedMeal: RequestHandler     = postSaveAnalyzedMeal;
