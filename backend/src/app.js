import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import authRoutes from './routes/authRoutes.js'
import profileRoutes from './routes/profileRoutes.js'
import mealRoutes from './routes/mealRoutes.js'
import foodItemRoutes from './routes/foodItemRoutes.js'
import perfilRoutes from './routes/perfil/perfilRoutes.js'
import aiRoutes from './routes/aiRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

app.use(cors(corsOptions))
app.use(express.json())

app.use(express.static(join(__dirname, 'public')))

app.set('view engine', 'pug')
app.set('views', join(__dirname, 'views'))

app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/meals', mealRoutes)
app.use('/api/foods', foodItemRoutes)
app.use('/api/ai', aiRoutes)
app.use('/', perfilRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/logout', (_req, res) => {
  res.redirect('/')
})

export default app
