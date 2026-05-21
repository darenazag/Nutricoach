import heroImg from '../../assets/hero.png'
import './Hero.css'

function Hero() {
  return (
    <section id="hero" className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-title">
            Tu <span className="text-primary">coach nutricional</span>
            <br />con inteligencia artificial
          </h1>
          <p className="hero-subtitle">
            Planes de alimentación personalizados, seguimiento de calorías y
            análisis de comidas con solo una foto. Todo potenciado por IA.
          </p>
          <div className="hero-actions">
            <a href="#cta" className="hero-btn-primary">Empieza gratis</a>
            <a href="#features" className="hero-btn-secondary">Saber más</a>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroImg} alt="NutriCoach AI" />
        </div>
      </div>
    </section>
  )
}

export default Hero
