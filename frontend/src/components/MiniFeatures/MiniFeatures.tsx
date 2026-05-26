import { useRef, useEffect } from 'react'
import './MiniFeatures.css'

const features = [
  { title: 'Gráficos de progreso', desc: 'Evolución de peso, calorías y macros por día, semana o mes.' },
  { title: 'Fotos de evolución', desc: 'Línea de tiempo visual con tus fotos "antes y después".' },
  { title: 'Modo ayuno intermitente', desc: 'Temporizador integrado para protocolos 16:8, 18:6 o personalizado.' },
  { title: 'Base de datos verificada', desc: '+1.2M de alimentos con información validada por profesionales.' },
  { title: 'Widgets exclusivos', desc: 'Tus macros del día en la pantalla de inicio sin abrir la app.' },
]

const duplicated = [...features, ...features, ...features]

function MiniFeatures() {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const isPaused = useRef(false)
  const rafId = useRef<number>(0)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.3 }
    )

    cardsRef.current.forEach((el) => {
      if (el) obs.observe(el)
    })

    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return

    let lastTime = 0
    const speed = 0.5

    const loop = (time: number) => {
      if (!isPaused.current) {
        const delta = time - lastTime
        lastTime = time
        scrollEl.scrollLeft += speed * (delta / 16)

        const oneSet = scrollEl.querySelector('.mf-track')!.children.length / 3
        const card = scrollEl.querySelector('.mf-card') as HTMLElement
        if (card) {
          const cardWidth = card.offsetWidth + 20
          const threshold = cardWidth * oneSet
          if (scrollEl.scrollLeft >= threshold) {
            scrollEl.scrollLeft = 0
          }
        }
      }
      rafId.current = requestAnimationFrame(loop)
    }

    rafId.current = requestAnimationFrame(loop)

    const onEnter = () => { isPaused.current = true }
    const onLeave = () => { isPaused.current = false }

    scrollEl.addEventListener('mouseenter', onEnter)
    scrollEl.addEventListener('mouseleave', onLeave)
    scrollEl.addEventListener('touchstart', onEnter, { passive: true })
    scrollEl.addEventListener('touchend', onLeave, { passive: true })

    return () => {
      cancelAnimationFrame(rafId.current)
      scrollEl.removeEventListener('mouseenter', onEnter)
      scrollEl.removeEventListener('mouseleave', onLeave)
      scrollEl.removeEventListener('touchstart', onEnter)
      scrollEl.removeEventListener('touchend', onLeave)
    }
  }, [])

  return (
    <section id="mini-features" className="mini-features">
      <div className="mf-container">
        <div className="mf-header">
          <span className="section-tag">Todo en uno</span>
          <h2 className="mf-title">
            Todo lo que necesitas en <span className="text-primary">un solo lugar</span>.
          </h2>
        </div>

        <div className="mf-scroll scroll-snap-x" ref={scrollRef}>
          <div className="mf-track scroll-snap-track">
            {duplicated.map((f, i) => (
              <article
                key={`${f.title}-${i}`}
                className="mf-card glass-card-dark"
                ref={(el) => { cardsRef.current[i] = el as HTMLDivElement | null }}
              >
                <div className="mf-card-img">
                  <div className="mf-card-img-placeholder" />
                </div>
                <div className="mf-card-body">
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MiniFeatures
