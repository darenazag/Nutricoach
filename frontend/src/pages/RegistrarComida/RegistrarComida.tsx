import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header/Header'
import { mealService } from '../../services/mealService'
import type { Meal, Analysis } from '../../types'
import './RegistrarComida.css'


const CATEGORIES = [
  { id: 'Desayuno', icon: '🌅' },
  { id: 'Almuerzo', icon: '☀️' },
  { id: 'Merienda', icon: '🌤️' },
  { id: 'Cena', icon: '🌙' },
] as const

const MEAL_ICONS = ['🍗', '🍚', '🥗', '🥤', '🐟', '🥩', '🥑', '🍳']

type Tab = 'foto' | 'lista'

function RegistrarComida() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('categoria') || 'Desayuno'
  const validCat = CATEGORIES.find(c => c.id.toLowerCase() === initialCategory.toLowerCase())
  const [selectedCategory, setSelectedCategory] = useState(validCat?.id ?? 'Desayuno')
  const [tab, setTab] = useState<Tab>('foto')

  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<number | null>(null)

  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [editName, setEditName] = useState('')
  const [editCalories, setEditCalories] = useState('')
  const [editProtein, setEditProtein] = useState('')
  const [editFat, setEditFat] = useState('')
  const [editCarbs, setEditCarbs] = useState('')
  const [saving, setSaving] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    mealService.getAll()
      .then(data => setMeals(data.meals || []))
      .catch(() => setMeals([]))
      .finally(() => setLoading(false))
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    uploadForAnalysis(file)
  }

  async function uploadForAnalysis(file: File) {
    setAnalyzing(true)
    setAnalysis(null)

    try {
      const data = await mealService.analyzeImage(file)
      const a = data.analysis
      setAnalysis({
        name: a.name,
        calories: a.calories,
        protein: a.protein,
        fat: a.fat,
        carbs: a.carbs,
        source: a.source,
        analysisId: data.analysisId,
        responseText: data.responseText,
        detectedFoods: data.detectedFoods,
        proportions: data.proportions,
        recommendations: data.recommendations,
        warnings: data.warnings,
        confidence: data.confidence,
      })
      setEditName(a.name)
      setEditCalories(String(Math.round(a.calories)))
      setEditProtein(String(Math.round(a.protein)))
      setEditFat(String(Math.round(a.fat)))
      setEditCarbs(String(Math.round(a.carbs)))
    } catch {
      alert('Error al analizar la imagen. Intenta de nuevo.')
      setPreview(null)
    } finally {
      setAnalyzing(false)
    }
  }

  function resetPhoto() {
    setPreview(null)
    setAnalysis(null)
    setAnalyzing(false)
  }

  async function handleSave() {
    const name = editName.trim()
    const calories = Number(editCalories)
    const protein = Number(editProtein)
    const fat = Number(editFat)
    const carbs = Number(editCarbs)

    if (!name || !calories || !protein || !fat || !carbs) {
      alert('Completa todos los campos')
      return
    }

    setSaving(true)

    try {
      await mealService.saveAnalyzedMeal({
        name,
        calories,
        protein,
        fat,
        carbs,
        mealType: selectedCategory,
        analysisId: analysis?.analysisId,
      })
      navigate('/perfil')
    } catch (err) {
      console.error('[handleSave] Error al guardar comida:', err)
      const msg = err instanceof Error && err.message && err.message !== '[object Object]'
        ? err.message
        : 'Error al guardar la comida. Intenta de nuevo.'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleAssign(mealId: number) {
    setAssigning(mealId)
    try {
      await mealService.assign(mealId, selectedCategory.toLowerCase())
      navigate('/perfil')
    } catch {
      // ignore
    } finally {
      setAssigning(null)
    }
  }

  return (
    <>
      <Header />
      <div className="rc-page">
        <div className="rc-container">
          <div className="rc-header">
            <button className="btn-back-circle" onClick={() => navigate(-1)} aria-label="Volver">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="rc-title">Registrar comida</h1>
          </div>

          <div className="rc-categories">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`rc-cat-pill ${selectedCategory === cat.id ? 'rc-cat-pill--active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
                type="button"
              >
                <span>{cat.icon}</span>
                {cat.id}
              </button>
            ))}
          </div>

          {/* TABS */}
          <div className="rc-tabs">
            <button
              className={`rc-tab ${tab === 'foto' ? 'rc-tab--active' : ''}`}
              onClick={() => setTab('foto')}
              type="button"
            >
              <span>📷</span> Foto
            </button>
            <button
              className={`rc-tab ${tab === 'lista' ? 'rc-tab--active' : ''}`}
              onClick={() => setTab('lista')}
              type="button"
            >
              <span>🍽️</span> Lista
            </button>
          </div>

          {/* TAB: FOTO */}
          {tab === 'foto' && (
            <div className="rc-photo-section">
              {!preview && !analyzing && !analysis && (
                <div className="rc-upload-area">
                  <div className="rc-upload-icon">📸</div>
                  <p className="rc-upload-text">Toma o sube una foto de tu comida</p>
                  <p className="rc-upload-hint">La IA analizará la imagen y estimará sus nutrientes</p>
                  <div className="rc-upload-buttons">
                    <button className="rc-upload-btn rc-upload-btn--camera" onClick={() => cameraRef.current?.click()} type="button">
                      <span>📷</span> Tomar foto
                    </button>
                    <button className="rc-upload-btn rc-upload-btn--gallery" onClick={() => fileRef.current?.click()} type="button">
                      <span>🖼️</span> Subir foto
                    </button>
                  </div>
                </div>
              )}

              {analyzing && (
                <div className="rc-analyzing">
                  <div className="rc-spinner" />
                  <p>Analizando tu comida...</p>
                  <p className="rc-analyzing-hint">La IA está identificando los alimentos y calculando nutrientes</p>
                </div>
              )}

              {preview && !analyzing && analysis && (
                <div className="rc-result">
                  <div className="rc-result-img-wrap">
                    <img src={preview} alt="Comida" className="rc-result-img" />
                    <button className="rc-result-rephoto" onClick={resetPhoto} type="button">✕ Cambiar foto</button>
                  </div>

                  {analysis.responseText && (
                    <div className="rc-ai-summary">
                      <span className="rc-ai-summary-icon">🤖</span>
                      <p className="rc-ai-summary-text">{analysis.responseText}</p>
                    </div>
                  )}

                  {analysis.detectedFoods && analysis.detectedFoods.length > 0 && (
                    <div className="rc-detected-foods">
                      <p className="rc-section-label">Alimentos detectados</p>
                      <div className="rc-food-tags">
                        {analysis.detectedFoods.map((f, i) => (
                          <span key={i} className={`rc-food-tag rc-food-tag--${f.confidence}`}>
                            {f.name}
                            {f.estimatedQuantity ? ` · ${f.estimatedQuantity}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.proportions && (
                    <div className="rc-proportions">
                      <p className="rc-section-label">Proporción estimada</p>
                      <div className="rc-prop-row">
                        <span className="rc-prop rc-prop--protein">P {analysis.proportions.protein}</span>
                        <span className="rc-prop rc-prop--carbs">HC {analysis.proportions.carbs}</span>
                        <span className="rc-prop rc-prop--veg">Veg {analysis.proportions.vegetables}</span>
                        <span className="rc-prop rc-prop--fat">G {analysis.proportions.fats}</span>
                      </div>
                    </div>
                  )}

                  {analysis.warnings && analysis.warnings.length > 0 && (
                    <div className="rc-warnings">
                      {analysis.warnings.map((w, i) => (
                        <p key={i} className="rc-warning-item">⚠️ {w}</p>
                      ))}
                    </div>
                  )}

                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div className="rc-recommendations">
                      <p className="rc-section-label">Recomendaciones</p>
                      <ul className="rc-rec-list">
                        {analysis.recommendations.map((r, i) => (
                          <li key={i} className="rc-rec-item">✓ {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="rc-result-form">
                    <div className="rc-field">
                      <label className="rc-label">Nombre del plato</label>
                      <input className="rc-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ej: Pechuga con arroz" />
                    </div>

                    <div className="rc-field-row">
                      <div className="rc-field">
                        <label className="rc-label">Calorías</label>
                        <input className="rc-input rc-input--kcal" type="number" value={editCalories} onChange={e => setEditCalories(e.target.value)} />
                      </div>
                    </div>

                    <div className="rc-field-row rc-field-row--3">
                      <div className="rc-field">
                        <label className="rc-label rc-label--protein">Proteínas (g)</label>
                        <input className="rc-input rc-input--protein" type="number" value={editProtein} onChange={e => setEditProtein(e.target.value)} />
                      </div>
                      <div className="rc-field">
                        <label className="rc-label rc-label--carbs">Carbos (g)</label>
                        <input className="rc-input rc-input--carbs" type="number" value={editCarbs} onChange={e => setEditCarbs(e.target.value)} />
                      </div>
                      <div className="rc-field">
                        <label className="rc-label rc-label--fat">Grasas (g)</label>
                        <input className="rc-input rc-input--fat" type="number" value={editFat} onChange={e => setEditFat(e.target.value)} />
                      </div>
                    </div>

                    <div className="rc-cat-selector">
                      <span className="rc-cat-selector-label">Asignar a:</span>
                      <div className="rc-cat-selector-pills">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            className={`rc-cat-opt ${selectedCategory === cat.id ? 'rc-cat-opt--active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            type="button"
                          >
                            {cat.icon} {cat.id}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      className="rc-save-btn"
                      onClick={handleSave}
                      disabled={saving}
                      type="button"
                    >
                      {saving ? 'Guardando...' : `✓ Guardar ${selectedCategory.toLowerCase()}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: LISTA */}
          {tab === 'lista' && (
            <div className="rc-list-section">
              <p className="rc-list-subtitle">Selecciona una comida existente para añadir a tu día</p>

              {loading ? (
                <p className="rc-empty">Cargando comidas...</p>
              ) : meals.length === 0 ? (
                <p className="rc-empty">No hay comidas disponibles</p>
              ) : (
                <div className="rc-list">
                  {meals.map((meal, i) => (
                    <div key={meal.meal_id} className="rc-card card-row">
                      <div className="rc-card-icon">
                        {MEAL_ICONS[i % MEAL_ICONS.length]}
                      </div>
                      <div className="rc-card-body">
                        <h3 className="rc-card-name">{meal.name}</h3>
                        <p className="rc-card-source">{(meal.source || '').replace(/\s*-\s*(desayuno|almuerzo|merienda|cena)$/i, '')}</p>
                        <div className="rc-card-macros">
                          <span className="rc-macro rc-macro--kcal">{Number(meal.calories)} kcal</span>
                          <span className="rc-macro rc-macro--protein">{Number(meal.protein)}g P</span>
                          <span className="rc-macro rc-macro--carbs">{Number(meal.carbs)}g C</span>
                          <span className="rc-macro rc-macro--fat">{Number(meal.fat)}g G</span>
                        </div>
                      </div>
                      <button
                        className="rc-add-btn"
                        onClick={() => handleAssign(meal.meal_id)}
                        disabled={assigning === meal.meal_id}
                        type="button"
                      >
                        {assigning === meal.meal_id ? '...' : '+'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
    </>
  )
}

export default RegistrarComida
