/**
 * @file Rutas de autenticación.
 * Prefijo: /api/auth
 *
 * Los endpoints de registro y login tienen rate limiting para prevenir
 * ataques de fuerza bruta (10 intentos / 15 minutos por IP).
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';

const router = Router();

/** Limita intentos de autenticación a 10 por IP cada 15 minutos. */
const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            10,
  standardHeaders: 'draft-7',
  legacyHeaders:  false,
  message:        { error: 'Demasiados intentos. Vuelve a intentarlo en 15 minutos.' },
  skipSuccessfulRequests: false,
});

router.post('/register', authLimiter, validate(registerSchema),  asyncHandler(controller.register));
router.post('/login',    authLimiter, validate(loginSchema),     asyncHandler(controller.login));
router.get('/me',        authenticate,                           asyncHandler(controller.me));

export default router;
