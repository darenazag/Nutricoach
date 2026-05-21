import food1Img from '../../assets/food1.webp'
import food2Img from '../../assets/food2.webp'
import food3Img from '../../assets/food3.webp'
import food4Img from '../../assets/food4.webp'
import './Features.css'

const features = [
  {
    title: 'Planes con IA',
    desc: 'Recibe planes de alimentación personalizados generados por inteligencia artificial según tus objetivos.',
    image: food1Img,
  },
  {
    title: 'Escanea tu comida',
    desc: 'Toma una foto de tu plato y obtén al instante las calorías y macronutrientes estimados.',
    image: food2Img,
  },
  {
    title: 'Seguimiento diario',
    desc: 'Lleva un registro de tus comidas, calorías y progreso con gráficos interactivos.',
    image: food3Img,
  },
  {
    title: 'Chat nutricional',
    desc: 'Consulta tus dudas sobre alimentación saludable con nuestro chat impulsado por IA.',
    image: food4Img,
  },
]

function Features() {
  return (
    <section id="features" className="features">
      <div className="features-container">
        <h2 className="features-title">
          Todo lo que necesitas para <span className="text-primary">alimentarte mejor</span>
        </h2>
        <p className="features-subtitle">
          NutriCoach AI combina tecnología de punta con ciencia nutricional para ayudarte a alcanzar tus metas.
        </p>

        <div className="features-grid">
          {features.map((f) => (
            <article key={f.title} className="feature-card">
              <div className="feature-card-image">
                <img src={f.image} alt={f.title} />
              </div>
              <div className="feature-card-body">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
