/**
 * @file Rutas de autenticacion. Prefijo: /api/auth
 */

import { Router } from 'express';
import * as controller from '../controllers/authController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

const router = Router();

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(controller.register)
);
router.post('/login', validate(loginSchema), asyncHandler(controller.login));
router.get('/me', authenticate, asyncHandler(controller.me));

export default router;
