import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useTheme } from '../../context/useTheme'
import GooeyNav from '../GooeyNav/GooeyNav'
import './Header.css'

function Header() {
  const { user, isAuthenticated, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const isDashboard = location.pathname === '/perfil'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = user?.name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  function handleAvatarClick(e: React.MouseEvent) {
    e.stopPropagation()
    navigate('/perfil')
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <span className="header-logo-icon">&#x1F34A;</span>
          <span className="header-logo-text">Nutri<span className="highlight">Coach</span></span>
        </Link>

        {!isDashboard && (
          <GooeyNav
            items={[
              { label: 'Inicio', href: '/#hero' },
              { label: 'Características', href: '/#features' },
              { label: 'Contacto', href: '/#contact' },
            ]}
            particleCount={12}
            particleDistances={[70, 15]}
            animationTime={500}
            timeVariance={250}
            colors={[1, 2, 3, 4]}
          />
        )}

        <div className="header-actions">
          <button
            className="header-theme-btn"
            onClick={toggle}
            type="button"
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isAuthenticated ? (
            <div className="header-user-wrap" ref={ref}>
              <button className="header-user-btn" onClick={() => setOpen(o => !o)}>
                <span className="header-user-avatar" onClick={handleAvatarClick}>{initials}</span>
                <span className="header-user-name">{user?.name}</span>
                <span className={`header-user-chevron ${open ? 'header-user-chevron--open' : ''}`}>▾</span>
              </button>

              {open && (
                <div className="header-dropdown">
                  <Link
                    to="/asistente-ia"
                    className="header-dropdown-item"
                    onClick={() => setOpen(false)}
                  >
                    <span>🤖</span> Asistente IA
                  </Link>
                  <button className="header-dropdown-item header-dropdown-item--danger" onClick={() => { setOpen(false); logout() }}>
                    <span>🚪</span> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="header-login">Iniciar sesión</Link>
              <Link to="/register" className="header-cta">Comenzar</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
