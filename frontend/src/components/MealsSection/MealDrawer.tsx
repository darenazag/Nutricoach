import { useState, useRef } from 'react'
import type { Meal } from '../../types'

interface MealDrawerProps {
  open: boolean
  category: string
  onClose: () => void
  onAdd: (meal: Meal) => void
}

function generateMockAnalysis(description: string, category: string): Meal {
  const lower = description.toLowerCase()

  let baseCalories = 350
  let baseProtein = 20
  let baseCarbs = 40
  let baseFat = 12

  if (lower.includes('pollo') || lower.includes('pechuga')) {
    baseCalories = 280; baseProtein = 35; baseCarbs = 5; baseFat = 8
  } else if (lower.includes('arroz')) {
    baseCalories = 200; baseProtein = 5; baseCarbs = 45; baseFat = 0.5
  } else if (lower.includes('ensalada') || lower.includes('verdura')) {
    baseCalories = 150; baseProtein = 3; baseCarbs = 10; baseFat = 10
  } else if (lower.includes('salmón') || lower.includes('pescado')) {
    baseCalories = 350; baseProtein = 30; baseCarbs = 2; baseFat = 22
  } else if (lower.includes('huevo')) {
    baseCalories = 250; baseProtein = 20; baseCarbs = 2; baseFat = 18
  } else if (lower.includes('avena') || lower.includes('granola')) {
    baseCalories = 300; baseProtein = 12; baseCarbs = 50; baseFat = 6
  } else if (lower.includes('batido') || lower.includes('proteína')) {
    baseCalories = 200; baseProtein = 25; baseCarbs = 15; baseFat = 5
  } else if (lower.includes('carne') || lower.includes('res') || lower.includes('lomo')) {
    baseCalories = 400; baseProtein = 35; baseCarbs = 3; baseFat = 28
  } else if (lower.includes('pasta') || lower.includes('fideo') || lower.includes('spaghetti')) {
    baseCalories = 350; baseProtein = 12; baseCarbs = 55; baseFat = 8
  } else if (lower.includes('sopa') || lower.includes('caldo') || lower.includes('crema')) {
    baseCalories = 180; baseProtein = 10; baseCarbs = 15; baseFat = 8
  } else if (lower.includes('tortilla') || lower.includes('quesadilla')) {
    baseCalories = 320; baseProtein = 15; baseCarbs = 30; baseFat = 16
  } else if (lower.includes('pan') || lower.includes('sándwich') || lower.includes('sandwich')) {
    baseCalories = 350; baseProtein = 18; baseCarbs = 35; baseFat = 14
  } else if (lower.includes('fruta')) {
    baseCalories = 120; baseProtein = 1; baseCarbs = 28; baseFat = 0.5
  }

  const multiplier = (description.split(/\s+/).length > 5 ? 1.5 : 1) +
    (lower.includes('doble') || lower.includes('extra') || lower.includes('grande') ? 0.5 : 0)

  const name = description.charAt(0).toUpperCase() + description.slice(1).toLowerCase().replace(/\s+/g, ' ').trim()

  const ingredientMap: Record<string, string[]> = {
    pollo: ['Pechuga de pollo', 'Especias', 'Aceite de oliva'],
    arroz: ['Arroz blanco', 'Agua', 'Sal'],
    ensalada: ['Lechuga', 'Tomate', 'Pepino', 'Aderezo ligero'],
    salmón: ['Filete de salmón', 'Limón', 'Eneldo', 'Aceite de oliva'],
    huevo: ['Huevos', 'Sal', 'Pimienta', 'Aceite'],
    avena: ['Avena en hojuelas', 'Leche', 'Canela'],
    batido: ['Proteína en polvo', 'Leche', 'Plátano'],
    carne: ['Carne de res', 'Sal', 'Pimienta', 'Aceite'],
    pasta: ['Pasta', 'Salsa de tomate', 'Queso parmesano'],
    sopa: ['Caldo de verduras', 'Verduras mixtas', 'Sal'],
    tortilla: ['Tortilla de maíz', 'Queso', 'Frijoles'],
    pan: ['Pan integral', 'Pavo', 'Lechuga', 'Tomate'],
    fruta: ['Fruta fresca'],
  }

  let ingredients: string[] = ['Ingrediente principal', 'Guarnición']
  for (const [key, vals] of Object.entries(ingredientMap)) {
    if (lower.includes(key)) { ingredients = vals; break }
  }

  const finalKcal = Math.round(baseCalories * multiplier)
  const finalProtein = Math.round(baseProtein * multiplier)
  const finalCarbs = Math.round(baseCarbs * multiplier)
  const finalFat = Math.round(baseFat * multiplier)

  return {
    meal_id: -Date.now(),
    name,
    calories: finalKcal,
    protein: finalProtein,
    carbs: finalCarbs,
    fat: finalFat,
    img: null,
    source: category ? `${name} - ${category}` : name,
    ingredients,
    confidence: Math.floor(Math.random() * 12) + 84,
    mealType: category || 'Otras',
  }
}

export default function MealDrawer({ open, category, onClose, onAdd }: MealDrawerProps) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'analyzing' | 'done'>('form')
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    if (!text.trim() && !preview) return
    setLoading(true)
    setStep('analyzing')
    await new Promise(r => setTimeout(r, 1500))
    const mock = generateMockAnalysis(text.trim() || 'Comida personalizada', category)
    onAdd(mock)
    setLoading(false)
    setStep('done')
    setTimeout(() => {
      setText('')
      setPreview(null)
      setStep('form')
      onClose()
    }, 400)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  if (!open) return null

  return (
    <>
      <div className="meal-drawer-backdrop" onClick={() => { if (!loading) onClose() }} />
      <div className={`meal-drawer ${open ? 'meal-drawer--open' : ''}`}>
        <div className="meal-drawer-header">
          <h3 className="meal-drawer-title">
            {category ? `Añadir a ${category}` : 'Añadir comida'}
          </h3>
          <button className="meal-drawer-close" onClick={() => { if (!loading) onClose() }} type="button">✕</button>
        </div>

        {step === 'analyzing' ? (
          <div className="meal-drawer-loading">
            <div className="meal-drawer-spinner" />
            <p className="meal-drawer-loading-text">IA analizando tu plato...</p>
            <p className="meal-drawer-loading-sub">{text.trim() || 'Imagen recibida'}</p>
          </div>
        ) : step === 'done' ? (
          <div className="meal-drawer-done">
            <span className="meal-drawer-done-icon">✅</span>
            <p>Comida registrada</p>
          </div>
        ) : (
          <div className="meal-drawer-body">
            <textarea
              ref={inputRef}
              className="meal-drawer-input"
              placeholder="Ej: 100g de pechuga de pollo y 150g de arroz"
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              autoFocus
            />

            {preview && (
              <div className="meal-drawer-preview">
                <img src={preview} alt="Vista previa" />
                <button
                  className="meal-drawer-preview-remove"
                  onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  type="button"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="meal-drawer-actions">
              <button
                className="meal-drawer-btn meal-drawer-btn--upload"
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Subir foto
              </button>
              <button
                className="meal-drawer-btn meal-drawer-btn--submit"
                onClick={handleSubmit}
                disabled={!text.trim() && !preview}
                type="button"
              >
                Analizar con IA
              </button>
            </div>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
    </>
  )
}
