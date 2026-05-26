import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/useAuth'
import { Navigate, useNavigate } from 'react-router-dom'
import Header from '../../components/Header/Header'
import AIBubble from '../../components/AIBubble/AIBubble'
import MenuSugerido from '../../components/MenuSugerido/MenuSugerido'
import MealsSection from '../../components/MealsSection/MealsSection'
import { CaloriesBarChart } from '../../components/charts/CaloriesBarChart'
import { MacroPieChart } from '../../components/charts/MacroPieChart'
import { WeightLineChart } from '../../components/charts/WeightLineChart'
import { profileService } from '../../services/profileService'
import { mealService } from '../../services/mealService'
import type { ProfileData, Meal, StreakData, RecommendationData } from '../../types'
import { objectiveForApi, objectiveLabel, activityLabel, genderLabel } from '../../types'
import './Profile.css'


const CAT_COLORS: Record<string, string> = {
  bajo: '#4caf50',
  medio: '#ff9800',
  alto: '#f44336',
}

type Tab = 'perfil' | 'dashboard'

function Profile() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [meals, setMeals] = useState<Meal[]>([])
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('dashboard')
  const [todayIndex, setTodayIndex] = useState(0)
  const [suggestedKcal, setSuggestedKcal] = useState(0)

  const reloadMeals = useCallback(() => {
    Promise.all([
      mealService.getMyMeals(),
      profileService.getStreak(),
    ])
      .then(([mealsData, streakData]) => {
        setMeals(prev => {
          const mockMeals = prev.filter(m => m.meal_id < 0)
          return [...(mealsData.meals || []), ...mockMeals]
        })
        setStreak(streakData)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      profileService.get(),
      mealService.getMyMeals(),
      profileService.getStreak(),
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

  useEffect(() => {
    if (!profile || !user?.id) return
    const objective = objectiveForApi[profile.objective]
    if (!objective) return

    profileService.getRecommendation(user.id, objective)
      .then(data => setRecommendation(data))
      .catch(() => {})
  }, [profile, user?.id])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  const totalCalories = meals.reduce((s, m) => s + Number(m.calories), 0) + suggestedKcal
  const totalProtein  = meals.reduce((s, m) => s + Number(m.protein), 0)
  const totalCarbs    = meals.reduce((s, m) => s + Number(m.carbs), 0)
  const totalFat      = meals.reduce((s, m) => s + Number(m.fat), 0)

  const calorieGoal = profile?.totalDailyEnergyExpenditure || 2000
  const caloriePct = Math.round((totalCalories / calorieGoal) * 100)
  const circumference = 251.2
  const offset = circumference - (caloriePct / 100) * circumference

  const macroGoals = {
    protein: Math.round(calorieGoal * 0.3 / 4),
    carbs: Math.round(calorieGoal * 0.4 / 4),
    fat: Math.round(calorieGoal * 0.3 / 9),
  }

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

              <MenuSugerido
                projectionDays={projectionDays}
                todayIndex={todayIndex}
                onDayChange={setTodayIndex}
                objetivoUsuario={recommendation?.objetivo_usuario}
                tmb={recommendation?.datos_usuario?.tmb}
                getd={recommendation?.datos_usuario?.getd}
                onCompletedKcalChange={setSuggestedKcal}
              />

              {/* PROYECCIÓN 100 DÍAS */}
              {projectionDays.length > 0 && (
                <section className="pcard pcard-projection">
                  <h2 className="pcard-title">
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
                            <tr key={d.dia} className={todayIndex === d.dia - 1 ? 'pproj-row--active' : ''}>
                              <td>{d.dia}</td>
                              <td>{d.calorias_consumidas}</td>
                              <td>{d.balance_energetico}</td>
                              <td>{Number(d.peso_proyectado ?? 0).toFixed(1)}</td>
                              <td><span className="pproj-cat-dot" style={{ background: CAT_COLORS[d.recomendacion_menu.desayuno.categoria] }} />{d.recomendacion_menu.desayuno.categoria}</td>
                              <td><span className="pproj-cat-dot" style={{ background: CAT_COLORS[d.recomendacion_menu.almuerzo.categoria] }} />{d.recomendacion_menu.almuerzo.categoria}</td>
                              <td><span className="pproj-cat-dot" style={{ background: CAT_COLORS[d.recomendacion_menu.cena.categoria] }} />{d.recomendacion_menu.cena.categoria}</td>
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
              <CaloriesBarChart
                consumed={totalCalories}
                goal={calorieGoal}
                protein={totalProtein}
                carbs={totalCarbs}
                fat={totalFat}
              />

              <MealsSection
                meals={meals}
                onMealsChange={setMeals}
              />
            </>

          )}

        </div>
      </div>
      <AIBubble onMealAdded={reloadMeals} />
    </>
  )
}

export default Profile
