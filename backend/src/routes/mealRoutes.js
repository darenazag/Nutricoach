import { Router } from 'express'
import { verifyToken } from '../middleware/authMiddleware.js'
import * as meal from '../controllers/mealController.js'

const router = Router()

router.get('/profile/mine', verifyToken, meal.getProfileMeals)
router.post('/profile/assign', verifyToken, meal.assignMealToProfile)
router.delete('/profile/:mealId', verifyToken, meal.unassignMealFromProfile)

router.get('/', meal.getAll)
router.get('/:id', meal.getById)
router.post('/', verifyToken, meal.create)
router.put('/:id', verifyToken, meal.update)
router.delete('/:id', verifyToken, meal.remove)

export default router
