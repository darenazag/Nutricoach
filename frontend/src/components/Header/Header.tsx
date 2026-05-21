import './Header.css'

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <a href="/" className="header-logo">
          <span className="header-logo-icon">&#x1F34A;</span>
          <span className="header-logo-text">Nutri<span className="highlight">Coach</span></span>
        </a>

        <nav className="header-nav">
          <a href="#hero">Inicio</a>
          <a href="#features">Características</a>
          <a href="#contact">Contacto</a>
        </nav>

        <a href="#cta" className="header-cta">Comenzar</a>
      </div>
    </header>
  )
}

export default Header
