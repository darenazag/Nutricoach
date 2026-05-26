import { useState, useRef } from 'react'
import { mealService } from '../../services/mealService'
import './AIBubble.css'


interface Props {
  onMealAdded: () => void
}

function AIBubble({ onMealAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    uploadImage(file)
  }

  async function uploadImage(file: File) {
    setLoading(true)

    try {
      await mealService.analyzeImageQuick(file)
      onMealAdded()
      setTimeout(() => {
        setOpen(false)
        setPreview(null)
      }, 800)
    } catch {
      alert('Error al analizar la imagen. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className={`ai-bubble ${open ? 'ai-bubble--active' : ''}`} onClick={() => setOpen(o => !o)} type="button">
        <span className="ai-bubble-icon">{loading ? '⏳' : '🤖'}</span>
      </button>

      {open && <div className="ai-overlay" onClick={() => { setOpen(false); setPreview(null) }} />}

      <div className={`ai-modal ${open ? 'ai-modal--open' : ''}`}>
        <div className="ai-modal-header">
          <span className="ai-modal-title">🤖 Analizar comida con IA</span>
          <button className="ai-modal-close" onClick={() => { setOpen(false); setPreview(null) }} type="button">✕</button>
        </div>

        <div className="ai-modal-body">
          {loading ? (
            <div className="ai-loading">
              <div className="ai-spinner" />
              <p>Analizando tu comida...</p>
            </div>
          ) : preview ? (
            <div className="ai-preview">
              <img src={preview} alt="Preview" />
              <p className="ai-preview-done">✅ Imagen recibida</p>
            </div>
          ) : (
            <div className="ai-options">
              <button className="ai-option-btn" onClick={() => cameraRef.current?.click()} type="button">
                <span className="ai-option-icon">📸</span>
                <span>Tomar foto</span>
              </button>
              <button className="ai-option-btn" onClick={() => fileRef.current?.click()} type="button">
                <span className="ai-option-icon">🖼️</span>
                <span>Subir de galería</span>
              </button>
            </div>
          )}
        </div>

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
    </>
  )
}

export default AIBubble
