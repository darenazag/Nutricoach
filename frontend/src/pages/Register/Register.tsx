import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import '../auth.css'

const API_URL = 'http://localhost:3001/api'

const requirements = [
  { label: 'Mínimo 5 caracteres', test: (p: string) => p.length >= 5 },
  { label: 'Al menos una mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Al menos un signo (!@#$%^&*)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const checks = useMemo(() => requirements.map(r => r.test(password)), [password])
  const allPass = checks.every(Boolean)
  const passwordsMatch = password === confirmPassword

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    setError('')

    if (!allPass) {
      setError('La contraseña no cumple todos los requisitos')
      return
    }

    if (!passwordsMatch) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrarse')
        return
      }

      login(data.token, data.user)
      navigate('/')
    } catch {
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-back" aria-label="Volver al inicio">←</Link>
          <Link to="/" className="auth-logo">
            <span className="auth-logo-icon">&#x1F34A;</span>
            <span>Nutri<span style={{ color: 'var(--color-primary)' }}>Coach</span></span>
          </Link>
          <h1 className="auth-title">Crear cuenta</h1>
          <p className="auth-subtitle">Empieza a transformar tu alimentación</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label" style={{ color: focusedField === 'name' ? 'var(--color-primary)' : undefined }}>
              Nombre
            </label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                required
                className={`auth-input ${name ? 'auth-input--filled' : ''}`}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" style={{ color: focusedField === 'email' ? 'var(--color-primary)' : undefined }}>
              Email
            </label>
            <div className="auth-input-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                className={`auth-input ${email ? 'auth-input--filled' : ''}`}
                placeholder="tu@email.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" style={{ color: focusedField === 'password' ? 'var(--color-primary)' : undefined }}>
              Contraseña
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setTouched(true) }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                className={`auth-input ${password ? 'auth-input--filled' : ''}`}
                placeholder="Crea una contraseña segura"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {touched && password.length > 0 && (
              <div className="auth-requirements">
                {requirements.map((r, i) => (
                  <span key={r.label} className={`auth-req ${checks[i] ? 'auth-req--ok' : 'auth-req--pending'}`}>
                    {checks[i] ? '✓' : '○'} {r.label}
                  </span>
                ))}
                <span className={`auth-req ${passwordsMatch && confirmPassword.length > 0 ? 'auth-req--ok' : 'auth-req--pending'}`}>
                  {passwordsMatch && confirmPassword.length > 0 ? '✓' : '○'} Las contraseñas coinciden
                </span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label" style={{ color: focusedField === 'confirmPassword' ? 'var(--color-primary)' : undefined }}>
              Confirmar contraseña
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                required
                className={`auth-input ${confirmPassword ? 'auth-input--filled' : ''} ${confirmPassword && !passwordsMatch ? 'auth-input--error' : ''}`}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? (
              <>
                <div className="auth-spinner" />
                Creando cuenta...
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
