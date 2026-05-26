import { useState } from 'react'
import type { Meal } from '../../types'
import MealCard from './MealCard'
import MealDrawer from './MealDrawer'
import './meals.css'

interface MealsSectionProps {
  meals: Meal[]
  onMealsChange: (meals: Meal[]) => void
}

const MEAL_CATEGORIES = [
  { id: 'Desayuno', icon: '🌅', hour: '07:00 - 09:00' },
  { id: 'Almuerzo', icon: '☀️', hour: '12:00 - 14:00' },
  { id: 'Merienda', icon: '🌤️', hour: '16:00 - 17:00' },
  { id: 'Cena', icon: '🌙', hour: '20:00 - 21:00' },
  { id: 'Otras', icon: '🍽️', hour: '' },
] as const

const CATEGORY_MAP: Record<string, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
}

function categorize(meal: Meal): string {
  const match = meal.source?.match(/-\s*(desayuno|almuerzo|merienda|cena)$/i)
  if (match) return CATEGORY_MAP[match[1].toLowerCase()] || 'Otras'
  return 'Otras'
}

export default function MealsSection({ meals, onMealsChange }: MealsSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerCategory, setDrawerCategory] = useState('')

  const mealsByCategory: Record<string, Meal[]> = {}
  for (const cat of MEAL_CATEGORIES) mealsByCategory[cat.id] = []
  for (const meal of meals) {
    const cat = categorize(meal)
    if (mealsByCategory[cat]) mealsByCategory[cat].push(meal)
  }

  const openDrawer = (category = '') => {
    setDrawerCategory(category)
    setDrawerOpen(true)
  }

  const handleAdd = (meal: Meal) => {
    onMealsChange([...meals, meal])
  }

  const handleDelete = (mealId: number) => {
    onMealsChange(meals.filter(m => m.meal_id !== mealId))
  }

  const handleEdit = (meal: Meal) => {
    const newName = prompt('Editar nombre:', meal.name)
    if (!newName || newName === meal.name) return
    onMealsChange(meals.map(m => m.meal_id === meal.meal_id ? { ...m, name: newName } : m))
  }

  return (
    <section className="pcard pcard-meals">
      <div className="pcard-title-row">
        <h2 className="pcard-title">
          <span className="pcard-title-icon">🍽️</span>
          Comidas registradas
        </h2>
        <button
          className="pcard-add-btn"
          onClick={() => openDrawer('')}
          type="button"
        >
          + Añadir
        </button>
      </div>

      {meals.length === 0 ? (
        <p className="meals-empty">
          Aún no tienes comidas registradas hoy
        </p>
      ) : (
        <div className="pcard-meal-blocks">
          {MEAL_CATEGORIES.map(cat => {
            const catMeals = mealsByCategory[cat.id] || []
            return (
              <div key={cat.id} className="pcard-meal-block">
                <div className="pcard-meal-block-header">
                  <span className="pcard-meal-block-icon">{cat.icon}</span>
                  <div>
                    <span className="pcard-meal-block-title">{cat.id}</span>
                    <span className="pcard-meal-block-hour">{cat.hour}</span>
                  </div>
                  {catMeals.length > 0 && (
                    <span className="pcard-meal-block-count">
                      {catMeals.length} plato{catMeals.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {catMeals.length === 0 ? (
                  <button
                    className="pcard-meal-block-empty"
                    onClick={() => openDrawer(cat.id)}
                    type="button"
                  >
                    <span className="pcard-meal-empty-icon">+</span>
                    <span className="pcard-meal-empty-text">
                      + Añadir <strong>{cat.id.toLowerCase()}</strong>
                    </span>
                  </button>
                ) : (
                  <div className="pcard-meal-block-items">
                    {catMeals.map((meal, i) => (
                      <MealCard
                        key={meal.meal_id}
                        meal={meal}
                        icon={['🍗', '🍚', '🥗', '🥤', '🐟', '🥩', '🥑', '🍳'][i % 8]}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <MealDrawer
        open={drawerOpen}
        category={drawerCategory}
        onClose={() => setDrawerOpen(false)}
        onAdd={handleAdd}
      />
    </section>
  )
}
