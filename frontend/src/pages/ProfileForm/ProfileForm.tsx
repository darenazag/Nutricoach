import { API_URL } from '../../config/api';
import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './ProfileForm.css'

const ACTIVITY_LABELS: Record<string, string> = {
  S: 'Sedentario (poco o ningún ejercicio)',
  A: 'Activo (ejercicio 3-5 días/semana)',
  M: 'Muy activo (ejercicio 6-7 días/semana)',
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  S: 1.2,
  A: 1.55,
  M: 1.9,
}

function ProfileForm() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const objective = (sessionStorage.getItem('objective') || '') as '' | 'P' | 'M' | 'G'
  const gender = (sessionStorage.getItem('gender') || '') as '' | 'M' | 'F'
  const age = sessionStorage.getItem('age') || ''
  const height = sessionStorage.getItem('height') || ''
  const weight = sessionStorage.getItem('weight') || ''

  const [activityFactor, setActivityFactor] = useState<'' | 'S' | 'A' | 'M'>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (submittedRef.current) return
    if (!objective || !gender || !age || !height || !weight) {
      navigate('/objetivo', { replace: true })
    }
  }, [objective, gender, age, height, weight, navigate])

  const w = parseFloat(weight)
  const h = parseFloat(height)
  const a = parseFloat(age)

  const bmr = useMemo(() => {
    if (!w || !h || !a || !gender) return null
    if (gender === 'M') return Math.round(10 * w + 6.25 * h - 5 * a + 5)
    return Math.round(10 * w + 6.25 * h - 5 * a - 161)
  }, [w, h, a, gender])

  const tdee = useMemo(() => {
    if (bmr === null || !activityFactor) return null
    return Math.round(bmr * ACTIVITY_MULTIPLIER[activityFactor])
  }, [bmr, activityFactor])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!activityFactor) {
      setError('Selecciona tu nivel de actividad')
      return
    }
    if (bmr === null || tdee === null) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weight: w,
          height: h,
          age: a,
          gender,
          activityFactor,
          objective,
          basalMetabolicRate: bmr,
          totalDailyEnergyExpenditure: tdee,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
        return
      }

      submittedRef.current = true
      sessionStorage.removeItem('objective')
      sessionStorage.removeItem('gender')
      sessionStorage.removeItem('age')
      sessionStorage.removeItem('height')
      sessionStorage.removeItem('weight')

      navigate('/perfil')
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    navigate('/login', { replace: true })
    return null
  }

  const OBJECTIVE_LABELS: Record<string, string> = {
    P: 'Perder peso',
    M: 'Mantener peso',
    G: 'Ganar masa muscular',
  }

  return (
    <div className="pf-page">
      <div className="pf-card">
        <div className="pf-header">
          <h1 className="pf-title">Casi listo</h1>
          <p className="pf-subtitle">Solo falta tu nivel de actividad física</p>
        </div>

        <form onSubmit={handleSubmit} className="pf-form">
          {error && (
            <div className="pf-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="pf-summary">
            <div className="pf-summary-item">
              <span className="pf-summary-label">Objetivo</span>
              <span className="pf-summary-value">{OBJECTIVE_LABELS[objective] || '—'}</span>
            </div>
            <div className="pf-summary-item">
              <span className="pf-summary-label">Edad / Sexo</span>
              <span className="pf-summary-value">{age} años · {gender === 'M' ? 'Hombre' : 'Mujer'}</span>
            </div>
            <div className="pf-summary-item">
              <span className="pf-summary-label">Altura / Peso</span>
              <span className="pf-summary-value">{height} cm · {weight} kg</span>
            </div>
          </div>

          <div className="pf-field">
            <label className="pf-label">Nivel de actividad</label>
            <div className="pf-radio-group pf-radio-group--col">
              {(['S', 'A', 'M'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`pf-radio-btn pf-radio-btn--wide ${activityFactor === key ? 'pf-radio-btn--active' : ''}`}
                  onClick={() => setActivityFactor(key)}
                >
                  {ACTIVITY_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {bmr !== null && tdee !== null && (
            <div className="pf-results">
              <div className="pf-result">
                <span className="pf-result-label">Tasa metabólica basal</span>
                <span className="pf-result-value">{bmr} kcal</span>
              </div>
              <div className="pf-result pf-result--primary">
                <span className="pf-result-label">Gasto energético total</span>
                <span className="pf-result-value">{tdee} kcal</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="pf-submit">
            {loading ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileForm
