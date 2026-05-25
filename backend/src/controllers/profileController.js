import { Profile, Meal } from '../models/index.js'

export async function createProfile(req, res) {
  try {
    const {
      weight, height, age, gender,
      activityFactor, objective,
      basalMetabolicRate, totalDailyEnergyExpenditure,
    } = req.body

    if (!weight || !height || !age || !gender || !activityFactor || !objective) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' })
    }

    const existing = await Profile.findByPk(req.userId)
    if (existing) {
      await existing.update({
        weight, height, age, gender,
        activityFactor, objective,
        basalMetabolicRate, totalDailyEnergyExpenditure,
      })
      return res.json({ message: 'Perfil actualizado', profile: existing })
    }

    const profile = await Profile.create({
      user_id: req.userId,
      weight, height, age, gender,
      activityFactor, objective,
      basalMetabolicRate, totalDailyEnergyExpenditure,
    })

    res.status(201).json({ message: 'Perfil creado', profile })
  } catch (error) {
    console.error('Create profile error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function getProfile(req, res) {
  try {
    const profile = await Profile.findByPk(req.userId)
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' })
    }
    res.json({ profile })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function getStreak(req, res) {
  try {
    const profile = await Profile.findByPk(req.userId, {
      include: [{ model: Meal, through: { attributes: [] } }],
    })
    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' })
    }

    const mealCount = (profile.Meals || []).length
    const daysComplete = Math.min(mealCount, 7)
    const streak = mealCount > 0 ? Math.max(1, Math.min(mealCount, 7)) : 0

    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
    const history = weekDays.map((label, i) => ({
      label,
      done: i >= 7 - daysComplete,
    }))

    res.json({ streak, history, mealCount })
  } catch (error) {
    console.error('Get streak error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
