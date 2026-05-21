import './Footer.css'

function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="footer-logo">&#x1F34A; Nutri<span className="highlight">Coach</span></span>
          <p>Tu coach nutricional con inteligencia artificial.</p>
        </div>

        <div className="footer-links">
          <h4>Producto</h4>
          <a href="#features">Características</a>
          <a href="#cta">Precios</a>
          <a href="#">FAQ</a>
        </div>

        <div className="footer-links">
          <h4>Compañía</h4>
          <a href="#">Sobre nosotros</a>
          <a href="#">Blog</a>
          <a href="#">Contacto</a>
        </div>

        <div className="footer-links">
          <h4>Legal</h4>
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} NutriCoach AI. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}

export default Footer
