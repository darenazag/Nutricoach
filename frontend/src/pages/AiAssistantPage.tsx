import { useState, useEffect, useRef } from 'react'
import { Navigate, Link } from 'react-router-dom'
import Header from '../components/Header/Header'
import { useAuth } from '../context/useAuth'
import {
  sendAiChatMessage,
  sendAiWeeklyMenuRequest,
  getAiWeeklyMenuPlan,
} from '../services/aiApi'
import type {
  AiChatResponseData,
  AiObjective,
  AiWeeklyMenuPlanDto,
  AiWeeklyPlanStatus,
} from '../types/ai.types'
import { API_URL } from '../config/api'
import '../styles/aiAssistant.css'

// ── Types ──────────────────────────────────────────────────────────────────

type AssistantTab = 'chat' | 'menu' | 'plate'

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  data?: AiChatResponseData
}

interface ProfileSnapshot {
  objective: AiObjective
  caloriesTarget: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const OBJECTIVE_MAP: Record<string, AiObjective> = {
  P: 'lose_weight',
  M: 'maintain',
  G: 'gain_muscle',
}

const OBJECTIVE_LABELS: Record<AiObjective, string> = {
  lose_weight: 'Perder peso',
  maintain: 'Mantener peso',
  gain_muscle: 'Ganar músculo',
}

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const TERMINAL_STATUSES: AiWeeklyPlanStatus[] = ['completed', 'failed', 'partial_failed']

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ── Component ──────────────────────────────────────────────────────────────

export function AiAssistantPage() {
  const { user, isAuthenticated } = useAuth()
  const userId = user ? String(user.id) : ''

  // ── Tab ───────────────────────────────────────────────────────────────

  const [tab, setTab] = useState<AssistantTab>('chat')

  // ── Chat state ────────────────────────────────────────────────────────

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const conversationIdRef = useRef<string | undefined>(undefined)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Weekly menu state ─────────────────────────────────────────────────

  const [profile, setProfile] = useState<ProfileSnapshot | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [mealsPerDay, setMealsPerDay] = useState('3')
  const [menuNotes, setMenuNotes] = useState('')
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuError, setMenuError] = useState<string | null>(null)
  const [plan, setPlan] = useState<AiWeeklyMenuPlanDto | null>(null)
  const pollingRef = useRef<number | null>(null)

  // ── Effects ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r =>
        r.ok
          ? (r.json() as Promise<{ profile: { objective: string; totalDailyEnergyExpenditure: number } }>)
          : Promise.reject(new Error('profile_fetch_failed')),
      )
      .then(data => {
        const obj = OBJECTIVE_MAP[data.profile.objective] ?? 'maintain'
        setProfile({
          objective: obj,
          caloriesTarget: Math.round(data.profile.totalDailyEnergyExpenditure) || 2000,
        })
      })
      .catch(() => setProfile({ objective: 'maintain', caloriesTarget: 2000 }))
      .finally(() => setProfileLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (pollingRef.current !== null) clearInterval(pollingRef.current)
    }
  }, [])

  // ── Auth guard (after all hooks) ──────────────────────────────────────

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // ── Handlers ──────────────────────────────────────────────────────────

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || chatLoading) return

    setChatInput('')
    setChatError(null)
    setMessages(prev => [...prev, { id: msgId(), role: 'user', text: trimmed }])
    setChatLoading(true)

    const result = await sendAiChatMessage({
      userId,
      conversationId: conversationIdRef.current,
      message: trimmed,
      plan: 'free',
    })

    setChatLoading(false)

    if (!result.success || !result.data) {
      setChatError(result.error?.message ?? 'Error al contactar el asistente')
      return
    }

    const data = result.data
    conversationIdRef.current = data.conversationId
    setMessages(prev => [...prev, { id: msgId(), role: 'ai', text: data.responseText, data }])
  }

  function stopPolling() {
    if (pollingRef.current !== null) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  async function handleGenerateMenu() {
    if (!profile || menuLoading) return

    stopPolling()
    setPlan(null)
    setMenuError(null)
    setMenuLoading(true)

    const result = await sendAiWeeklyMenuRequest({
      userId,
      objective: profile.objective,
      caloriesTarget: profile.caloriesTarget,
      mealsPerDay: Number(mealsPerDay),
      notes: menuNotes.trim() || undefined,
      plan: 'free',
    })

    setMenuLoading(false)

    if (!result.success || !result.data) {
      setMenuError(result.error?.message ?? 'Error al iniciar la generación del menú')
      return
    }

    const planId = result.data.planId

    setPlan({
      planId,
      status: 'generating',
      userId,
      objective: profile.objective,
      caloriesTarget: profile.caloriesTarget,
      mealsPerDay: Number(mealsPerDay),
      totalDays: 7,
      completedDays: 0,
      progress: { completedDays: 0, totalDays: 7, percentage: 0 },
      days: [],
      usageEstimation: {
        providerCallsPlanned: 7,
        providerCallsCompleted: 0,
        cacheHits: 0,
        cacheMisses: 0,
        realTokensAvailable: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    pollingRef.current = window.setInterval(() => {
      void getAiWeeklyMenuPlan(planId).then(res => {
        if (!res.success || !res.data) return
        setPlan(res.data)
        if (TERMINAL_STATUSES.includes(res.data.status)) stopPolling()
      })
    }, 4000)
  }

  const isPlanRunning = !!plan && !TERMINAL_STATUSES.includes(plan.status)

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="ai-page">
      <Header />
      <div className="ai-page__container">

        <Link to="/perfil" className="ai-page__back">
          ← Volver al perfil
        </Link>

        <h1 className="ai-page__heading">🤖 Asistente IA</h1>

        <div className="ai-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chat'}
            className={`ai-tab${tab === 'chat' ? ' ai-tab--active' : ''}`}
            onClick={() => setTab('chat')}
          >
            💬 Chat
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'menu'}
            className={`ai-tab${tab === 'menu' ? ' ai-tab--active' : ''}`}
            onClick={() => setTab('menu')}
          >
            📅 Menú semanal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'plate'}
            className={`ai-tab${tab === 'plate' ? ' ai-tab--active' : ''}`}
            onClick={() => setTab('plate')}
          >
            📸 Análisis
          </button>
        </div>

        {/* ── CHAT ──────────────────────────────────────────────────── */}

        {tab === 'chat' && (
          <div className="ai-card">
            <div className="ai-chat__messages" role="log" aria-live="polite">
              {messages.length === 0 && !chatLoading && (
                <div className="ai-chat__empty">
                  <span className="ai-chat__empty-icon">🥦</span>
                  <p className="ai-chat__empty-text">
                    Pregúntame sobre nutrición, calorías, recetas saludables o cualquier duda alimentaria.
                  </p>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`ai-msg ai-msg--${msg.role}`}>
                  <div className="ai-msg__text">{msg.text}</div>

                  {msg.role === 'ai' && msg.data && (
                    <div className="ai-msg__sections">
                      {msg.data.safety?.isOutOfScope ? (
                        <p className="ai-out-of-scope">
                          {msg.data.safety.escalationMessage ??
                            'Esta consulta está fuera del alcance nutricional de NutriCoach.'}
                        </p>
                      ) : (
                        <>
                          {msg.data.structuredData.recommendations.length > 0 && (
                            <div>
                              <p className="ai-section-label">Recomendaciones</p>
                              <ul className="ai-recs-list">
                                {msg.data.structuredData.recommendations.map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.data.structuredData.warnings.length > 0 && (
                            <div>
                              <p className="ai-section-label">Avisos</p>
                              <ul className="ai-warn-list">
                                {msg.data.structuredData.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.data.structuredData.followUpQuestions.length > 0 && (
                            <div>
                              <p className="ai-section-label">Preguntas de seguimiento</p>
                              <div className="ai-followup-chips">
                                {msg.data.structuredData.followUpQuestions.map((q, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    className="ai-followup-chip"
                                    onClick={() => void handleSend(q)}
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="ai-msg ai-msg--ai">
                  <div className="ai-typing">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} aria-hidden="true" />
            </div>

            {chatError && (
              <p className="ai-error" role="alert">{chatError}</p>
            )}

            <form
              className="ai-chat__form"
              onSubmit={e => { e.preventDefault(); void handleSend(chatInput) }}
            >
              <textarea
                className="ai-chat__input"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void handleSend(chatInput)
                  }
                }}
                placeholder="Pregunta sobre nutrición… (Enter para enviar, Shift+Enter nueva línea)"
                rows={1}
                disabled={chatLoading}
                aria-label="Mensaje"
              />
              <button
                type="submit"
                className="ai-chat__send"
                disabled={chatLoading || !chatInput.trim()}
                aria-label="Enviar mensaje"
              >
                ↑
              </button>
            </form>
          </div>
        )}

        {/* ── WEEKLY MENU ───────────────────────────────────────────── */}

        {tab === 'menu' && (
          <div className="ai-card">
            {profileLoading ? (
              <p className="ai-loading-text">Cargando tu perfil…</p>
            ) : (
              <>
                {profile && (
                  <div className="ai-menu__profile-info">
                    <span className="ai-menu__profile-badge">
                      <span>Objetivo:</span>
                      <strong>{OBJECTIVE_LABELS[profile.objective]}</strong>
                    </span>
                    <span className="ai-menu__profile-badge">
                      <span>Calorías diarias:</span>
                      <strong>{profile.caloriesTarget} kcal</strong>
                    </span>
                  </div>
                )}

                <div className="ai-menu__form-row">
                  <div className="ai-menu__field">
                    <label className="ai-menu__label" htmlFor="ai-meals-per-day">
                      Comidas por día
                    </label>
                    <select
                      id="ai-meals-per-day"
                      className="ai-menu__select"
                      value={mealsPerDay}
                      onChange={e => setMealsPerDay(e.target.value)}
                      disabled={menuLoading || isPlanRunning}
                    >
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={String(n)}>
                          {n} {n === 1 ? 'comida' : 'comidas'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="ai-menu__field" style={{ marginBottom: '20px' }}>
                  <label className="ai-menu__label" htmlFor="ai-menu-notes">
                    Preferencias o restricciones (opcional)
                  </label>
                  <textarea
                    id="ai-menu-notes"
                    className="ai-menu__notes"
                    value={menuNotes}
                    onChange={e => setMenuNotes(e.target.value)}
                    placeholder="Ej: sin gluten, vegetariano, no me gusta el pescado, recetas rápidas…"
                    disabled={menuLoading || isPlanRunning}
                  />
                </div>

                {menuError && (
                  <p className="ai-error" role="alert">{menuError}</p>
                )}

                <button
                  type="button"
                  className="ai-btn"
                  onClick={() => void handleGenerateMenu()}
                  disabled={menuLoading || isPlanRunning || !profile}
                >
                  {menuLoading
                    ? 'Iniciando…'
                    : isPlanRunning
                    ? 'Generando…'
                    : '✨ Generar menú semanal'}
                </button>
              </>
            )}

            {plan && (
              <>
                <div className="ai-divider" />

                <div className="ai-progress__header">
                  <span className="ai-progress__label">
                    {plan.completedDays} / {plan.totalDays} días generados
                  </span>
                  <span className={`ai-status ai-status--${plan.status}`}>
                    {plan.status === 'generating'
                      ? 'Generando…'
                      : plan.status === 'completed'
                      ? '✓ Completado'
                      : plan.status === 'partial_failed'
                      ? 'Parcialmente completado'
                      : plan.status === 'failed'
                      ? 'Error'
                      : plan.status}
                  </span>
                </div>

                <div className="ai-progress__bar">
                  <div
                    className="ai-progress__fill"
                    style={{ width: `${plan.progress.percentage}%` }}
                    role="progressbar"
                    aria-valuenow={plan.progress.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>

                {plan.days.length > 0 && (
                  <div className="ai-days">
                    {[...plan.days]
                      .sort((a, b) => a.dayNumber - b.dayNumber)
                      .map(day => (
                        <div key={day.dayNumber} className="ai-day">
                          <div className="ai-day__header">
                            <span className="ai-day__title">
                              {DAY_NAMES[day.dayNumber - 1] ?? `Día ${day.dayNumber}`}
                            </span>
                            <div className="ai-day__header-right">
                              {day.status === 'completed' && day.dailyCalories > 0 && (
                                <span className="ai-day__kcal">{day.dailyCalories} kcal</span>
                              )}
                              <span className={`ai-status ai-status--${day.status}`}>
                                {day.status === 'completed'
                                  ? '✓ Listo'
                                  : day.status === 'generating'
                                  ? '…'
                                  : day.status === 'failed'
                                  ? '✗ Error'
                                  : 'Pendiente'}
                              </span>
                            </div>
                          </div>

                          {day.status === 'completed' && day.meals.length > 0 ? (
                            <div className="ai-day__meals">
                              {day.meals.map((meal, i) => (
                                <div key={i} className="ai-day__meal">
                                  <span className="ai-day__meal-name">{meal.name}</span>
                                  {meal.description && (
                                    <span className="ai-day__meal-desc">{meal.description}</span>
                                  )}
                                  <div className="ai-day__meal-macros">
                                    <span className="ai-macro ai-macro--kcal">
                                      {meal.estimatedCalories} kcal
                                    </span>
                                    <span className="ai-macro ai-macro--p">
                                      {meal.estimatedProtein}g P
                                    </span>
                                    <span className="ai-macro ai-macro--hc">
                                      {meal.estimatedCarbs}g HC
                                    </span>
                                    <span className="ai-macro ai-macro--g">
                                      {meal.estimatedFat}g G
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : day.status === 'failed' ? (
                            <div className="ai-day__pending">
                              No se pudo generar este día. Los demás están disponibles.
                            </div>
                          ) : (
                            <div className="ai-day__pending">⏳ Pendiente</div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── PLATE ANALYSIS ────────────────────────────────────────── */}

        {tab === 'plate' && (
          <div className="ai-card">
            <div className="ai-plate-cta">
              <span className="ai-plate-cta__icon">📸</span>
              <h2 className="ai-plate-cta__title">Análisis de plato con IA</h2>
              <p className="ai-plate-cta__desc">
                Fotografía cualquier comida y obtén un análisis nutricional completo: calorías,
                proteínas, hidratos y grasas estimados con inteligencia artificial.
              </p>
              <div className="ai-plate-cta__features">
                <span className="ai-plate-cta__feature">Detección automática de alimentos</span>
                <span className="ai-plate-cta__feature">Estimación de macronutrientes</span>
                <span className="ai-plate-cta__feature">Recomendaciones personalizadas</span>
                <span className="ai-plate-cta__feature">Registro directo en tu diario</span>
              </div>
              <Link to="/registrar-comida" className="ai-plate-cta__btn">
                📷 Ir a Registrar comida
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
