import jwt from 'jsonwebtoken'
import { Profile, User } from '../../models/index.js'

const objectiveLabel = { P: 'PERDER PESO', M: 'MANTENER PESO', G: 'GANAR MASA MUSCULAR' }
const activityLabel  = { S: 'SEDENTARIO',    A: 'ACTIVO',         M: 'MUY ACTIVO' }
const genderLabel    = { M: 'Masculino',     F: 'Femenino' }

export async function getPerfil(req, res) {
  try {
    const authHeader = req.headers.cookie
    /* Extraer token desde cookie o desde query param para demo */
    /* En producción usarías JWT en cookie HttpOnly */
    const token = req.query.token || null

    if (!token) {
      /* Fallback: datos demo si no hay token */
      return renderDemo(req, res)
    }

    let userId
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutricoach_dev_secret')
      userId = decoded.userId
    } catch {
      return renderDemo(req, res)
    }

    const userRecord = await User.findByPk(userId, {
      include: [{ model: Profile }],
    })

    if (!userRecord) return renderDemo(req, res)

    const profile = userRecord.Profile

    if (!profile) return renderDemo(req, res)

    const user = {
      name: userRecord.name,
      email: userRecord.email,
      initials: userRecord.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      objective_label: objectiveLabel[profile.objective] || '—',
      activity_label: activityLabel[profile.activityFactor] || '—',
      metrics: {
        weight: Number(profile.weight),
        height: Number(profile.height),
        age: Number(profile.age),
        gender_label: genderLabel[profile.gender] || '—',
      },
    }

    res.render('perfil', { title: 'Mi Perfil', user })
  } catch (error) {
    console.error('Perfil error:', error)
    renderDemo(req, res)
  }
}

function renderDemo(req, res) {
  const user = {
    name: 'Pepe',
    email: 'pepe@nutricoach.com',
    initials: 'P',
    objective_label: 'GANAR MASA MUSCULAR',
    activity_label: 'MUY ACTIVO',
    metrics: {
      weight: 78,
      height: 175,
      age: 28,
      gender_label: 'Masculino',
    },
  }
  res.render('perfil', { title: 'Mi Perfil', user })
}
