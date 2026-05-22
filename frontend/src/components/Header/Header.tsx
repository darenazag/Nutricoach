import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './Header.css'

function Header() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <span className="header-logo-icon">&#x1F34A;</span>
          <span className="header-logo-text">Nutri<span className="highlight">Coach</span></span>
        </Link>

        <nav className="header-nav">
          <a href="/#hero">Inicio</a>
          <a href="/#features">Características</a>
          <a href="/#contact">Contacto</a>
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <span className="header-user">{user?.name}</span>
              <button onClick={logout} className="header-logout">Cerrar sesión</button>
            </>
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
