/**
 * @file Rutas de usuarios (User).
 * Prefijo: /api/users
 *
 * Listar y ver usuarios requiere rol admin. Paginación disponible.
 */

import { Router } from 'express';
import * as controller from '../controllers/userController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { idParamSchema, paginationSchema } from '../validators/schemas.js';

const router = Router();

router.get(
  '/',
  authenticate,
  requireAdmin,
  validate(paginationSchema, 'query'),
  asyncHandler(controller.list)
);
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  validate(idParamSchema, 'params'),
  asyncHandler(controller.getById)
);

export default router;
