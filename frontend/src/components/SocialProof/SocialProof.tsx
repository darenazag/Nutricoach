import { useRef, useEffect } from 'react'

import p1 from '../../assets/Comentarios/persona1.jpg'
import p2 from '../../assets/Comentarios/persona2.jpg'
import p3 from '../../assets/Comentarios/persona3.jpg'
import p5 from '../../assets/Comentarios/persona5.jpg'
import p6 from '../../assets/Comentarios/persona6.jpg'
import p7 from '../../assets/Comentarios/persona7.jpg'
import p8 from '../../assets/Comentarios/persona8.jpg'
import p9 from '../../assets/Comentarios/persona9.jpg'
import p10 from '../../assets/Comentarios/persona10.jpg'
import p11 from '../../assets/Comentarios/persona11.jpg'
import p12 from '../../assets/Comentarios/persona12.jpg'
import p13 from '../../assets/Comentarios/persona13.jpg'
import p14 from '../../assets/Comentarios/persona14.jpg'
import p15 from '../../assets/Comentarios/persona15.jpg'
import p16 from '../../assets/Comentarios/persona16.jpg'
import p17 from '../../assets/Comentarios/persona17.jpg'
import p18 from '../../assets/Comentarios/persona18.jpg'
import p19 from '../../assets/Comentarios/persona19.jpg'
import p20 from '../../assets/Comentarios/persona20.jpg'

import './SocialProof.css'

const testimonials = [
  { name: 'Sofía M.', age: '29 años', result: 'Perdió 15 kg', photo: p1, text: 'Nunca pensé que contar calorías fuera tan fácil. Solo tomo foto y la app hace todo. Bajé 15 kg sin obsesionarme.' },
  { name: 'Andrés G.', age: '34 años', result: 'Ganó 10 kg músculo', photo: p2, text: 'Las recetas inteligentes me salvaron. Llegaba del gym y ya tenía la cena lista con los macros perfectos. Resultados increíbles.' },
  { name: 'Valentina R.', age: '26 años', result: 'Perdió 8 kg', photo: p3, text: 'Siempre fracasaba con las dietas hasta que probé NutriCoach. La IA entiende lo que como, no tengo que explicarle nada.' },
  { name: 'Camila L.', age: '31 años', result: 'Perdió 20 kg', photo: p5, text: 'El escáner de códigos es un antes y después. Llego al súper, escaneo todo y sé exactamente lo que compro.' },
  { name: 'Mateo T.', age: '27 años', result: 'Perdió 12 kg', photo: p6, text: 'La lista de compras automática me cambió la vida. Ya no compro por antojo, compro por plan.' },
  { name: 'Diego P.', age: '38 años', result: 'Mejoró su salud', photo: p7, text: 'Soy diabético tipo 2 y necesitaba controlar carbohidratos. NutriCoach me ayudó a estabilizar mi glucosa.' },
  { name: 'Gabriela N.', age: '33 años', result: 'Perdió 10 kg', photo: p8, text: 'El registro por voz es mi favorito. Mientras cocino, dicto los ingredientes y ya. Parece magia pero es IA.' },
  { name: 'Felipe D.', age: '25 años', result: 'Ganó 7 kg masa', photo: p9, text: 'Como estudiante de medicina, revisé la base de datos. Está verificada, los macros son precisos.' },
  { name: 'Isabella A.', age: '30 años', result: 'Perdió 18 kg', photo: p10, text: 'Probé Fitia, MyFitnessPal y otras. Ninguna me dio resultados como NutriCoach.' },
  { name: 'Sandra C.', age: '42 años', result: 'Perdió 25 kg', photo: p11, text: 'Empecé por compromiso y terminé enamorada de la app. Los gráficos me motivan cada día.' },
  { name: 'Laura F.', age: '28 años', result: 'Ganó 5 kg masa', photo: p12, text: 'Soy vegetariana y NutriCoach tiene miles de opciones plant-based para mi dieta.' },
  { name: 'Nicol V.', age: '35 años', result: 'Perdió 14 kg', photo: p13, text: 'Los widgets me recuerdan mis macros sin abrir la app. El empujoncito que necesito.' },
  { name: 'María J.', age: '45 años', result: 'Perdió 22 kg', photo: p14, text: 'A mi edad el metabolismo cambia. NutriCoach ajustó mi plan y finalmente vi resultados.' },
  { name: 'Tomás H.', age: '29 años', result: 'Ganó 12 kg masa', photo: p15, text: 'El modo ayuno intermitente con temporizador me ayudó a ser constante.' },
  { name: 'Valeria S.', age: '31 años', result: 'Perdió 9 kg', photo: p16, text: 'El reconocimiento de fotos es increíblemente preciso. Hasta identifica las especias.' },
  { name: 'Daniela M.', age: '27 años', result: 'Ganó 8 kg masa', photo: p17, text: 'Entreno crossfit y necesito ajustar macros cada día. NutriCoach lo hace automáticamente.' },
  { name: 'Alejandra Z.', age: '36 años', result: 'Perdió 16 kg', photo: p18, text: 'Después de mi segundo embarazo no lograba bajar. Con NutriCoach recuperé mi figura.' },
  { name: 'Emilio B.', age: '24 años', result: 'Ganó 6 kg masa', photo: p19, text: 'Soy estudiante y la app me ayuda a elegir opciones nutritivas y económicas.' },
  { name: 'Carolina D.', age: '39 años', result: 'Perdió 11 kg', photo: p20, text: 'La IA me enseña a comer de todo en las porciones correctas. Educación real.' },
]

