/**
 * @file Router raiz que agrupa todas las rutas bajo /api.
 */

import { Router } from 'express';
import authRoutes from './authRoutes.js';
import foodItemRoutes from './foodItemRoutes.js';
import mealRoutes from './mealRoutes.js';
import profileRoutes from './profileRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/foods', foodItemRoutes);
router.use('/meals', mealRoutes);
router.use('/profiles', profileRoutes);
router.use('/users', userRoutes);

export default router;
