import { API_URL } from '../../config/api';
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import Header from '../../components/Header/Header'
import AIBubble from '../../components/AIBubble/AIBubble'
import { CaloriesBarChart } from '../../components/charts/CaloriesBarChart'
import { MacroPieChart } from '../../components/charts/MacroPieChart'
import { WeightLineChart } from '../../components/charts/WeightLineChart'
import './Profile.css'


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

interface RecomendacionMenuComida {
  categoria: string
  kcal: number
}

interface RecomendacionMenu {
  desayuno: RecomendacionMenuComida
  almuerzo: RecomendacionMenuComida
  cena: RecomendacionMenuComida
}

interface DiaProyeccion {
  dia: number
  calorias_consumidas: number
  balance_energetico: number
  peso_proyectado: number
  recomendacion_menu: RecomendacionMenu
}

interface RecommendationData {
  datos_usuario: { tmb: string; getd: string }
  objetivo_usuario: string
  proyeccion_diaria: DiaProyeccion[]
}

const objectiveForApi: Record<string, string> = {
  P: 'bajar',
  M: 'mantener',
  G: 'subir',
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

// Fallback local P0: sugerencias estáticas para la preview del "Menú sugerido de hoy".
// El menú IA completo (DeepSeek/Gemini + persistencia en Mongo) vive en /asistente-ia.
type SuggestedMealKey = 'desayuno' | 'almuerzo' | 'cena'
const MOCK_FOODS: Record<SuggestedMealKey, Record<string, string[]>> = {
  desayuno: {
    bajo:  ['2 huevos revueltos', '1 tostada integral', '1 café'],
    medio: ['Avena con leche', '1 plátano', '1 cda de mantequilla de maní'],
    alto:  ['Tortilla de 4 huevos', '2 tostadas', '½ aguacate', '1 zumo de naranja'],
  },
  almuerzo: {
    bajo:  ['Pechuga de pollo a la plancha', 'ensalada verde'],
    medio: ['Pollo a la plancha', 'arroz integral', 'ensalada'],
    alto:  ['Pollo grillé', 'arroz blanco', 'aguacate', 'ensalada completa'],
  },
  cena: {
    bajo:  ['Salmón a la plancha', 'ensalada ligera'],
    medio: ['Salmón a la plancha', 'ensalada mixta'],
    alto:  ['Salmón al horno', 'ensalada completa', '1 batata asada'],
  },
}

function getSuggestion(key: SuggestedMealKey, categoria: string): string[] {
  return MOCK_FOODS[key]?.[categoria] ?? ['Plato saludable equilibrado']
}

function Profile() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null)
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
      }).then(r => r.ok ? r.json() : { meals: [] }).catch(() => ({ meals: [] })),
      fetch(`${API_URL}/profile/streak`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([profileData, mealsData, streakData]) => {
        setProfile(profileData.profile)
        setMeals(mealsData.meals || [])
        setStreak(streakData)
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!profile || !user?.id) return
    const token = localStorage.getItem('token')
    if (!token) return

    const objective = objectiveForApi[profile.objective]
    if (!objective) return

    fetch(`${API_URL}/meals/recommend?userId=${user.id}&objective=${objective}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setRecommendation(data))
      .catch(() => {})
  }, [profile, user?.id])

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

  const projectionDays = recommendation?.proyeccion_diaria ?? []
  const weeklyWeightData = projectionDays.length > 0
    ? projectionDays.slice(0, 7).map(d => ({
        day: `Día ${d.dia}`,
        weight: Number(d.peso_proyectado ?? 0),
      }))
    : []

  const todayProjection = projectionDays[0]
  const todayRecommendation = todayProjection?.recomendacion_menu ?? null
  const suggestedMeals = todayRecommendation
    ? [
        { key: 'desayuno', label: 'Desayuno', info: todayRecommendation.desayuno },
        { key: 'almuerzo', label: 'Almuerzo', info: todayRecommendation.almuerzo },
        { key: 'cena', label: 'Cena', info: todayRecommendation.cena },
      ]
    : []
  const todayCalories = Number(todayProjection?.calorias_consumidas ?? 0)
  const todayBalance = Number(todayProjection?.balance_energetico ?? 0)
  const todayProjectedWeight = Number(todayProjection?.peso_proyectado ?? 0)
  const weightStart = Number(projectionDays[0]?.peso_proyectado ?? 0)
  const weightEnd = Number(projectionDays[projectionDays.length - 1]?.peso_proyectado ?? 0)

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

              {/* RECOMENDACIÓN DEL DÍA */}
              <section className="pcard pcard-recommend">
                <h2 className="pcard-title">
                  <span className="pcard-title-icon">📋</span>
                  Menú sugerido de hoy
                </h2>
                {todayRecommendation ? (
                  <>
                  <div className="prec-grid">
                    {suggestedMeals.map(({ key, label, info }) => {
                      const foods = getSuggestion(key as SuggestedMealKey, info.categoria)
                      return (
                        <div key={key} className={`prec-item prec-item--${info.categoria}`}>
                          <div className="prec-item-top">
                            <span className="prec-item-label">{label}</span>
                            <span className="prec-item-cat">{info.categoria}</span>
                            <span className="prec-item-kcal">{Number(info.kcal ?? 0)} kcal</span>
                          </div>
                          <div className="prec-item-foods">
                            <span className="prec-item-foods-label">Sugerencia:</span>
                            <span className="prec-item-foods-text">{foods.join(' · ')}</span>
                          </div>
                        </div>
                      )
                    })}
                    <div className="prec-total">
                      Total: {todayCalories} kcal
                    </div>
                  </div>
                  <div className="prec-summary">
                    <div className="prec-summary-item">
                      <span>Balance</span>
                      <strong>{todayBalance} kcal</strong>
                    </div>
                    <div className="prec-summary-item">
                      <span>Peso proyectado</span>
                      <strong>{todayProjectedWeight.toFixed(1)} kg</strong>
                    </div>
                  </div>
                  <Link to="/asistente-ia" className="prec-ai-cta">
                    <span className="prec-ai-cta-icon" aria-hidden="true">✨</span>
                    <span className="prec-ai-cta-text">Generar menú completo con IA</span>
                    <span className="prec-ai-cta-arrow" aria-hidden="true">→</span>
                  </Link>
                  </>
                ) : (
                  <p className="prec-empty">
                    {profile ? 'Generando recomendación…' : 'Completa tu perfil para generar una recomendación'}
                  </p>
                )}
              </section>

              {/* PROYECCIÓN 100 DÍAS */}
              {projectionDays.length > 0 && (
                <section className="pcard pcard-projection">
                  <h2 className="pcard-title">
                    <span className="pcard-title-icon">📈</span>
                    Proyección a 100 días
                  </h2>
                  <div className="pproj-summary">
                    <div className="pproj-stat">
                      <span className="pproj-stat-label">Peso inicial</span>
                      <span className="pproj-stat-value">{weightStart.toFixed(1)} kg</span>
                    </div>
                    <div className="pproj-stat">
                      <span className="pproj-stat-label">Peso final estimado</span>
                      <span className="pproj-stat-value">{weightEnd.toFixed(1)} kg</span>
                    </div>
                    <div className="pproj-stat">
                      <span className="pproj-stat-label">Cambio total</span>
                      <span className="pproj-stat-value pproj-stat-value--diff">
                        {weightStart && weightEnd ? (weightEnd - weightStart).toFixed(1) : '—'} kg
                      </span>
                    </div>
                  </div>
                  <div className="pproj-chart">
                    <WeightLineChart data={weeklyWeightData} />
                  </div>
                  <details className="pproj-details">
                    <summary>Ver tabla completa (100 días)</summary>
                    <div className="pproj-table-wrap">
                      <table className="pproj-table">
                        <thead>
                          <tr>
                            <th>Día</th>
                            <th>Calorías</th>
                            <th>Balance</th>
                            <th>Peso</th>
                            <th>Desayuno</th>
                            <th>Almuerzo</th>
                            <th>Cena</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectionDays.map(d => (
                            <tr key={d.dia}>
                              <td>{d.dia}</td>
                              <td>{d.calorias_consumidas}</td>
                              <td>{d.balance_energetico}</td>
                              <td>{Number(d.peso_proyectado ?? 0).toFixed(1)}</td>
                              <td className="pproj-cat">{d.recomendacion_menu.desayuno.categoria}</td>
                              <td className="pproj-cat">{d.recomendacion_menu.almuerzo.categoria}</td>
                              <td className="pproj-cat">{d.recomendacion_menu.cena.categoria}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </section>
              )}

              {/* MACROS DEL DÍA */}
              <section className="pcard pcard-macros">
                <h2 className="pcard-title">
                  Macros del día
                </h2>
                <MacroPieChart data={macrosData} />
              </section>

              {/* GRÁFICO: CALORÍAS vs OBJETIVO */}
              <CaloriesBarChart consumed={totalCalories} goal={calorieGoal} />

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
      <AIBubble />
    </>
  )
}

export default Profile
