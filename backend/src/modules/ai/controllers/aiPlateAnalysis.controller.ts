import type { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { AiServiceError } from '../services/aiServiceError.js';
import { runAiPlateAnalysis } from '../services/aiPlateAnalysis.service.js';

// ── Image upload config ────────────────────────────────────────────────────

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DIMENSION = 1024; // px — longest side after resize

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, ACCEPTED_MIME_TYPES.has(file.mimetype));
  },
});

/**
 * Wraps multer's upload.single() so that MulterError (e.g. LIMIT_FILE_SIZE)
 * is caught and re-thrown as AiServiceError('invalid_image') instead of
 * propagating as a raw Error to the global handler.
 */
function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single('image')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      next(
        new AiServiceError(
          `Image upload rejected: ${err.message} (code: ${err.code})`,
          'invalid_image',
          { cause: err },
        ),
      );
    } else {
      next(err);
    }
  });
}

// ── Controller ─────────────────────────────────────────────────────────────

const postAiPlateAnalysis: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AiServiceError(
        'No image provided or image type not accepted. Accepted: jpeg, png, webp.',
        'invalid_image',
      );
    }

    const file = req.file;

    // Read image metadata and optionally resize with sharp
    const sharpInstance = sharp(file.buffer);
    const meta = await sharpInstance.metadata();
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

    const body = req.body as Record<string, string | undefined>;

    const result = await runAiPlateAnalysis({
      // userId always comes from the authenticated JWT (req.auth.sub).
      // Any body.userId sent by AI Lab or another client is ignored.
      userId: String(req.auth!.sub),
      mealId: body['mealId']?.trim() || undefined,
      imageBuffer: processedBuffer,
      imageMetadata: {
        mimeType: file.mimetype,
        sizeBytes: processedBuffer.length,
        width: finalWidth,
        height: finalHeight,
      },
      objective: body['objective'] as 'lose_weight' | 'maintain' | 'gain_muscle' | undefined,
      caloriesTarget: body['caloriesTarget'] ? Number(body['caloriesTarget']) : undefined,
      plan: body['plan'] as 'free' | 'pro' | undefined,
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// Export both so the router can apply them in sequence
export const handlePlateAnalysis: RequestHandler[] = [uploadMiddleware, postAiPlateAnalysis];
