import { API_URL } from '../../config/api';
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header'
import './MealLog.css'


interface Meal {
  meal_id: number
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  img: string | null
  source: string
}

const MEAL_ICONS = ['🍗', '🍚', '🥗', '🥤', '🐟', '🥩', '🥑', '🍳']

function MealLog() {
  const navigate = useNavigate()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    fetch(`${API_URL}/meals`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setMeals(data.meals || []))
      .catch(() => setMeals([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleAssign(mealId: number) {
    setAssigning(mealId)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${API_URL}/meals/profile/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mealId }),
      })
      if (res.ok) {
        navigate('/perfil')
      }
    } catch {
      // ignore
    } finally {
      setAssigning(null)
    }
  }

  return (
    <>
      <Header />
      <div className="ml-page">
        <div className="ml-container">
          <div className="ml-header">
            <button className="ml-back" onClick={() => navigate(-1)} aria-label="Volver">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="ml-title">Registrar comida</h1>
          </div>

          <p className="ml-subtitle">Selecciona una comida para añadir a tu día</p>

          {loading ? (
            <p className="ml-empty">Cargando comidas...</p>
          ) : meals.length === 0 ? (
            <p className="ml-empty">No hay comidas disponibles</p>
          ) : (
            <div className="ml-grid">
              {meals.map((meal, i) => (
                <div key={meal.meal_id} className="ml-card">
                  <div className="ml-card-icon">
                    {MEAL_ICONS[i % MEAL_ICONS.length]}
                  </div>
                  <div className="ml-card-body">
                    <h3 className="ml-card-name">{meal.name}</h3>
                    <p className="ml-card-source">{meal.source}</p>
                    <div className="ml-card-macros">
                      <span className="ml-macro ml-macro--kcal">{Number(meal.calories)} kcal</span>
                      <span className="ml-macro ml-macro--protein">{Number(meal.protein)}g P</span>
                      <span className="ml-macro ml-macro--carbs">{Number(meal.carbs)}g C</span>
                      <span className="ml-macro ml-macro--fat">{Number(meal.fat)}g G</span>
                    </div>
                  </div>
                  <button
                    className="ml-add-btn"
                    onClick={() => handleAssign(meal.meal_id)}
                    disabled={assigning === meal.meal_id}
                    type="button"
                  >
                    {assigning === meal.meal_id ? '...' : '+'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default MealLog
