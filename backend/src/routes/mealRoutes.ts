/**
 * @file Rutas de comidas (Meal). Prefijo: /api/meals
 * Lectura publica; crear requiere rol admin.
 */

import { Router } from 'express';
import * as controller from '../controllers/mealController.js';
import * as profileController from '../controllers/profileController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { assignMealSchema, createMealSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

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

router.get('/', asyncHandler(controller.list));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(controller.getById));
router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createMealSchema),
  asyncHandler(controller.create)
);

export default router;