const duplicated = [...testimonials, ...testimonials, ...testimonials]

function SocialProof() {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const isPaused = useRef(false)
  const rafId = useRef(0)
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.3 }
    )
    cardsRef.current.forEach((el) => { if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let lastTime = 0
    const speed = 0.35

    const loop = (time: number) => {
      if (!isPaused.current) {
        const delta = time - lastTime
        lastTime = time
        el.scrollLeft += speed * (delta / 16)

        const card = el.querySelector('.sp-card') as HTMLElement
        if (card) {
          const cardW = card.offsetWidth + 20
          if (el.scrollLeft >= cardW * testimonials.length) {
            el.scrollLeft = 0
          }
        }
      }
      rafId.current = requestAnimationFrame(loop)
    }

    rafId.current = requestAnimationFrame(loop)

    const onEnter = () => { isPaused.current = true }
    const onLeave = () => { isPaused.current = false }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('touchstart', onEnter, { passive: true })
    el.addEventListener('touchend', onLeave, { passive: true })

    return () => {
      cancelAnimationFrame(rafId.current)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('touchstart', onEnter)
      el.removeEventListener('touchend', onLeave)
    }
  }, [])

  return (
    <section className="bg-[#FDFBF7] py-16 sm:py-20 px-4 sm:px-6" id="social-proof">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-block uppercase tracking-[3px] text-xs font-bold text-[#FAA61A] bg-[#FFF5E6] px-5 py-2 rounded-full mb-5 sp-badge">
            RESULTADOS REALES
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#3D2C1A] mb-4 leading-tight sp-heading">
            Resultados que <span className="text-[#FAA61A] relative inline-block hover-underline sp-accent">hablan solos.</span>
          </h2>
          <div className="relative inline-block">
            <p className="text-base md:text-lg text-[#3D2C1A] max-w-xl mx-auto leading-relaxed sp-desc">
              Más de <strong className="text-[#FAA61A] counter-num sp-accent">50,000</strong> personas ya transformaron su alimentación con NutriCoach.
            </p>
            <p className="text-sm text-[#7A6B5A] mt-1 italic sp-subtitle">
              Estos son algunos de sus resultados.
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FAA61A] animate-bounce sp-dot" style={{ animationDelay: '0s' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#d48208] animate-bounce sp-dot" style={{ animationDelay: '0.15s' }}></span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FAA61A] animate-bounce sp-dot" style={{ animationDelay: '0.3s' }}></span>
            </div>
          </div>
        </div>

        <div className="sp-scroll" ref={scrollRef}>
          <div className="sp-track">
            {duplicated.map((t, i) => (
              <article
                key={`${t.name}-${i}`}
                className="sp-card"
                ref={(el) => { cardsRef.current[i] = el as HTMLDivElement | null }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={t.photo}
                    alt={t.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#F0E6D8] flex-shrink-0 sp-card-img"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-[#3D2C1A] text-sm truncate sp-card-name">{t.name}</div>
                    <div className="text-xs text-[#7A6B5A] sp-card-age">{t.age}</div>
                  </div>
                  <span className="ml-auto text-[11px] font-semibold text-[#FAA61A] bg-[#FFF5E6] px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0 sp-card-result">
                    {t.result}
                  </span>
                </div>
                <p className="italic text-[#3D2C1A] text-sm leading-relaxed sp-card-text">
                  &ldquo;{t.text}&rdquo;
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <a href="/register" className="inline-block w-full sm:w-auto bg-[#FAA61A] text-white font-bold text-base px-10 py-4 rounded-full shadow-lg hover:shadow-xl hover:bg-[#d48208] transition-all duration-300 sp-cta">
            Empieza tu transformación
          </a>
        </div>
      </div>
    </section>
  )
}

export default SocialProof
