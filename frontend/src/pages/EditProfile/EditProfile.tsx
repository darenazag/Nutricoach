
import { API_URL } from '../../config/api';
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './EditProfile.css'


const ACTIVITY_LABELS: Record<string, string> = {
  S: 'Sedentario (poco o ningún ejercicio)',
  A: 'Activo (ejercicio 3-5 días/semana)',
  M: 'Muy activo (ejercicio 6-7 días/semana)',
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  S: 1.2,
  A: 1.55,
  M: 1.725,
}

const OBJECTIVE_LABELS: Record<string, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
}

function EditProfile() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'' | 'M' | 'F'>('')
  const [activityFactor, setActivityFactor] = useState<'' | 'S' | 'A' | 'M'>('')
  const [objective, setObjective] = useState<'' | 'P' | 'M' | 'G'>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Redirección si el usuario no está autenticado globalmente
  useEffect(() => {
    if (!isAuthenticated && loading === false) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate, loading])

  // Carga de datos segura desde el servidor
  useEffect(() => {
    // 1. ESPERAR: Si el sistema no está autenticado todavía, no hacemos fetch
    if (!isAuthenticated) return

    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    fetch(`${API_URL}/profile`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error('Sesión expirada. Por favor, vuelve a iniciar sesión.')
        }
        if (res.status === 404) {
          // Si no hay perfil guardado aún, no es un error trágico, dejamos que lo rellene
          return null
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Error al obtener el perfil')
        }
        return res.json()
      })
      .then(data => {
        if (data && data.profile) {
          const p = data.profile
          setWeight(String(p.weight || ''))
          setHeight(String(p.height || ''))
          setAge(String(p.age || ''))
          setGender(p.gender || '')
          setActivityFactor(p.activityFactor || '')
          setObjective(p.objective || '')
        }
      })
      .catch((err) => {
        setError(err.message)
        if (err.message.includes('Sesión expirada')) {
          navigate('/login')
        }
      })
      .finally(() => setLoading(false))
  }, [isAuthenticated, navigate]) // <-- Dependencia clave: isAuthenticated

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

    if (!weight || !height || !age || !gender || !activityFactor || !objective) {
      setError('Completa todos los campos')
      return
    }
    if (bmr === null || tdee === null) return

    setSaving(true)
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

      navigate('/perfil')
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setSaving(false)
    }
  }

  // Mientras se verifica el estado inicial de autenticación o de los datos
  if (loading) {
    return (
      <div className="ep-page">
        <div className="ep-card">
          <p className="ep-loading">Verificando credenciales y cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ep-page">
      <div className="ep-card">
        <div className="ep-header">
          <button className="ep-back" onClick={() => navigate(-1)} aria-label="Volver">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="ep-title">Editar perfil</h1>
        </div>

        <form onSubmit={handleSubmit} className="ep-form">
          {error && (
            <div className="ep-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="ep-row">
            <div className="ep-field">
              <label className="ep-label">Peso (kg)</label>
              <input type="number" step="0.1" min="30" max="300" className="ep-input" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div className="ep-field">
              <label className="ep-label">Altura (cm)</label>
              <input type="number" step="1" min="150" max="250" className="ep-input" value={height} onChange={e => setHeight(e.target.value)} />
            </div>
            <div className="ep-field">
              <label className="ep-label">Edad</label>
              <input type="number" step="1" min="18" max="120" className="ep-input" value={age} onChange={e => setAge(e.target.value)} />
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-label">Género</label>
            <div className="ep-radio-group">
              <button type="button" className={`ep-radio-btn ${gender === 'M' ? 'ep-radio-btn--active' : ''}`} onClick={() => setGender('M')}>
                <span className="ep-radio-icon">♂</span> Hombre
              </button>
              <button type="button" className={`ep-radio-btn ${gender === 'F' ? 'ep-radio-btn--active' : ''}`} onClick={() => setGender('F')}>
                <span className="ep-radio-icon">♀</span> Mujer
              </button>
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-label">Objetivo</label>
            <div className="ep-radio-group ep-radio-group--col">
              {(['P', 'M', 'G'] as const).map(key => (
                <button key={key} type="button"
                  className={`ep-radio-btn ep-radio-btn--wide ${objective === key ? 'ep-radio-btn--active' : ''}`}
                  onClick={() => setObjective(key)}
                >
                  {OBJECTIVE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-label">Nivel de actividad</label>
            <div className="ep-radio-group ep-radio-group--col">
              {(['S', 'A', 'M'] as const).map(key => (
                <button key={key} type="button"
                  className={`ep-radio-btn ep-radio-btn--wide ${activityFactor === key ? 'ep-radio-btn--active' : ''}`}
                  onClick={() => setActivityFactor(key)}
                >
                  {ACTIVITY_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {bmr !== null && tdee !== null && (
            <div className="ep-results">
              <div className="ep-result">
                <span className="ep-result-label">Tasa metabólica basal</span>
                <span className="ep-result-value">{bmr} kcal</span>
              </div>
              <div className="ep-result ep-result--primary">
                <span className="ep-result-label">Gasto energético total</span>
                <span className="ep-result-value">{tdee} kcal</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="ep-submit">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EditProfile


/*import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './EditProfile.css'


const ACTIVITY_LABELS: Record<string, string> = {
  S: 'Sedentario (poco o ningún ejercicio)',
  A: 'Activo (ejercicio 3-5 días/semana)',
  M: 'Muy activo (ejercicio 6-7 días/semana)',
}

const ACTIVITY_MULTIPLIER: Record<string, number> = {
  S: 1.2,
  A: 1.55,
  M: 1.725,
}

const OBJECTIVE_LABELS: Record<string, string> = {
  P: 'Perder peso',
  M: 'Mantener peso',
  G: 'Ganar masa muscular',
}

function EditProfile() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'' | 'M' | 'F'>('')
  const [activityFactor, setActivityFactor] = useState<'' | 'S' | 'A' | 'M'>('')
  const [objective, setObjective] = useState<'' | 'P' | 'M' | 'G'>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const p = data.profile
        setWeight(String(p.weight))
        setHeight(String(p.height))
        setAge(String(p.age))
        setGender(p.gender)
        setActivityFactor(p.activityFactor)
        setObjective(p.objective)
      })
      .catch(() => navigate('/perfil'))
      .finally(() => setLoading(false))
  }, [navigate])

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

    if (!weight || !height || !age || !gender || !activityFactor || !objective) {
      setError('Completa todos los campos')
      return
    }
    if (bmr === null || tdee === null) return

    setSaving(true)
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

      navigate('/perfil')
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated) {
    navigate('/login', { replace: true })
    return null
  }

  if (loading) {
    return (
      <div className="ep-page">
        <div className="ep-card">
          <p className="ep-loading">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ep-page">
      <div className="ep-card">
        <div className="ep-header">
          <button className="ep-back" onClick={() => navigate(-1)} aria-label="Volver">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="ep-title">Editar perfil</h1>
        </div>

        <form onSubmit={handleSubmit} className="ep-form">
          {error && (
            <div className="ep-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="ep-row">
            <div className="ep-field">
              <label className="ep-label">Peso (kg)</label>
              <input type="number" step="0.1" min="30" max="300" className="ep-input" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
            <div className="ep-field">
              <label className="ep-label">Altura (cm)</label>
              <input type="number" step="1" min="150" max="250" className="ep-input" value={height} onChange={e => setHeight(e.target.value)} />
            </div>
            <div className="ep-field">
              <label className="ep-label">Edad</label>
              <input type="number" step="1" min="18" max="120" className="ep-input" value={age} onChange={e => setAge(e.target.value)} />
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-label">Género</label>
            <div className="ep-radio-group">
              <button type="button" className={`ep-radio-btn ${gender === 'M' ? 'ep-radio-btn--active' : ''}`} onClick={() => setGender('M')}>
                <span className="ep-radio-icon">♂</span> Hombre
              </button>
              <button type="button" className={`ep-radio-btn ${gender === 'F' ? 'ep-radio-btn--active' : ''}`} onClick={() => setGender('F')}>
                <span className="ep-radio-icon">♀</span> Mujer
              </button>
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-label">Objetivo</label>
            <div className="ep-radio-group ep-radio-group--col">
              {(['P', 'M', 'G'] as const).map(key => (
                <button key={key} type="button"
                  className={`ep-radio-btn ep-radio-btn--wide ${objective === key ? 'ep-radio-btn--active' : ''}`}
                  onClick={() => setObjective(key)}
                >
                  {OBJECTIVE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="ep-field">
            <label className="ep-label">Nivel de actividad</label>
            <div className="ep-radio-group ep-radio-group--col">
              {(['S', 'A', 'M'] as const).map(key => (
                <button key={key} type="button"
                  className={`ep-radio-btn ep-radio-btn--wide ${activityFactor === key ? 'ep-radio-btn--active' : ''}`}
                  onClick={() => setActivityFactor(key)}
                >
                  {ACTIVITY_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {bmr !== null && tdee !== null && (
            <div className="ep-results">
              <div className="ep-result">
                <span className="ep-result-label">Tasa metabólica basal</span>
                <span className="ep-result-value">{bmr} kcal</span>
              </div>
              <div className="ep-result ep-result--primary">
                <span className="ep-result-label">Gasto energético total</span>
                <span className="ep-result-value">{tdee} kcal</span>
              </div>
            </div>
          )}

          <button type="submit" disabled={saving} className="ep-submit">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EditProfile */
