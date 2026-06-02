import { useState, useRef, useEffect, useCallback } from 'react'
import './GooeyNav.css'

interface Item {
  label: string
  href: string
}

interface GooeyNavProps {
  items: Item[]
  particleCount?: number
  particleDistances?: [number, number]
  initialActiveIndex?: number
  animationTime?: number
  timeVariance?: number
  colors?: number[]
}

function GooeyNav({
  items,
  particleCount = 15,
  particleDistances = [90, 10],
  initialActiveIndex = 0,
  animationTime = 600,
  timeVariance = 300,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
}: GooeyNavProps) {
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [particles, setParticles] = useState<React.ReactNode[]>([])
  const [particleTarget, setParticleTarget] = useState<number | null>(null)
  const ulRef = useRef<HTMLUListElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const liRefs = useRef<Map<number, HTMLLIElement>>(new Map())
  const idRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const syncEffect = useCallback((index: number) => {
    const li = liRefs.current.get(index)
    if (!li || !ulRef.current) return

    const ulRect = ulRef.current.getBoundingClientRect()
    const liRect = li.getBoundingClientRect()

    const left = liRect.left - ulRect.left
    const width = liRect.width

    if (filterRef.current) {
      filterRef.current.style.setProperty('--left', `${left}px`)
      filterRef.current.style.setProperty('--width', `${width}px`)
    }
    if (textRef.current) {
      textRef.current.style.setProperty('--left', `${left}px`)
      textRef.current.style.setProperty('--width', `${width}px`)
      textRef.current.textContent = items[index]?.label ?? ''
    }
  }, [items])

  const targetIndex = hoveredIndex ?? activeIndex

  useEffect(() => {
    syncEffect(targetIndex)
  }, [targetIndex, syncEffect])

  useEffect(() => {
    const onResize = () => syncEffect(targetIndex)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [targetIndex, syncEffect])

  const spawnParticles = useCallback(() => {
    const els: React.ReactNode[] = []

    for (let i = 0; i < particleCount; i++) {
      const id = idRef.current++
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
      const dist = particleDistances[0] + Math.random() * (particleDistances[1] - particleDistances[0])
      const endX = Math.cos(angle) * dist
      const endY = Math.sin(angle) * dist
      const rotate = Math.random() * 720 - 360
      const scale = 0.5 + Math.random() * 1.5
      const time = animationTime + Math.random() * timeVariance
      const colorIdx = colors[i % colors.length]

      els.push(
        <div
          key={id}
          className="particle"
          style={{
            '--start-x': `${(Math.random() - 0.5) * 10}px`,
            '--start-y': `${(Math.random() - 0.5) * 10}px`,
            '--end-x': `${endX}px`,
            '--end-y': `${endY}px`,
            '--rotate': `${rotate}deg`,
            '--scale': scale,
            '--color': `var(--color-${colorIdx})`,
            '--time': `${time}ms`,
          } as React.CSSProperties}
        >
          <span className="point" />
        </div>
      )
    }

    setParticles(els)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setParticles([])
      setParticleTarget(null)
    }, animationTime + timeVariance + 100)
  }, [particleCount, particleDistances, animationTime, timeVariance, colors])

  const handleClick = (index: number) => {
    if (index === activeIndex) return
    setActiveIndex(index)
    setParticleTarget(index)
    spawnParticles()
  }

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  const setLiRef = (index: number) => (el: HTMLLIElement | null) => {
    if (el) liRefs.current.set(index, el)
    else liRefs.current.delete(index)
  }

  return (
    <div className="gooey-nav-container">
      <nav>
        <ul ref={ulRef} onMouseLeave={handleMouseLeave}>
          {items.map((item, i) => (
            <li
              key={item.label}
              ref={setLiRef(i)}
              className={i === activeIndex ? 'active' : ''}
              onClick={() => handleClick(i)}
              onMouseEnter={() => handleMouseEnter(i)}
            >
              <a href={item.href} tabIndex={-1}>{item.label}</a>
              {i === particleTarget && particles}
            </li>
          ))}
        </ul>
        <div className="effect filter" ref={filterRef} />
        <div className="effect text" ref={textRef} />
      </nav>
    </div>
  )
}

export default GooeyNav
