import { Router } from 'express';
import { getRecommendedMeals } from '../controllers/mealController.js';

const router = Router();

// GET /api/meals/recommend
// Ejemplo de uso: /api/meals/recommend?maxCalories=600&minProtein=30
router.get('/recommend', getRecommendedMeals);

export default router;