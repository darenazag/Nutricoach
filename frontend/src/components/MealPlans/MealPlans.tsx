import food1Img from '../../assets/food1.webp'
import food2Img from '../../assets/food2.webp'
import food3Img from '../../assets/food3.webp'
import './MealPlans.css'

const plans = [
  {
    title: 'Planes a tu medida',
    desc: 'Dile a nuestro agente tu objetivo (perder grasa, ganar músculo o mantenerte), tu actividad física y alimentos que odias. En segundos tienes un plan semanal con macros ajustados a ti.',
    tag: 'Macros ajustados a tu metabolismo',
    image: food1Img,
  },
  {
    title: 'Recetas que se adaptan a tu día',
    desc: '¿Te pasaste en carbohidratos en el almuerzo? La cena se ajusta sola. Sin rebote, sin culpa. Recetas dinámicas que se adaptan a tus macros del día en tiempo real.',
    tag: 'Sin rebote, sin culpa',
    image: food2Img,
  },
  {
    title: 'Lista de compras',
    desc: 'Un toque y la app genera la lista del súper con base en tu menú semanal. Organizada por categorías para que llegues, compres y cocines sin pensar.',
    tag: 'Organizada por categorías',
    image: food3Img,
  },
]

function MealPlans() {
  return (
    <section id="meal-plans" className="meal-plans">
      <div className="mp-container">
        <div className="mp-header">
          <span className="mp-section-tag">Planificador inteligente</span>
          <h2 className="mp-title">
            No más "¿qué como hoy?". <span className="text-primary">Nosotros lo planeamos por ti.</span>
          </h2>
          <p className="mp-subtitle">
            Planes nutricionales basados en ciencia que se adaptan a tus macros,
            gustos y ritmo de vida.
          </p>
          <a href="/register" className="mp-cta">Diseñar mi menú semanal</a>
        </div>

        <div className="mp-grid">
          {plans.map((p) => (
            <article key={p.title} className="mp-card">
              <div className="mp-card-img">
                <img src={p.image} alt={p.title} />
              </div>
              <div className="mp-card-body">
                <h3>{p.title}</h3>
                <p className="mp-card-desc">{p.desc}</p>
                <span className="mp-card-highlight">{p.tag}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default MealPlans
