import { FoodItem } from '../models/index.js'

export async function getAll(req, res) {
  try {
    const items = await FoodItem.findAll({ order: [['source', 'ASC']] })
    res.json({ foodItems: items })
  } catch (error) {
    console.error('Get food items error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function getById(req, res) {
  try {
    const item = await FoodItem.findByPk(req.params.id)
    if (!item) return res.status(404).json({ error: 'Alimento no encontrado' })
    res.json({ foodItem: item })
  } catch (error) {
    console.error('Get food item error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function create(req, res) {
  try {
    const { protein, calories, carbs, fat, source } = req.body
    if (protein == null || calories == null || carbs == null || fat == null || !source) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' })
    }
    const item = await FoodItem.create({ protein, calories, carbs, fat, source })
    res.status(201).json({ foodItem: item })
  } catch (error) {
    console.error('Create food item error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function update(req, res) {
  try {
    const item = await FoodItem.findByPk(req.params.id)
    if (!item) return res.status(404).json({ error: 'Alimento no encontrado' })
    const { protein, calories, carbs, fat, source } = req.body
    await item.update({ protein, calories, carbs, fat, source })
    res.json({ foodItem: item })
  } catch (error) {
    console.error('Update food item error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function remove(req, res) {
  try {
    const item = await FoodItem.findByPk(req.params.id)
    if (!item) return res.status(404).json({ error: 'Alimento no encontrado' })
    await item.destroy()
    res.json({ message: 'Alimento eliminado' })
  } catch (error) {
    console.error('Delete food item error:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
