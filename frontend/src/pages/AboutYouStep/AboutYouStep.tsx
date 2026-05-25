import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import BottomSheet from '../../components/BottomSheet/BottomSheet'
import '../ObjectiveStep/ObjectiveStep.css'
import './AboutYouStep.css'

type ActiveField = 'gender' | 'age' | 'height' | 'weight' | null

interface AboutYouData {
  gender: '' | 'M' | 'F'
  age: string
  height: string
  weight: string
}

const GENDER_LABELS: Record<string, string> = {
  M: 'Hombre',
  F: 'Mujer',
}

function UserIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="22" r="10" stroke="#FAA61A" strokeWidth="3" />
      <path d="M14 54c0-8 8-16 18-16s18 8 18 16" stroke="#FAA61A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="#A09686" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StepperInput({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  min: number
  max: number
  step?: number
  suffix: string
}) {
  const num = parseFloat(value)
  const canDecrement = !value || num > min
  const canIncrement = !value || num < max

  function adjust(delta: number) {
    if (!value) {
      if (delta > 0) onChange(String(min))
      return
    }
    const current = parseFloat(value)
    const next = Math.round((current + delta) * 10) / 10
    if (next >= min && next <= max) {
      onChange(String(next))
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw === '' || raw === '-') {
      onChange('')
      return
    }
    if (/^\d+\.?\d*$/.test(raw) || /^\d*\.?\d+$/.test(raw)) {
      onChange(raw)
    }
  }

  function handleBlur() {
    if (!value) return
    const parsed = parseFloat(value)
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, min), max)
      onChange(String(clamped))
    }
  }

  return (
    <div className="ay-stepper">
      <button
        type="button"
        className="ay-stepper-btn"
        disabled={!canDecrement}
        onClick={() => adjust(-(step || 1))}
        aria-label="Disminuir"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="ay-stepper-value">
        <input
          type="number"
          className="ay-stepper-input"
          value={value}
          onChange={handleInput}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step || 1}
          placeholder="—"
        />
        <span className="ay-stepper-suffix">{suffix}</span>
      </div>

      <button
        type="button"
        className="ay-stepper-btn"
        disabled={!canIncrement}
        onClick={() => adjust(step || 1)}
        aria-label="Aumentar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <line x1="4" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function AboutYouStep() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState<AboutYouData>({
    gender: '',
    age: '',
    height: '',
    weight: '',
  })
  const [activeField, setActiveField] = useState<ActiveField>(null)

  if (!isAuthenticated) {
    navigate('/login', { replace: true })
    return null
  }

  function openSheet(field: ActiveField) {
    setActiveField(field)
  }

  function closeSheet() {
    setActiveField(null)
  }

  function updateField(field: keyof AboutYouData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }))
    closeSheet()
  }

  function handleContinue() {
    if (!data.gender || !data.age || !data.height || !data.weight) return
    sessionStorage.setItem('gender', data.gender)
    sessionStorage.setItem('age', data.age)
    sessionStorage.setItem('height', data.height)
    sessionStorage.setItem('weight', data.weight)
    navigate('/completar-perfil')
  }

  const isComplete = data.gender && data.age && data.height && data.weight

  return (
    <div className="os-page">
      <div className="os-card">
        <button className="os-back" onClick={() => navigate(-1)} aria-label="Volver">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="os-progress-track">
          <div className="os-progress-fill" style={{ width: '45%' }} />
        </div>

        <div className="os-icon-circle">
          <UserIcon />
        </div>

        <h1 className="os-title">Sobre ti</h1>
        <p className="os-subtitle">Cuéntanos tus datos para personalizar tu plan</p>

        <div className="ay-fields">
          <button className="ay-field" onClick={() => openSheet('gender')} type="button">
            <div className="ay-field-icon ay-field-icon--gender">⚤</div>
            <div className="ay-field-text">
              <span className="ay-field-label">Sexo</span>
              <span className={`ay-field-value ${data.gender ? 'ay-field-value--set' : ''}`}>
                {data.gender ? GENDER_LABELS[data.gender] : 'Seleccionar'}
              </span>
            </div>
            <ChevronIcon />
          </button>

          <button className="ay-field" onClick={() => openSheet('age')} type="button">
            <div className="ay-field-icon">🎂</div>
            <div className="ay-field-text">
              <span className="ay-field-label">Edad</span>
              <span className={`ay-field-value ${data.age ? 'ay-field-value--set' : ''}`}>
                {data.age ? `${data.age} años` : 'Seleccionar'}
              </span>
            </div>
            <ChevronIcon />
          </button>

          <button className="ay-field" onClick={() => openSheet('height')} type="button">
            <div className="ay-field-icon">📏</div>
            <div className="ay-field-text">
              <span className="ay-field-label">Altura</span>
              <span className={`ay-field-value ${data.height ? 'ay-field-value--set' : ''}`}>
                {data.height ? `${data.height} cm` : 'Seleccionar'}
              </span>
            </div>
            <ChevronIcon />
          </button>

          <button className="ay-field" onClick={() => openSheet('weight')} type="button">
            <div className="ay-field-icon">⚖️</div>
            <div className="ay-field-text">
              <span className="ay-field-label">Peso</span>
              <span className={`ay-field-value ${data.weight ? 'ay-field-value--set' : ''}`}>
                {data.weight ? `${data.weight} kg` : 'Seleccionar'}
              </span>
            </div>
            <ChevronIcon />
          </button>
        </div>

        <button
          className="os-continue"
          disabled={!isComplete}
          onClick={handleContinue}
          type="button"
        >
          Continuar
        </button>
      </div>

      {/* Gender */}
      <BottomSheet isOpen={activeField === 'gender'} onClose={closeSheet} title="Sexo">
        <button
          type="button"
          className={`ay-option ${data.gender === 'M' ? 'ay-option--selected' : ''}`}
          onClick={() => updateField('gender', 'M')}
        >
          <span className="ay-option-icon">♂</span>
          Hombre
        </button>
        <button
          type="button"
          className={`ay-option ${data.gender === 'F' ? 'ay-option--selected' : ''}`}
          onClick={() => updateField('gender', 'F')}
        >
          <span className="ay-option-icon">♀</span>
          Mujer
        </button>
      </BottomSheet>

      {/* Age */}
      <BottomSheet isOpen={activeField === 'age'} onClose={closeSheet} title="Edad">
        <StepperInput
          value={data.age}
          onChange={(v) => setData((prev) => ({ ...prev, age: v }))}
          min={18}
          max={120}
          suffix="años"
        />
        <button
          className="os-continue"
          disabled={!data.age}
          onClick={closeSheet}
          type="button"
        >
          Listo
        </button>
      </BottomSheet>

      {/* Height */}
      <BottomSheet isOpen={activeField === 'height'} onClose={closeSheet} title="Altura">
        <StepperInput
          value={data.height}
          onChange={(v) => setData((prev) => ({ ...prev, height: v }))}
          min={150}
          max={250}
          suffix="cm"
        />
        <button
          className="os-continue"
          disabled={!data.height}
          onClick={closeSheet}
          type="button"
        >
          Listo
        </button>
      </BottomSheet>

      {/* Weight */}
      <BottomSheet isOpen={activeField === 'weight'} onClose={closeSheet} title="Peso">
        <StepperInput
          value={data.weight}
          onChange={(v) => setData((prev) => ({ ...prev, weight: v }))}
          min={30}
          max={300}
          step={0.5}
          suffix="kg"
        />
        <button
          className="os-continue"
          disabled={!data.weight}
          onClick={closeSheet}
          type="button"
        >
          Listo
        </button>
      </BottomSheet>
    </div>
  )
}

export default AboutYouStep
