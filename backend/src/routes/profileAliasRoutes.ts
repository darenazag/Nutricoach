/**
 * @file Rutas alias para el perfil del usuario autenticado.
 * Prefijo: /api/profile
 *
 * Estas rutas existen para compatibilidad con el frontend sin romper
 * las rutas canónicas /api/profiles.
 */

import { Router } from 'express';
import * as controller from '../controllers/profileController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createProfileSchema } from '../validators/schemas.js';

const router = Router();

router.get('/',       authenticate, asyncHandler(controller.getMine));
router.post(
  '/',
  authenticate,
  validate(createProfileSchema.omit({ user_id: true })),
  asyncHandler(controller.createMine)
);
router.get('/streak', authenticate, asyncHandler(controller.getMyStreak));

export default router;
