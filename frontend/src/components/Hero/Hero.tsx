import './Hero.css'

function Hero() {
  return (
    <section id="hero" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Cuenta calorías sin <span className="text-primary">contar calorías</span>.
          </h1>
          <p className="hero-subtitle">
            Tu nutricionista con IA en el bolsillo. Solo tomas una foto,
            hablas o escaneas. NutriCoach hace el resto.
          </p>

          <div className="hero-stats">
            <span><strong>+50,000</strong> personas confían</span>
            <span className="hero-stats-dot">·</span>
            <span><strong>98.7%</strong> precisión IA</span>
          </div>

          <div className="hero-actions">
            <a href="/register" className="hero-btn-primary">Empieza gratis</a>
            <a href="#features" className="hero-btn-secondary">Saber más ↓</a>
          </div>

          <div className="hero-badges">
            <a href="#" className="store-badge store-badge--ios">
              <svg className="store-badge-icon" viewBox="0 0 27 27" fill="#fff">
                <path d="M22.15 14.28c-.06-3.53 2.87-5.22 3-5.3-1.63-2.4-4.17-2.5-5.07-2.53-2.16-.22-4.21 1.27-5.3 1.27-1.1 0-2.8-1.24-4.6-1.2-2.37.03-4.55 1.38-5.77 3.5-2.46 4.27-.63 10.6 1.77 14.06 1.17 1.7 2.57 3.6 4.4 3.53 1.77-.07 2.44-1.14 4.57-1.14 2.13 0 2.73 1.14 4.6 1.1 1.9-.03 3.1-1.73 4.24-3.44 1.33-1.95 1.88-3.84 1.91-3.93-.04-.02-3.67-1.41-3.7-5.6zM18.65 4.4c.98-1.19 1.64-2.84 1.46-4.48-1.41.06-3.12.94-4.13 2.12-.91 1.05-1.7 2.72-1.48 4.33 1.56.12 3.16-.8 4.15-1.97z"/>
              </svg>
              <span className="store-badge-text">
                <span className="store-badge-small">Descárgalo en</span>
                <span className="store-badge-name">App Store</span>
              </span>
            </a>
            <a href="#" className="store-badge store-badge--android">
              <svg className="store-badge-icon" viewBox="0 0 24 24">
                <path d="M4.29 3.7C4.1 3.82 4 4.01 4 4.22v15.56c0 .21.1.4.29.51.18.11.4.11.58 0l15.13-9.78c.24-.15.37-.39.37-.65 0-.26-.13-.5-.37-.65L4.87 3.69c-.18-.1-.4-.1-.58 0z" fill="#fff"/>
                <path d="M4.29 3.7C4.1 3.82 4 4.01 4 4.22v3.61l16.13 3.46L4 14.17v5.61c0 .21.1.4.29.51.18.11.4.11.58 0l15.13-9.78c.24-.15.37-.39.37-.65 0-.26-.13-.5-.37-.65L4.87 3.69c-.18-.1-.4-.1-.58 0z" fill="#34A853" opacity="0.3"/>
              </svg>
              <span className="store-badge-text">
                <span className="store-badge-small">DISPONIBLE EN</span>
                <span className="store-badge-name">Google Play</span>
              </span>
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="phone-mockup">
            <div className="phone-notch"></div>
            <div className="phone-screen">
              <div className="phone-statusbar">
                <span>9:41</span>
                <span>📶 🔋</span>
              </div>
              <div className="phone-header-ui">
                <span className="phone-logo-ui">🍊 NutriCoach</span>
              </div>
              <div className="phone-meal-card">
                <div className="phone-meal-image"></div>
                <div className="phone-meal-info">
                  <span className="phone-meal-name">Pollo salteado con verduras</span>
                  <div className="phone-macros">
                    <span className="macro">🔥 450 kcal</span>
                    <span className="macro prot">P 32g</span>
                    <span className="macro carb">C 48g</span>
                    <span className="macro fat">G 18g</span>
                  </div>
                </div>
              </div>
              <div className="phone-meal-card secondary">
                <div className="phone-meal-image"></div>
                <div className="phone-meal-info">
                  <span className="phone-meal-name">Arroz integral con aguacate</span>
                  <div className="phone-macros">
                    <span className="macro">🔥 320 kcal</span>
                    <span className="macro prot">P 8g</span>
                    <span className="macro carb">C 52g</span>
                    <span className="macro fat">G 10g</span>
                  </div>
                </div>
              </div>
              <div className="phone-total">
                <span>Total del día</span>
                <span className="phone-total-num">1,845 / 2,100 kcal</span>
              </div>
              <div className="phone-add-btn">
                <span>+ Registrar comida</span>
              </div>
              <div className="phone-bar"></div>
            </div>
          </div>
          <div className="hero-float-icons">
            <span className="float-icon photo">📸</span>
            <span className="float-icon voice">💬</span>
            <span className="float-icon scan">⏳</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
