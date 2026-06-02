/**
 * @file Rutas de usuarios (User). Prefijo: /api/users
 * Listar y ver cualquier usuario requiere rol admin.
 */

import { Router } from 'express';
import * as controller from '../controllers/userController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', authenticate, requireAdmin, asyncHandler(controller.list));
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.getById)
);

export default router;
