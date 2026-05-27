/**
 * @file Rutas de perfiles (Profile).
 * Prefijo: /api/profiles
 *
 * Todos los endpoints requieren autenticación (datos de salud privados).
 * Listado general: solo admin.
 * Lectura individual / modificación: propio perfil o admin.
 */

import { Router } from 'express';
import * as controller from '../controllers/profileController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireAdmin, requireSelfOrAdmin } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  assignMealSchema,
  createProfileSchema,
  idParamSchema,
  paginationSchema,
} from '../validators/schemas.js';

const router = Router();

// Listar todos los perfiles: solo admin (datos de salud sensibles)
router.get(
  '/',
  authenticate,
  requireAdmin,
  validate(paginationSchema, 'query'),
  asyncHandler(controller.list)
);

// Ver perfil individual: propio usuario o admin
router.get(
  '/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  requireSelfOrAdmin('id'),
  asyncHandler(controller.getById)
);

// Ver comidas de un perfil: propio usuario o admin
router.get(
  '/:id/meals',
  authenticate,
  validate(idParamSchema, 'params'),
  requireSelfOrAdmin('id'),
  asyncHandler(controller.getMeals)
);

// Crear/actualizar perfil: propio usuario o admin (check en el controlador)
router.post(
  '/',
  authenticate,
  validate(createProfileSchema),
  asyncHandler(controller.create)
);

// Asignar comida a un perfil: propio usuario o admin
router.post(
  '/:id/meals',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(assignMealSchema),
  requireSelfOrAdmin('id'),
  asyncHandler(controller.assignMeal)
);

export default router;
