import { useNavigate } from 'react-router-dom'
import './AIBubble.css'

function AIBubble() {
  const navigate = useNavigate()
  return (
    <button
      className="ai-bubble"
      onClick={() => navigate('/asistente-ia')}
      type="button"
      aria-label="Abrir Asistente IA"
    >
      <span className="ai-bubble-icon">🤖</span>
    </button>
  )
}

export default AIBubble
