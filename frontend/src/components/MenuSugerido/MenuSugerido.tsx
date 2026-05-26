import { useState, useMemo, useCallback, useEffect } from 'react'
import type { DiaProyeccion } from '../../types'
import './MenuSugerido.css'

type MealType = 'desayuno' | 'almuerzo' | 'cena'

interface MenuSugeridoProps {
  projectionDays: DiaProyeccion[]
  todayIndex: number
  onDayChange: (index: number) => void
  objetivoUsuario?: string
  tmb?: string
  getd?: string
  onCompletedKcalChange?: (kcal: number) => void
}

const CAT_COLORS: Record<string, string> = {
  bajo: '#4caf50',
  medio: '#ff9800',
  alto: '#f44336',
}

const CAT_LABELS: Record<string, string> = {
  bajo: 'BAJO',
  medio: 'MEDIO',
  alto: 'ALTO',
}

const MEAL_META: Record<MealType, { label: string; icon: string }> = {
  desayuno: { label: 'Desayuno', icon: '🌅' },
  almuerzo: { label: 'Almuerzo', icon: '☀️' },
  cena: { label: 'Cena', icon: '🌙' },
}

const MOCK_FOODS: Record<MealType, Record<string, string[][]>> = {
  desayuno: {
    bajo: [
      ['2 huevos revueltos', '1 tostada integral', '1 café'],
      ['1 yogur griego', '1 puñado de almendras', '1 manzana'],
      ['1 batido de proteína', '1 plátano'],
    ],
    medio: [
      ['Avena con leche', '1 plátano', '1 cda mantequilla de maní'],
      ['3 huevos revueltos', '2 tostadas integrales', '½ aguacate'],
      ['Bowl de granola', 'yogur natural', 'frutos rojos'],
    ],
    alto: [
      ['Tortilla de 4 huevos', '2 tostadas', '1 aguacate', '1 jugo de naranja'],
      ['Panqueques de avena', 'miel', 'frutas variadas', '1 café con leche'],
    ],
  },
  almuerzo: {
    bajo: [
      ['Pechuga de pollo a la plancha', 'ensalada verde'],
      ['Filete de pescado al vapor', 'verduras salteadas'],
    ],
    medio: [
      ['Pollo a la plancha', 'arroz integral', 'ensalada'],
      ['Filete de res', 'puré de papas', 'ensalada fresca'],
      ['Pechuga de pollo', 'quinoa', 'verduras asadas'],
    ],
    alto: [
      ['Pollo grillé', 'arroz blanco', 'aguacate', 'ensalada completa'],
      ['Salmón glaseado', 'arroz basmati', 'espárragos salteados'],
      ['Lomo saltado', 'papas', 'ensalada criolla'],
    ],
  },
  cena: {
    bajo: [
      ['Salmón a la plancha', 'ensalada ligera'],
      ['Caldo de pollo con verduras', '1 rodaja de pan integral'],
    ],
    medio: [
      ['Salmón a la plancha', 'ensalada mixta'],
      ['Pechuga de pollo', 'verduras al vapor'],
      ['Tilapia', 'arroz', 'brócoli'],
    ],
    alto: [
      ['Salmón al horno', 'ensalada completa', '1 batata asada'],
      ['Lomo de cerdo', 'puré de batata', 'ensalada', 'pan'],
    ],
  },
}

