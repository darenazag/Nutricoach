import { useEffect, type ReactNode } from 'react'
import './BottomSheet.css'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="bs-overlay" onClick={onClose}>
      <div
        className="bs-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bs-handle" />
        <h2 className="bs-title">{title}</h2>
        <div className="bs-body">{children}</div>
      </div>
    </div>
  )
}

export default BottomSheet
