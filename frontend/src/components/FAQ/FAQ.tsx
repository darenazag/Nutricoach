import { useState } from 'react'
import './FAQ.css'

const faqs = [
  {
    q: '¿Cómo funciona la inteligencia artificial de NutriCoach?',
    a: 'NutriCoach usa visión computacional (IA entrenada con más de 500,000 imágenes de comida real) para identificar alimentos en tus fotos con 98.7% de precisión. También procesa lenguaje natural para entender descripciones escritas o dictadas. Todo corre en la nube con aprendizaje continuo: entre más usas la app, más precisa se vuelve para ti.',
  },
  {
    q: '¿La app es gratis o de pago?',
    a: 'NutriCoach es gratis para siempre en su versión básica: registro ilimitado de comidas, cálculo de calorías y macros, y acceso a la base de datos. La suscripción Premium (desde $4.99/mes) desbloquea: planes personalizados con IA, recetas inteligentes, lista de compras automática, gráficos avanzados y modo ayuno. Sin anuncios en ningún plan.',
  },
  {
    q: '¿Cómo calcula las calorías y macronutrientes?',
    a: 'El cálculo combina tres fuentes: (1) la base de datos verificada de alimentos (USDA + SEN + tablas latinoamericanas), (2) el factor de cocción y preparación que la IA aprende según el tipo de alimento, y (3) tu metabolismo basal calculado con ecuaciones Mifflin-St Jeor validadas científicamente. No inventamos números.',
  },
  {
    q: '¿La base de datos de alimentos está verificada?',
    a: 'Cada alimento pasa por un filtro de verificación antes de estar disponible. Contamos con un equipo de nutricionistas que auditan los registros más populares semanalmente y los propios usuarios pueden reportar discrepancias, que se corrigen en menos de 48 horas. Los alimentos escaneados por código de barras traen la información oficial del fabricante.',
  },
]

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? null : i)
  }

  return (
    <section id="faq" className="faq">
      <div className="faq-container">
        <div className="faq-header">
          <span className="faq-section-tag">FAQ</span>
          <h2 className="faq-title">
            Respuestas rápidas <span className="text-primary">(para que no tengas que buscar)</span>.
          </h2>
        </div>

        <div className="faq-list">
          {faqs.map((item, i) => (
            <div
              key={i}
              className={`faq-item ${openIndex === i ? 'open' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => toggle(i)}
                aria-expanded={openIndex === i}
              >
                <span>{item.q}</span>
                <span className="faq-icon">
                  {openIndex === i ? '−' : '+'}
                </span>
              </button>
              <div
                className="faq-answer"
                style={{
                  maxHeight: openIndex === i ? '300px' : '0',
                  opacity: openIndex === i ? 1 : 0,
                }}
              >
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ
