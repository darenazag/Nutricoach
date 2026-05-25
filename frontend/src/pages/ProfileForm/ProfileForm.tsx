import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './ProfileForm.css'

interface FormData {
  weight: string
  height: string
  age: string
  gender: '' | 'M' | 'F'
  activityFactor: '' | 'S' | 'A' | 'M'
  objective: '' | 'P' | 'M' | 'G'
}

const ACTIVITY_LABELS: Record<string, string> = {
  S: 'Sedentario (poco o ningún ejercicio)',
  A: 'Activo (ejercicio 3-5 días/semana)',
  M: 'Muy activo (ejercicio 6-7 días/semana)',
}

const OBJECTIVE_LABELS: Record<string, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  S: 1.2,
  A: 1.55,
  M: 1.9,
}

function ProfileForm() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({
    weight: '', height: '', age: '',
    gender: '', activityFactor: '', objective: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const bmr = useMemo(() => {
    const w = parseFloat(form.weight)
    const h = parseFloat(form.height)
    const a = parseFloat(form.age)
    if (!w || !h || !a || !form.gender) return null
    if (form.gender === 'M') return Math.round(10 * w + 6.25 * h - 5 * a + 5)
    return Math.round(10 * w + 6.25 * h - 5 * a - 161)
  }, [form.weight, form.height, form.age, form.gender])

  const tdee = useMemo(() => {
    if (bmr === null || !form.activityFactor) return null
    return Math.round(bmr * ACTIVITY_MULTIPLIER[form.activityFactor])
  }, [bmr, form.activityFactor])

  function update<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.weight || !form.height || !form.age || !form.gender || !form.activityFactor || !form.objective) {
      setError('Completa todos los campos')
      return
    }
    if (bmr === null || tdee === null) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3001/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weight: parseFloat(form.weight),
          height: parseFloat(form.height),
          age: parseFloat(form.age),
          gender: form.gender,
          activityFactor: form.activityFactor,
          objective: form.objective,
          basalMetabolicRate: bmr,
          totalDailyEnergyExpenditure: tdee,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
        return
      }

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

  return (
    <div className="pf-page">
      <div className="pf-card">
        <div className="pf-header">
          <h1 className="pf-title">Completa tu perfil</h1>
          <p className="pf-subtitle">Cuéntanos sobre ti para calcular tus metas</p>
        </div>

        <form onSubmit={handleSubmit} className="pf-form">
          {error && (
            <div className="pf-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="pf-row">
            <div className="pf-field">
              <label className="pf-label">Peso (kg)</label>
              <input
                type="number" step="0.1" min="20" max="300"
                className="pf-input"
                placeholder="Ej: 70"
                value={form.weight}
                onChange={e => update('weight', e.target.value)}
              />
            </div>
            <div className="pf-field">
              <label className="pf-label">Altura (cm)</label>
              <input
                type="number" step="1" min="100" max="250"
                className="pf-input"
                placeholder="Ej: 175"
                value={form.height}
                onChange={e => update('height', e.target.value)}
              />
            </div>
            <div className="pf-field">
              <label className="pf-label">Edad</label>
              <input
                type="number" step="1" min="10" max="120"
                className="pf-input"
                placeholder="Ej: 28"
                value={form.age}
                onChange={e => update('age', e.target.value)}
              />
            </div>
          </div>

          <div className="pf-field">
            <label className="pf-label">Género</label>
            <div className="pf-radio-group">
              <button
                type="button"
                className={`pf-radio-btn ${form.gender === 'M' ? 'pf-radio-btn--active' : ''}`}
                onClick={() => update('gender', 'M')}
              >
                <span className="pf-radio-icon">♂</span>
                Masculino
              </button>
              <button
                type="button"
                className={`pf-radio-btn ${form.gender === 'F' ? 'pf-radio-btn--active' : ''}`}
                onClick={() => update('gender', 'F')}
              >
                <span className="pf-radio-icon">♀</span>
                Femenino
              </button>
            </div>
          </div>

          <div className="pf-field">
            <label className="pf-label">Nivel de actividad</label>
            <div className="pf-radio-group pf-radio-group--col">
              {(['S', 'A', 'M'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  className={`pf-radio-btn pf-radio-btn--wide ${form.activityFactor === key ? 'pf-radio-btn--active' : ''}`}
                  onClick={() => update('activityFactor', key)}
                >
                  {ACTIVITY_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-field">
            <label className="pf-label">Objetivo</label>
            <div className="pf-radio-group pf-radio-group--col">
              {(['P', 'M', 'G'] as const).map(key => (
                <button
                  key={key}
                  type="button"
                  className={`pf-radio-btn pf-radio-btn--wide ${form.objective === key ? 'pf-radio-btn--active' : ''}`}
                  onClick={() => update('objective', key)}
                >
                  {OBJECTIVE_LABELS[key]}
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
