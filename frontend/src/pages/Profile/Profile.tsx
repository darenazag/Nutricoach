import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { Navigate, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header'
import AIBubble from '../../components/AIBubble/AIBubble'
import { CaloriesBarChart } from '../../components/charts/CaloriesBarChart'
import { MacroPieChart } from '../../components/charts/MacroPieChart'
import { WeightLineChart } from '../../components/charts/WeightLineChart'
import './Profile.css'

const API_URL = 'http://localhost:3001/api'

interface ProfileData {
  weight: number
  age: number
  height: number
  gender: 'M' | 'F'
  activityFactor: 'S' | 'A' | 'M'
  objective: 'P' | 'M' | 'G'
  basalMetabolicRate: number
  totalDailyEnergyExpenditure: number
}

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

interface StreakData {
  streak: number
  history: { label: string; done: boolean }[]
  mealCount: number
}

const objectiveLabel: Record<string, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
}

const activityLabel: Record<string, string> = {
  S: 'Sedentario',
  A: 'Activo',
  M: 'Muy activo',
}

const genderLabel: Record<string, string> = {
  M: 'Masculino',
  F: 'Femenino',
}

const MEAL_ICONS = ['🍗', '🍚', '🥗', '🥤', '🐟', '🥩', '🥑', '🍳']

const MEAL_CATEGORIES = [
  { id: 'Desayuno', icon: '🌅', hour: '07:00 - 09:00' },
  { id: 'Almuerzo', icon: '☀️', hour: '12:00 - 14:00' },
  { id: 'Merienda', icon: '🌤️', hour: '16:00 - 17:00' },
  { id: 'Cena', icon: '🌙', hour: '20:00 - 21:00' },
] as const

function cleanSource(source: string | null) {
  return source?.replace(/\s*-\s*(desayuno|almuerzo|merienda|cena)$/i, '') || ''
}

type Tab = 'perfil' | 'dashboard'

function Profile() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    Promise.all([
      fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API_URL}/meals/profile/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API_URL}/profile/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([profileData, mealsData, streakData]) => {
        setProfile(profileData.profile)
        setMeals(mealsData.meals || [])
        setStreak(streakData)
      })
      .catch(() => {
        setProfile(null)
        setMeals([])
        setStreak(null)
      })
      .finally(() => setLoading(false))
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const totalCalories = meals.reduce((s, m) => s + Number(m.calories), 0)
  const totalProtein  = meals.reduce((s, m) => s + Number(m.protein), 0)
  const totalCarbs    = meals.reduce((s, m) => s + Number(m.carbs), 0)
  const totalFat      = meals.reduce((s, m) => s + Number(m.fat), 0)

  const calorieGoal = profile?.totalDailyEnergyExpenditure || 2000
  const caloriePct = Math.min(Math.round((totalCalories / calorieGoal) * 100), 100)
  const circumference = 251.2
  const offset = circumference - (caloriePct / 100) * circumference

  const macroGoals = {
    protein: Math.round(calorieGoal * 0.3 / 4),
    carbs: Math.round(calorieGoal * 0.4 / 4),
    fat: Math.round(calorieGoal * 0.3 / 9),
  }

  const reloadMeals = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    Promise.all([
      fetch(`${API_URL}/meals/profile/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API_URL}/profile/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : Promise.reject()),
    ])
      .then(([mealsData, streakData]) => {
        setMeals(mealsData.meals || [])
        setStreak(streakData)
      })
      .catch(() => {})
  }, [])

  const mealsByCategory: Record<string, Meal[]> = {
    Desayuno: [],
    Almuerzo: [],
    Merienda: [],
    Cena: [],
  }
  meals.forEach((meal, i) => {
    const catMatch = meal.source?.match(/-\s*(desayuno|almuerzo|merienda|cena)$/i)
    let key: string
    if (catMatch) {
      const map: Record<string, string> = { desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda', cena: 'Cena' }
      key = map[catMatch[1].toLowerCase()] || MEAL_CATEGORIES[i % MEAL_CATEGORIES.length].id
    } else {
      key = MEAL_CATEGORIES[i % MEAL_CATEGORIES.length].id
    }
    mealsByCategory[key].push(meal)
  })

  const streakDays = streak?.history ?? [
    { label: 'L', done: false },
    { label: 'M', done: false },
    { label: 'M', done: false },
    { label: 'J', done: false },
    { label: 'V', done: false },
    { label: 'S', done: false },
    { label: 'D', done: false },
  ]
  const streakCount = streak?.streak ?? 0

  const macrosData = [
    { name: 'Proteína', consumed: totalProtein, goal: macroGoals.protein, color: '#2196f3' },
    { name: 'Carbohidratos', consumed: totalCarbs, goal: macroGoals.carbs, color: '#9c27b0' },
    { name: 'Grasa', consumed: totalFat, goal: macroGoals.fat, color: '#ff5722' },
  ]

  const baseWeight = profile?.weight ?? 70
  const weeklyWeightData = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, i) => ({
    day,
    weight: Math.round((baseWeight + (i - 6) * 0.2 + (Math.random() - 0.5) * 0.3) * 10) / 10,
  }))

  return (
    <>
      <Header />
      <div className="profile-page">
        <div className="profile-dashboard">

          <div className="p-tabs">
            <button
              className={`p-tab ${tab === 'dashboard' ? 'p-tab--active' : ''}`}
              onClick={() => setTab('dashboard')}
              type="button"
            >
              Dashboard
            </button>
            <button
              className={`p-tab ${tab === 'perfil' ? 'p-tab--active' : ''}`}
              onClick={() => setTab('perfil')}
              type="button"
            >
              Perfil
            </button>
          </div>

          {loading ? (
            <div className="pcard" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 24px' }}>
              <p style={{ color: 'var(--pcolor-text-light, #7a6b5a)', fontSize: '15px' }}>Cargando perfil...</p>
            </div>
          ) : !profile ? (
            <div className="pcard" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 24px' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>📋</p>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Completa tu perfil</h2>
              <p style={{ color: 'var(--pcolor-text-light, #7a6b5a)', marginBottom: '20px' }}>
                Aún no has registrado tus datos físicos
              </p>
              <button
                className="pcard-empty-cta"
                onClick={() => navigate('/objetivo')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
              >
                Ir al formulario
              </button>
            </div>
          ) : tab === 'perfil' ? (

            <section className="pcard pcard-user">
              <div className="pcard-header-top">
                <div className="pcard-avatar-row">
                  <span className="pcard-avatar">
                    {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </span>
                  <div>
                    <h1 className="pcard-name">{user?.name ?? '—'}</h1>
                    <p className="pcard-email">{user?.email ?? '—'}</p>
                  </div>
                </div>
                <div className="pcard-tags">
                  <span className="pcard-tag pcard-tag--obj">
                    {objectiveLabel[profile.objective]}
                  </span>
                  <span className="pcard-tag pcard-tag--act">
                    {activityLabel[profile.activityFactor]}
                  </span>
                </div>
              </div>

              <div className="pcard-stats-grid">
                <div className="pcard-stat">
                  <span className="pcard-stat-label">Peso</span>
                  <span className="pcard-stat-value">{profile.weight} <small>kg</small></span>
                </div>
                <div className="pcard-stat">
                  <span className="pcard-stat-label">Altura</span>
                  <span className="pcard-stat-value">{profile.height} <small>cm</small></span>
                </div>
                <div className="pcard-stat">
                  <span className="pcard-stat-label">Edad</span>
                  <span className="pcard-stat-value">{profile.age} <small>años</small></span>
                </div>
                <div className="pcard-stat">
                  <span className="pcard-stat-label">Género</span>
                  <span className="pcard-stat-value">{genderLabel[profile.gender]}</span>
                </div>
              </div>

              <div className="pcard-detail">
                <div className="pcard-detail-row">
                  <span className="pcard-detail-label">Tasa metabólica basal</span>
                  <span className="pcard-detail-value">{profile.basalMetabolicRate} kcal</span>
                </div>
                <div className="pcard-detail-row">
                  <span className="pcard-detail-label">Gasto energético total</span>
                  <span className="pcard-detail-value">{profile.totalDailyEnergyExpenditure} kcal</span>
                </div>
              </div>

              <button
                className="pcard-edit-btn"
                onClick={() => navigate('/editar-perfil')}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
                Editar perfil
              </button>
            </section>

          ) : (

            <>
              {/* RACHA SEMANAL */}
              <section className="pcard pcard-streak">
                <div className="pcard-streak-left">
                  <span className="pcard-streak-fire">🔥</span>
                  <div>
                    <span className="pcard-streak-count">{streakCount}</span>
                    <span className="pcard-streak-label">días de racha</span>
                  </div>
                </div>
                <div className="pcard-streak-days">
                  {streakDays.map((day, i) => (
                    <div key={i} className={`pcard-streak-day ${day.done ? 'pcard-streak-day--done' : ''}`}>
                      {day.done ? '🔥' : day.label}
                    </div>
                  ))}
                </div>
              </section>

              {/* META CALÓRICA */}
              <section className="pcard pcard-calories">
                <h2 className="pcard-title">
                  <span className="pcard-title-icon">🔥</span>
                  Meta calórica
                </h2>

                <div className="pcard-ring-wrap">
                  <div className="pcard-ring">
                    <svg viewBox="0 0 100 100">
                      <circle className="pcard-ring-bg" cx="50" cy="50" r="40" />
                      <circle className="pcard-ring-fg" cx="50" cy="50" r="40"
                        strokeDasharray={circumference.toString()}
                        strokeDashoffset={offset.toString()}
                      />
                    </svg>
                    <div className="pcard-ring-center">
                      <span className="pcard-ring-number">{totalCalories}</span>
                      <span className="pcard-ring-label">kcal</span>
                    </div>
                  </div>
                  <div className="pcard-ring-meta">
                    <span>Meta: <strong>{calorieGoal} kcal</strong></span>
                    <span>TMB: <strong>{profile.basalMetabolicRate} kcal</strong></span>
                  </div>
                </div>
              </section>

              {/* MACROS DEL DÍA */}
              <section className="pcard pcard-macros">
                <h2 className="pcard-title">
                  Macros del día
                </h2>
                <MacroPieChart data={macrosData} />
              </section>

              {/* GRÁFICO: CALORÍAS vs OBJETIVO */}
              <CaloriesBarChart consumed={totalCalories} goal={calorieGoal} />

              {/* GRÁFICO: EVOLUCIÓN SEMANAL */}
              <WeightLineChart data={weeklyWeightData} />

              {/* COMIDAS REGISTRADAS */}
              <section className="pcard pcard-meals">
                <div className="pcard-title-row">
                  <h2 className="pcard-title">
                    <span className="pcard-title-icon">🍽️</span>
                    Comidas registradas
                  </h2>
                  <button
                    className="pcard-add-btn"
                    onClick={() => navigate('/registrar-comida')}
                    type="button"
                  >
                    + Añadir
                  </button>
                </div>

                {meals.length === 0 ? (
                  <p style={{ color: 'var(--pcolor-text-light, #7a6b5a)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                    Aún no tienes comidas registradas hoy
                  </p>
                ) : (
                  <div className="pcard-meal-blocks">
                    {MEAL_CATEGORIES.map(cat => {
                      const catMeals = mealsByCategory[cat.id]
                      return (
                        <div key={cat.id} className="pcard-meal-block">
                          <div className="pcard-meal-block-header">
                            <span className="pcard-meal-block-icon">{cat.icon}</span>
                            <div>
                              <span className="pcard-meal-block-title">{cat.id}</span>
                              <span className="pcard-meal-block-hour">{cat.hour}</span>
                            </div>
                            {catMeals.length > 0 && (
                              <span className="pcard-meal-block-count">{catMeals.length} plato{catMeals.length > 1 ? 's' : ''}</span>
                            )}
                          </div>

                          {catMeals.length === 0 ? (
                            <button
                              className="pcard-meal-block-empty"
                              onClick={() => navigate(`/registrar-comida?categoria=${cat.id.toLowerCase()}`)}
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
                                <article key={meal.meal_id} className="pcard-meal">
                                  <div className="pcard-meal-img">
                                    {MEAL_ICONS[i % MEAL_ICONS.length]}
                                  </div>
                                  <div className="pcard-meal-body">
                                    <h3 className="pcard-meal-name">{meal.name}</h3>
                                    <p className="pcard-meal-source">{cleanSource(meal.source)}</p>
                                    <div className="pcard-meal-macros">
                                      <span className="pcard-meal-macro pcard-meal-macro--kcal">{Number(meal.calories)} kcal</span>
                                      <span className="pcard-meal-macro pcard-meal-macro--protein">{Number(meal.protein)}g</span>
                                      <span className="pcard-meal-macro pcard-meal-macro--carbs">{Number(meal.carbs)}g</span>
                                      <span className="pcard-meal-macro pcard-meal-macro--fat">{Number(meal.fat)}g</span>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </>

          )}

        </div>
      </div>
      <AIBubble onMealAdded={reloadMeals} />
    </>
  )
}

export default Profile
