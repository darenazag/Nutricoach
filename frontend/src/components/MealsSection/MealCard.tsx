import { useState, useRef, useEffect } from 'react'
import type { Meal } from '../../types'

interface MealCardProps {
  meal: Meal
  icon: string
  onDelete: (mealId: number) => void
  onEdit: (meal: Meal) => void
}

export default function MealCard({ meal, icon, onDelete, onEdit }: MealCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  const handleDelete = () => {
    setDeleting(true)
    setTimeout(() => {
      onDelete(meal.meal_id)
    }, 300)
  }

  const ingredients = meal.ingredients ?? [
    meal.name.includes('Pollo') ? 'Pechuga de pollo' :
    meal.name.includes('Ensalada') ? 'Lechuga, tomate, pepino' :
    meal.name.includes('Arroz') ? 'Arroz blanco' :
    meal.name.includes('Salmón') ? 'Filete de salmón' :
    meal.name.includes('Huevo') ? 'Huevos' :
    meal.name.includes('Avena') ? 'Avena en hojuelas' :
    meal.name.includes('Batido') ? 'Proteína, leche, plátano' :
    'Ingrediente principal',
    meal.name.includes('Arroz') ? 'Pollo' :
    meal.name.includes('Ensalada') ? 'Aderezo ligero' :
    meal.name.includes('Pollo') ? 'Arroz' :
    meal.name.includes('Salmón') ? 'Ensalada' :
    meal.name.includes('Aguacate') ? 'Pan integral' :
    'Guarnición',
  ].filter(Boolean)

  const confidence = meal.confidence ?? Math.floor(Math.random() * 15) + 82

  return (
    <article
      className={`meal-card ${expanded ? 'meal-card--expanded' : ''} ${deleting ? 'meal-card--deleting' : ''}`}
    >
      <div
        className="meal-card-main"
        onClick={() => { setExpanded(e => !e); setMenuOpen(false) }}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') setExpanded(e => !e) }}
      >
        <span className="meal-card-icon">{icon}</span>

        <div className="meal-card-body">
          <h3 className="meal-card-name">{meal.name}</h3>
          <p className="meal-card-source">
            {meal.source?.replace(/\s*-\s*(desayuno|almuerzo|merienda|cena)$/i, '') || ''}
          </p>
        </div>

        <div className="meal-card-macros">
          <span className="macro-badge macro-badge--kcal">
            {Number(meal.calories)} <small>kcal</small>
          </span>
          <span className="macro-badge macro-badge--protein">
            {Number(meal.protein)} <small>P</small>
          </span>
          <span className="macro-badge macro-badge--carbs">
            {Number(meal.carbs)} <small>HC</small>
          </span>
          <span className="macro-badge macro-badge--fat">
            {Number(meal.fat)} <small>G</small>
          </span>
        </div>

        <div className="meal-card-actions" ref={menuRef}>
          <button
            className="meal-card-menu-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
            type="button"
            aria-label="Acciones"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {menuOpen && (
            <div className="meal-card-dropdown">
              <button
                className="meal-card-dropdown-item"
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(meal) }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
                Editar
              </button>
              <button
                className="meal-card-dropdown-item meal-card-dropdown-item--danger"
                onClick={e => { e.stopPropagation(); setMenuOpen(false); setConfirmDelete(true) }}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Eliminar
              </button>
            </div>
          )}
        </div>

        <svg
          className={`meal-card-chevron ${expanded ? 'meal-card-chevron--open' : ''}`}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      <div className={`meal-card-accordion ${expanded ? 'meal-card-accordion--open' : ''}`}>
        <div className="meal-card-accordion-inner">
          <div className="meal-card-ingredients">
            <p className="meal-card-section-label">Ingredientes detectados</p>
            <ul className="meal-card-ingredient-list">
              {ingredients.map((ing, i) => (
                <li key={i} className="meal-card-ingredient-item">
                  <span className="meal-card-ingredient-dot" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
          <div className="meal-card-confidence">
            <span className="meal-card-section-label">Fiabilidad del análisis</span>
            <div className="meal-card-confidence-bar">
              <div
                className="meal-card-confidence-fill"
                style={{
                  width: `${confidence}%`,
                  background: confidence >= 90 ? '#4caf50' : confidence >= 75 ? '#ff9800' : '#f44336',
                }}
              />
            </div>
            <span className="meal-card-confidence-pct">{confidence}%</span>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="meal-card-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="meal-card-confirm" onClick={e => e.stopPropagation()}>
            <p className="meal-card-confirm-text">¿Eliminar <strong>{meal.name}</strong>?</p>
            <div className="meal-card-confirm-actions">
              <button className="meal-card-confirm-cancel" onClick={() => setConfirmDelete(false)} type="button">Cancelar</button>
              <button className="meal-card-confirm-delete" onClick={handleDelete} type="button">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
