/**
 * @file Rutas de perfiles (Profile). Prefijo: /api/profiles
 * Lectura publica; escritura protegida con JWT, validada con Zod y autorizada
 * por rol. Solo el admin puede modificar perfiles ajenos.
 */

import { Router } from 'express';
import * as controller from '../controllers/profileController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/authenticate.js';
import { requireSelfOrAdmin } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import {
  assignMealSchema,
  createProfileSchema,
  idParamSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/', asyncHandler(controller.list));
router.get('/:id', validate(idParamSchema, 'params'), asyncHandler(controller.getById));
router.get(
  '/:id/meals',
  validate(idParamSchema, 'params'),
  asyncHandler(controller.getMeals)
);

// Crear/actualizar perfil: la comprobacion propio-o-admin se hace en el
// controlador porque el user_id viaja en el body, no en la ruta.
router.post(
  '/',
  authenticate,
  validate(createProfileSchema),
  asyncHandler(controller.create)
);

// Asignar comida a un perfil: solo el propio dueño o un admin.
router.post(
  '/:id/meals',
  authenticate,
  validate(idParamSchema, 'params'),
  validate(assignMealSchema),
  requireSelfOrAdmin('id'),
  asyncHandler(controller.assignMeal)
);

export default router;
