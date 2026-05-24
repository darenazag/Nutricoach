import { Link } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import GooeyNav from '../GooeyNav/GooeyNav'
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
