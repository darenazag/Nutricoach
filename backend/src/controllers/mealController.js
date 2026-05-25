import { Meal, FoodItem, Profile, ProfileMeal } from '../models/index.js'

export async function getAll(req, res) {
  try {
    const meals = await Meal.findAll({ include: [{ model: FoodItem, through: { attributes: [] } }] })
    res.json({ meals })
  } catch (error) {
    console.error('Get meals error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function getById(req, res) {
  try {
    const meal = await Meal.findByPk(req.params.id, {
      include: [{ model: FoodItem, through: { attributes: [] } }],
    })
    if (!meal) return res.status(404).json({ error: 'Comida no encontrada' })
    res.json({ meal })
  } catch (error) {
    console.error('Get meal error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function create(req, res) {
  try {
    const { name, calories, protein, fat, carbs, img, source, foodIds } = req.body
    if (!name || calories == null || protein == null || fat == null || carbs == null) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }

    const meal = await Meal.create({ name, calories, protein, fat, carbs, img, source })

    if (foodIds?.length) {
      const foods = await FoodItem.findAll({ where: { food_id: foodIds } })
      await meal.setFoodItems(foods)
    }

    const result = await Meal.findByPk(meal.meal_id, {
      include: [{ model: FoodItem, through: { attributes: [] } }],
    })
    res.status(201).json({ meal: result })
  } catch (error) {
    console.error('Create meal error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function update(req, res) {
  try {
    const meal = await Meal.findByPk(req.params.id)
    if (!meal) return res.status(404).json({ error: 'Comida no encontrada' })

    const { name, calories, protein, fat, carbs, img, source, foodIds } = req.body
    await meal.update({ name, calories, protein, fat, carbs, img, source })

    if (foodIds) {
      const foods = await FoodItem.findAll({ where: { food_id: foodIds } })
      await meal.setFoodItems(foods)
    }

    const result = await Meal.findByPk(meal.meal_id, {
      include: [{ model: FoodItem, through: { attributes: [] } }],
    })
    res.json({ meal: result })
  } catch (error) {
    console.error('Update meal error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function remove(req, res) {
  try {
    const meal = await Meal.findByPk(req.params.id)
    if (!meal) return res.status(404).json({ error: 'Comida no encontrada' })

    await meal.destroy()
    res.json({ message: 'Comida eliminada' })
  } catch (error) {
    console.error('Delete meal error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function getProfileMeals(req, res) {
  try {
    const profile = await Profile.findByPk(req.userId, {
      include: [{
        model: Meal,
        through: { attributes: [] },
        include: [{ model: FoodItem, through: { attributes: [] } }],
      }],
    })
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' })
    res.json({ meals: profile.Meals || [] })
  } catch (error) {
    console.error('Get profile meals error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function assignMealToProfile(req, res) {
  try {
    const { mealId, mealType } = req.body
    if (!mealId) return res.status(400).json({ error: 'mealId es obligatorio' })

    const meal = await Meal.findByPk(mealId)
    if (!meal) return res.status(404).json({ error: 'Comida no encontrada' })

    if (mealType) {
      const clean = meal.source ? meal.source.replace(/\s*-\s*(desayuno|almuerzo|merienda|cena)$/i, '') : ''
      await meal.update({ source: `${clean || meal.source} - ${mealType.toLowerCase()}` })
    }

    const profile = await Profile.findByPk(req.userId)
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' })

    await profile.addMeal(meal)
    res.status(201).json({ message: 'Comida asignada al perfil' })
  } catch (error) {
    console.error('Assign meal error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function unassignMealFromProfile(req, res) {
  try {
    const meal = await Meal.findByPk(req.params.mealId)
    if (!meal) return res.status(404).json({ error: 'Comida no encontrada' })

    const profile = await Profile.findByPk(req.userId)
    if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' })

    await profile.removeMeal(meal)
    res.json({ message: 'Comida desasignada del perfil' })
  } catch (error) {
    console.error('Unassign meal error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
