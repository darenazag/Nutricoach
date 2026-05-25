import { Router } from 'express'
import { verifyToken } from '../middleware/authMiddleware.js'
import * as food from '../controllers/foodItemController.js'

const router = Router()

router.get('/', food.getAll)
router.get('/:id', food.getById)
router.post('/', verifyToken, food.create)
router.put('/:id', verifyToken, food.update)
router.delete('/:id', verifyToken, food.remove)

export default router
