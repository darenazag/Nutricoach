import './EasyRegister.css'

const methods = [
  {
    icon: '📸',
    title: 'Toma y ya',
    desc: 'Fotografía tu plato y la IA reconoce los alimentos al instante. Pollo, arroz, ensalada… ella solita calcula porciones y macros.',
  },
  {
    icon: '🎤',
    title: 'Habla y olvídate',
    desc: '"Pechuga de pollo a la plancha con arroz integral". Dicta como si hablaras con un amigo. Sin escribir, sin buscar.',
  },
  {
    icon: '⌨️',
    title: 'Escribe natural',
    desc: 'Escribe "2 huevos revueltos + 1 aguacate" como en WhatsApp y NutriCoach lo entiende. Lenguaje natural, cero tecnicismos.',
  },
  {
    icon: '📟',
    title: 'Escanea al instante',
    desc: 'Pasas el código de barras y la app te muestra la tabla nutricional completa. Sin buscadores, sin errores.',
  },
]

function EasyRegister() {
  return (
    <section id="easy-register" className="easy-register">
      <div className="er-container">
        <div className="er-header">
          <span className="er-section-tag">Registro inteligente</span>
          <h2 className="er-title">
            Registrar tu comida en segundos <span className="text-primary">(no en minutos)</span>.
          </h2>
          <p className="er-subtitle">
            Olvídate de buscar alimentos en listas infinitas. Con NutriCoach
            tienes 4 formas de registrar, todas potenciadas por un agente inteligente.
          </p>
        </div>

        <div className="er-grid">
          {methods.map((m) => (
            <article key={m.title} className="er-card">
              <div className="er-card-icon">{m.icon}</div>
              <h3 className="er-card-title">{m.title}</h3>
              <p className="er-card-desc">{m.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default EasyRegister
