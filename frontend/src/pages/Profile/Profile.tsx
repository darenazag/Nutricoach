import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { Navigate } from 'react-router-dom'
import Header from '../../components/Header/Header'
import './Profile.css'

/* =====================================================
   INTERFACES → MAPEO DIRECTO A TABLAS PostgreSQL
   ===================================================== */
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
  mealId: number
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  img: string | null
  source: string
}

/* =====================================================
   TRADUCCIONES
   ===================================================== */
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

/* Metas diarias de macros (según objetivo) */
const MACRO_GOALS = { protein: 160, carbs: 250, fat: 70 }

const MEAL_ICONS: Record<number, string> = {
  1: '🍗', 2: '🍚', 3: '🥗', 4: '🥤', 5: '🐟',
}

const API_URL = 'http://localhost:3001/api'

function Profile() {
  const { user, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setProfile(data.profile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const meals: Meal[] = []

  const totalCalories = meals.reduce((s, m) => s + m.calories, 0)
  const totalProtein  = meals.reduce((s, m) => s + m.protein, 0)
  const totalCarbs    = meals.reduce((s, m) => s + m.carbs, 0)
  const totalFat      = meals.reduce((s, m) => s + m.fat, 0)

  return (
    <>
      <Header />
      <div className="profile-page">
        <div className="profile-dashboard">

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
              <a href="/completar-perfil" className="pcard-empty-cta">Ir al formulario</a>
            </div>
          ) : (
            <>
              {/* CARD 1 — DATOS DEL USUARIO */}
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
              </section>

              {/* CARD 2 — META CALÓRICA */}
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
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2}
                      />
                    </svg>
                    <div className="pcard-ring-center">
                      <span className="pcard-ring-number">{totalCalories}</span>
                      <span className="pcard-ring-label">kcal</span>
                    </div>
                  </div>
                  <div className="pcard-ring-meta">
                    Meta: <strong>{profile.totalDailyEnergyExpenditure} kcal</strong>
                    <br />
                    TMB: <strong>{profile.basalMetabolicRate} kcal</strong>
                  </div>
                </div>
              </section>

              {/* CARD 3 — MACROS */}
              <section className="pcard pcard-macros">
                <h2 className="pcard-title">
                  <span className="pcard-title-icon">📊</span>
                  Macros del día
                </h2>

                <div className="pcard-macros-list">
                  <MacroBar label="Proteína" consumed={totalProtein} goal={MACRO_GOALS.protein} pct={0} color="var(--color-protein, #2196f3)" />
                  <MacroBar label="Carbohidratos" consumed={totalCarbs} goal={MACRO_GOALS.carbs} pct={0} color="var(--color-carbs, #9c27b0)" />
                  <MacroBar label="Grasa" consumed={totalFat} goal={MACRO_GOALS.fat} pct={0} color="var(--color-fat, #ff5722)" />
                </div>
              </section>

              {/* CARD 4 — COMIDAS */}
              <section className="pcard pcard-meals">
                <h2 className="pcard-title">
                  <span className="pcard-title-icon">🍽️</span>
                  Comidas registradas
                </h2>

                {meals.length === 0 ? (
                  <p style={{ color: 'var(--pcolor-text-light, #7a6b5a)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                    Aún no tienes comidas registradas hoy
                  </p>
                ) : (
                  <div className="pcard-meals-grid">
                    {meals.map((meal) => (
                      <article key={meal.mealId} className="pcard-meal">
                        <div className="pcard-meal-img">
                          {MEAL_ICONS[meal.mealId] ?? '🍲'}
                        </div>
                        <div className="pcard-meal-body">
                          <h3 className="pcard-meal-name">{meal.name}</h3>
                          <p className="pcard-meal-source">{meal.source}</p>
                          <div className="pcard-meal-macros">
                            <span className="pcard-meal-macro pcard-meal-macro--kcal">{meal.calories} kcal</span>
                            <span className="pcard-meal-macro pcard-meal-macro--protein">{meal.protein}g</span>
                            <span className="pcard-meal-macro pcard-meal-macro--carbs">{meal.carbs}g</span>
                            <span className="pcard-meal-macro pcard-meal-macro--fat">{meal.fat}g</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

        </div>
      </div>
    </>
  )
}

function MacroBar({ label, consumed, goal, pct, color }: {
  label: string; consumed: number; goal: number; pct: number; color: string
}) {
  return (
    <div className="pmacro">
      <div className="pmacro-header">
        <span className="pmacro-name">
          <span className="pmacro-dot" style={{ background: color }} />
          {label}
        </span>
        <span className="pmacro-values">{consumed} / {goal} g</span>
      </div>
      <div className="pmacro-bar">
        <div className="pmacro-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default Profile
