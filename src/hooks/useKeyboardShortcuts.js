import { useEffect } from 'react'
import { useClassStore } from '../store/useClassStore'
import { useAnnotationStore } from '../store/useAnnotationStore'
import { useSessionStore } from '../store/useSessionStore'

const isTyping = () => {
  const tag = document.activeElement?.tagName ?? ''
  return ['INPUT','TEXTAREA','SELECT'].includes(tag) || document.activeElement?.isContentEditable
}

export function useKeyboardShortcuts(currentFile) {
  const classes    = useClassStore(s => s.classes)
  const setActive  = useClassStore(s => s.setActiveClass)
  const selectedId = useAnnotationStore(s => s.selectedId)
  const deleteAnn  = useAnnotationStore(s => s.deleteAnnotation)
  const undo       = useAnnotationStore(s => s.undo)
  const redo       = useAnnotationStore(s => s.redo)
  const next       = useSessionStore(s => s.nextFile)
  const prev       = useSessionStore(s => s.prevFile)

  useEffect(() => {
    const handle = (e) => {
      if (isTyping()) return

      const digits = ['1','2','3','4','5','6','7','8','9','0']
      if (digits.includes(e.key)) {
        const cls = classes.find(c => c.shortcut === e.key)
        if (cls) setActive(cls.id)
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && currentFile) {
          deleteAnn(currentFile.fileName, currentFile.page, selectedId)
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (currentFile) undo(currentFile.fileName, currentFile.page)
        return
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        if (currentFile) redo(currentFile.fileName, currentFile.page)
        return
      }

      if (e.key === 'ArrowRight') { next(); return }
      if (e.key === 'ArrowLeft')  { prev(); return }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [classes, selectedId, currentFile])
}