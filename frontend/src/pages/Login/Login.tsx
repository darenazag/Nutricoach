import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import '../auth.css'

const API_URL = 'http://localhost:3001/api'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión')
        return
      }

      login(data.token, data.user)
      navigate('/perfil')
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
          <h1 className="auth-title">Iniciar sesión</h1>
          <p className="auth-subtitle">Bienvenido de nuevo a NutriCoach</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">
              <span className="auth-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

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
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                className={`auth-input ${password ? 'auth-input--filled' : ''}`}
                placeholder="••••••••"
                autoComplete="current-password"
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
          </div>

          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? (
              <>
                <div className="auth-spinner" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
