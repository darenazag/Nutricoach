/**
 * @file Rutas de alimentos (Food_item).
 * Prefijo: /api/foods
 *
 * Lectura pública con paginación; crear y borrar requiere rol admin.
 */

import { Router } from 'express';
import * as controller from '../controllers/foodItemController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createFoodSchema, idParamSchema, paginationSchema } from '../validators/schemas.js';

const router = Router();

router.get(
  '/',
  validate(paginationSchema, 'query'),
  asyncHandler(controller.list)
);
router.get(
  '/:id',
  validate(idParamSchema, 'params'),
  asyncHandler(controller.getById)
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createFoodSchema),
  asyncHandler(controller.create)
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.remove)
);

export default router;
