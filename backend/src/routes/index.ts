/**
 * @file Router raíz que agrupa todas las rutas bajo /api.
 */

import { Router } from 'express';
import authRoutes         from './authRoutes.js';
import foodItemRoutes     from './foodItemRoutes.js';
import mealRoutes         from './mealRoutes.js';
import profileAliasRoutes from './profileAliasRoutes.js';
import profileRoutes      from './profileRoutes.js';
import userRoutes         from './userRoutes.js';

const router = Router();

router.use('/auth',     authRoutes);
router.use('/foods',    foodItemRoutes);
router.use('/meals',    mealRoutes);
router.use('/profile',  profileAliasRoutes);  // alias para el frontend
router.use('/profiles', profileRoutes);        // CRUD canónico de perfiles
router.use('/users',    userRoutes);

export default router;
