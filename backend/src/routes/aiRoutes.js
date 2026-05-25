import { Router } from 'express'
import multer from 'multer'
import { verifyToken } from '../middleware/authMiddleware.js'
import { analyzeImage, analyzePreview } from '../controllers/aiController.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const router = Router()

router.post('/analyze', verifyToken, upload.single('image'), analyzeImage)
router.post('/analyze-preview', verifyToken, upload.single('image'), analyzePreview)

export default router
