import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './ObjectiveStep.css'

type Objective = 'P' | 'G' | 'M'

interface ObjectiveOption {
  value: Objective
  title: string
  description: string
}

const OBJECTIVES: ObjectiveOption[] = [
  {
    value: 'P',
    title: 'Perder Grasa',
    description: 'Optimiza la pérdida de peso y conserva tu masa muscular',
  },
  {
    value: 'G',
    title: 'Ganar Músculo',
    description: 'Incrementa tu peso y hazte más fuerte',
  },
  {
    value: 'M',
    title: 'Mantener Peso',
    description: 'Mantén tu peso estable y busca la recomposición corporal',
  },
]

function ArrowBackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

function BullseyeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke="#FAA61A" strokeWidth="3" />
      <circle cx="32" cy="32" r="20" stroke="#FAA61A" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="12" stroke="#FAA61A" strokeWidth="2" />
      <circle cx="32" cy="32" r="4" fill="#FAA61A" />
      <line x1="32" y1="2" x2="32" y2="10" stroke="#FAA61A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="32" y1="54" x2="32" y2="62" stroke="#FAA61A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="32" x2="10" y2="32" stroke="#FAA61A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="54" y1="32" x2="62" y2="32" stroke="#FAA61A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 4v16M8 14l6 6 6-6" stroke="#FAA61A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 22h16" stroke="#FAA61A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 24V8M8 14l6-6 6 6" stroke="#FAA61A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 6h16" stroke="#FAA61A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function HorizontalLineIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <line x1="4" y1="14" x2="24" y2="14" stroke="#FAA61A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="14" cy="14" r="3" fill="#FAA61A" />
    </svg>
  )
}

const ICONS: Record<Objective, () => React.ReactNode> = {
  P: ArrowDownIcon,
  G: ArrowUpIcon,
  M: HorizontalLineIcon,
}

function ObjectiveStep() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Objective | null>(null)

  if (!isAuthenticated) {
    navigate('/login', { replace: true })
    return null
  }

  function handleContinue() {
    if (!selected) return
    sessionStorage.setItem('objective', selected)
    navigate('/sobre-ti')
  }

  return (
    <div className="os-page">
      <div className="os-card">
        <button className="os-back btn-back-circle" onClick={() => navigate(-1)} aria-label="Volver">
          <ArrowBackIcon />
        </button>

        <div className="os-progress-track">
          <div className="os-progress-fill" style={{ width: '14%' }} />
        </div>

        <div className="os-icon-circle">
          <BullseyeIcon />
        </div>

        <h1 className="os-title">¿Cuál es tu objetivo?</h1>
        <p className="os-subtitle">Calcularemos tus calorías necesarias para lograrlo</p>

        <div className="os-options">
          {OBJECTIVES.map((obj) => {
            const isSelected = selected === obj.value
            const Icon = ICONS[obj.value]
            return (
              <button
                key={obj.value}
                type="button"
                className={`os-option ${isSelected ? 'os-option--selected' : ''}`}
                onClick={() => setSelected(obj.value)}
              >
                <div className={`os-option-icon ${isSelected ? 'os-option-icon--selected' : ''}`}>
                  <Icon />
                </div>
                <div className="os-option-text">
                  <span className="os-option-title">{obj.title}</span>
                  <span className="os-option-desc">{obj.description}</span>
                </div>
              </button>
            )
          })}
        </div>

        <button
          className="os-continue"
          disabled={!selected}
          onClick={handleContinue}
          type="button"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

export default ObjectiveStep