export default function MenuSugerido({
  projectionDays,
  todayIndex,
  onDayChange,
  objetivoUsuario,
  tmb,
  getd,
  onCompletedKcalChange,
}: MenuSugeridoProps) {
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null)
  const [uncompletedMeals, setUncompletedMeals] = useState<Set<string>>(new Set())
  const [foodIndex, setFoodIndex] = useState<Record<string, number>>({})

  const todayProjection = projectionDays[todayIndex]
  const todayRecommendation = todayProjection?.recomendacion_menu ?? null

  const meals: { key: MealType; info: { categoria: string; kcal: number } }[] =
    todayRecommendation
      ? [
          { key: 'desayuno', info: todayRecommendation.desayuno },
          { key: 'almuerzo', info: todayRecommendation.almuerzo },
          { key: 'cena', info: todayRecommendation.cena },
        ]
      : []

  const totalKcal = useMemo(
    () => meals.reduce((s, m) => s + Number(m.info.kcal), 0),
    [meals],
  )

  const uncompletedKcal = useMemo(
    () =>
      meals.reduce((s, m) => {
        if (uncompletedMeals.has(`${todayIndex}-${m.key}`)) {
          return s + Number(m.info.kcal)
        }
        return s
      }, 0),
    [meals, uncompletedMeals, todayIndex],
  )

  const dynamicBalance = useMemo(() => {
    if (!todayProjection) return 0
    const plannedBalance = Number(todayProjection.balance_energetico)
    return plannedBalance - uncompletedKcal
  }, [todayProjection, uncompletedKcal])

  const balanceColor = useMemo(() => {
    if (!objetivoUsuario) return undefined
    if (objetivoUsuario.includes('Perder'))
      return dynamicBalance <= 0 ? '#4caf50' : '#f44336'
    if (objetivoUsuario.includes('Ganar'))
      return dynamicBalance >= 0 ? '#4caf50' : '#f44336'
    return Math.abs(dynamicBalance) <= 150 ? '#4caf50' : '#ff9800'
  }, [dynamicBalance, objetivoUsuario])

  const completedKcal = useMemo(
    () => totalKcal - uncompletedKcal,
    [totalKcal, uncompletedKcal],
  )

  useEffect(() => {
    onCompletedKcalChange?.(completedKcal)
  }, [completedKcal, onCompletedKcalChange])

  const balanceContext = useMemo(() => {
    if (!objetivoUsuario) return ''
    if (objetivoUsuario.includes('Perder')) {
      if (dynamicBalance < 0) return 'Déficit calórico ✓'
      if (dynamicBalance === 0) return 'Equilibrio'
      return 'Superávit — ajusta para perder peso'
    }
    if (objetivoUsuario.includes('Ganar')) {
      if (dynamicBalance > 0) return 'Superávit calórico ✓'
      if (dynamicBalance === 0) return 'Equilibrio'
      return 'Déficit — ajusta para ganar masa'
    }
    if (Math.abs(dynamicBalance) <= 150) return 'Equilibrio ✓'
    return dynamicBalance > 0
      ? 'Ligero superávit — ajusta para mantener'
      : 'Ligero déficit — ajusta para mantener'
  }, [dynamicBalance, objetivoUsuario])

  const toggleExpand = useCallback((mealType: MealType) => {
    setExpandedMeal(prev => (prev === mealType ? null : mealType))
  }, [])

  const toggleComplete = useCallback(
    (mealType: MealType) => {
      const key = `${todayIndex}-${mealType}`
      setUncompletedMeals(prev => {
        const next = new Set(prev)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    },
    [todayIndex],
  )

  const rotateMeal = useCallback(
    (mealType: MealType) => {
      const key = `${todayIndex}-${mealType}`
      setFoodIndex(prev => ({
        ...prev,
        [key]: (prev[key] ?? 0) + 1,
      }))
    },
    [todayIndex],
  )

  const isUncompleted = useCallback(
    (mealType: MealType) => uncompletedMeals.has(`${todayIndex}-${mealType}`),
    [uncompletedMeals, todayIndex],
  )

  const currentFoods = useCallback(
    (mealType: MealType, category: string) => {
      const key = `${todayIndex}-${mealType}`
      const idx = foodIndex[key] ?? 0
      const options = MOCK_FOODS[mealType]?.[category]
      if (!options || options.length === 0) return ['(sin alimentos)']
      return options[idx % options.length]
    },
    [foodIndex, todayIndex],
  )

  return (
    <section className="prec-card">
      <div className="prec-header">
        <h2 className="prec-title">
          Menú sugerido
          {projectionDays.length > 0 && (
            <span className="prec-title-sub">
              Día {todayIndex + 1} de {projectionDays.length}
            </span>
          )}
        </h2>
        {todayRecommendation && projectionDays.length > 1 && (
          <button
            className="prec-next-btn"
            onClick={() =>
              onDayChange((todayIndex + 1) % projectionDays.length)
            }
            type="button"
          >
            Siguiente →
          </button>
        )}
      </div>

      {todayRecommendation ? (
        <div className="prec-body" key={todayIndex}>
          {(objetivoUsuario || tmb || getd) && (
            <div className="prec-context">
              {objetivoUsuario && (
                <span className="prec-objective-badge">
                  🎯 {objetivoUsuario}
                </span>
              )}
              {(tmb || getd) && (
                <span className="prec-metabolic-ref">
                  {tmb && <>TMB {tmb}</>}
                  {tmb && getd && <span className="prec-sep">·</span>}
                  {getd && <>GETD {getd}</>}
                </span>
              )}
            </div>
          )}
          <div className="prec-meals">
            {meals.map(({ key, info }) => {
              const completed = !isUncompleted(key)
              const variants = MOCK_FOODS[key]?.[info.categoria]
              const canRotate = variants ? variants.length > 1 : false

              return (
                <div
                  key={key}
                  className={`prec-meal-item ${expandedMeal === key ? 'prec-meal-item--expanded' : ''} ${completed ? 'prec-meal-item--completed' : ''}`}
                >
                  <button
                    className="prec-meal-header"
                    onClick={() => toggleExpand(key)}
                    type="button"
                  >
                    <span className="prec-meal-icon">
                      {MEAL_META[key].icon}
                    </span>
                    <span className="prec-meal-label">
                      {MEAL_META[key].label}
                    </span>

                    <span
                      className={`prec-badge ${completed ? 'prec-badge--done' : ''}`}
                      style={
                        !completed
                          ? { background: CAT_COLORS[info.categoria] || '#999' }
                          : undefined
                      }
                    >
                      {completed ? (
                        <>✓ Logrado</>
                      ) : (
                        CAT_LABELS[info.categoria] || info.categoria
                      )}
                    </span>

                    <span className="prec-meal-kcal">
                      {Number(info.kcal)} kcal
                    </span>

                    {canRotate && (
                      <span
                        className="prec-rotate-btn"
                        onClick={e => {
                          e.stopPropagation()
                          rotateMeal(key)
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            rotateMeal(key)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        title="Cambiar alimentos"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                      </span>
                    )}

                    <span
                      className="prec-checkbox"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={() => toggleComplete(key)}
                      />
                      <span className="prec-checkmark" />
                    </span>

                    <svg
                      className={`prec-chevron ${expandedMeal === key ? 'prec-chevron--open' : ''}`}
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  <div
                    className={`prec-accordion ${expandedMeal === key ? 'prec-accordion--open' : ''}`}
                  >
                    <div className="prec-accordion-inner">
                      <ul className="prec-food-list">
                        {currentFoods(key, info.categoria).map((food, i) => (
                          <li key={i} className="prec-food-item">
                            <span
                              className="prec-food-bullet"
                              style={{
                                background:
                                  CAT_COLORS[info.categoria] || '#999',
                              }}
                            />
                            {food}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="prec-total-bar">
            <span className="prec-total-label">Total del día</span>
            <span className="prec-total-kcal">{totalKcal} kcal</span>
          </div>

          <div className="prec-summary-grid">
            <div className="prec-summary-item">
              <span className="prec-summary-label">Balance</span>
              <strong
                className="prec-summary-value"
                style={balanceColor ? { color: balanceColor } : undefined}
              >
                {dynamicBalance > 0 ? '+' : ''}
                {dynamicBalance} kcal
              </strong>
              {balanceContext && (
                <span
                  className="prec-summary-context"
                  style={balanceColor ? { color: balanceColor } : undefined}
                >
                  {balanceContext}
                </span>
              )}
              {uncompletedKcal > 0 && (
                <span className="prec-summary-note">
                  ({uncompletedKcal} kcal sin consumir)
                </span>
              )}
            </div>
            <div className="prec-summary-item">
              <span className="prec-summary-label">Peso proyectado</span>
              <strong className="prec-summary-value">
                {Number(todayProjection?.peso_proyectado ?? 0).toFixed(1)} kg
              </strong>
            </div>
          </div>

          {projectionDays.length > 1 && (
            <div className="prec-carousel">
              <p className="prec-carousel-title">
                {todayIndex === projectionDays.length - 1
                  ? 'Días anteriores'
                  : 'Próximos días'}
              </p>
              <div className="prec-carousel-grid">
                {(() => {
                  const days = projectionDays.filter(
                    d => d.dia !== todayProjection?.dia,
                  )
                  const startIdx = Math.min(
                    days.findIndex(d => d.dia > (todayProjection?.dia ?? 0)),
                    days.length - 5,
                  )
                  return days
                    .slice(Math.max(0, startIdx), startIdx + 5)
                    .map(d => (
                      <button
                        key={d.dia}
                        className="prec-carousel-day"
                        onClick={() => onDayChange(d.dia - 1)}
                        type="button"
                      >
                        <span className="prec-carousel-label">
                          Día {d.dia}
                        </span>
                        <span className="prec-carousel-dots">
                          <span
                            className="prec-carousel-dot"
                            style={{
                              background:
                                CAT_COLORS[d.recomendacion_menu.desayuno
                                  .categoria],
                            }}
                          />
                          <span
                            className="prec-carousel-dot"
                            style={{
                              background:
                                CAT_COLORS[d.recomendacion_menu.almuerzo
                                  .categoria],
                            }}
                          />
                          <span
                            className="prec-carousel-dot"
                            style={{
                              background:
                                CAT_COLORS[d.recomendacion_menu.cena
                                  .categoria],
                            }}
                          />
                        </span>
                        <span className="prec-carousel-kcal">
                          {d.calorias_consumidas}
                        </span>
                      </button>
                    ))
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="prec-empty">Generando recomendación…</p>
      )}
    </section>
  )
}
