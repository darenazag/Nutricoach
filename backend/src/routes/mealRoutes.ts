/**
 * @file Rutas de comidas (Meal).
 * Prefijo: /api/meals
 *
 * Lectura pública con paginación; crear requiere rol admin.
 * Las rutas de perfil bajo /api/meals/profile/* requieren autenticación.
 */

import { Router } from 'express';
import * as controller from '../controllers/mealController.js';
import * as profileController from '../controllers/profileController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assignMealSchema,
  createMealSchema,
  idParamSchema,
  paginationSchema,
} from '../validators/schemas.js';

const router = Router();

// Las rutas más específicas deben ir antes que /:id
router.get(
  '/profile/mine',
  authenticate,
  asyncHandler(profileController.getMyMeals)
);

router.post(
  '/profile/assign',
  authenticate,
  validate(assignMealSchema),
  asyncHandler(profileController.assignMealToMe)
);

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(controller.list)
);
router.get('/recommend', authenticate, asyncHandler(controller.recommend));
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(controller.getById)
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createMealSchema),
  asyncHandler(controller.create)
);

export default router;
