import { Router } from 'express'
import { createProfile, getProfile, getStreak } from '../controllers/profileController.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/', verifyToken, createProfile)
router.get('/', verifyToken, getProfile)
router.get('/streak', verifyToken, getStreak)

export default router
