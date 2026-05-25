import { Router } from 'express'
import { getPerfil } from '../../controllers/perfil/perfilController.js'

const router = Router()

router.get('/perfil', getPerfil)

export default router
