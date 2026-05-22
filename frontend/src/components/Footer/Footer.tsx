import './Footer.css'

function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="pre-footer">
        <div className="pre-footer-container">
          <h2 className="pre-footer-title">
            Tu nueva alimentación empieza hoy.
          </h2>
          <p className="pre-footer-text">
            No necesitas más fuerza de voluntad. Necesitas un sistema que
            funcione. Descarga NutriCoach y deja que la IA haga el trabajo
            pesado.
          </p>
          <a href="/register" className="pre-footer-cta">
            Empieza gratis — 1 minuto
          </a>
          <div className="pre-footer-badges">
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
      </div>

      <div className="footer-main">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="footer-logo">&#x1F34A; Nutri<span className="highlight">Coach</span></span>
            <p>Tu coach nutricional con inteligencia artificial.</p>
          </div>

          <div className="footer-links">
            <h4>Soluciones</h4>
            <a href="#">Perder peso</a>
            <a href="#">Ganar músculo</a>
            <a href="#">Mantenerte</a>
            <a href="#">Recetas saludables</a>
          </div>

          <div className="footer-links">
            <h4>Funcionalidades</h4>
            <a href="#easy-register">Registro por foto</a>
            <a href="#">Escáner de códigos</a>
            <a href="/">Planes IA</a>
            <a href="#">Lista de compras</a>
            <a href="#">Widgets</a>
          </div>

          <div className="footer-links">
            <h4>Compañía</h4>
            <a href="#">Sobre nosotros</a>
            <a href="#">Blog</a>
            <a href="#">Contacto</a>
            <a href="#">Prensa</a>
          </div>

          <div className="footer-links">
            <h4>Legal</h4>
            <a href="#">Términos y condiciones</a>
            <a href="#">Política de privacidad</a>
            <a href="#">Aviso de cookies</a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} NutriCoach AI. Hecho con 💪 y ciencia.</p>
      </div>
    </footer>
  )
}

export default Footer
