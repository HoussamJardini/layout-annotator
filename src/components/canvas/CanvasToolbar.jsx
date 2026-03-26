import { RotateCcw, Trash2, ChevronLeft, ChevronRight, Crop } from 'lucide-react'
import { useAnnotationStore } from '../../store/useAnnotationStore'
import { useSessionStore } from '../../store/useSessionStore'
import Tooltip from '../ui/Tooltip'

export default function CanvasToolbar({ fileName, page, onDeskew }) {
  const undo       = useAnnotationStore(s => s.undo)
  const clearAll   = useAnnotationStore(s => s.clearAnnotations)
  const annCount   = useAnnotationStore(s => s.getAnnotations(fileName, page).length)
  const next       = useSessionStore(s => s.nextFile)
  const prev       = useSessionStore(s => s.prevFile)
  const currentIdx = useSessionStore(s => s.currentIdx)
  const total      = useSessionStore(s => s.flatQueue.length)

  const btn = (icon, label, onClick) => (
    <Tooltip text={label} position="bottom">
      <button onClick={onClick} style={{
        background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
        color: 'var(--text-secondary)', padding: 7, borderRadius: 5,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-raised)'; e.currentTarget.style.color = 'var(--text-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >{icon}</button>
    </Tooltip>
  )

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      padding: '4px 12px', borderBottom: '1px solid var(--surface-border)',
      background: 'var(--surface)', flexShrink: 0,
    }}>
      {btn(<ChevronLeft size={15} />, 'Previous (←)', prev)}
      <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 6px', fontFamily: 'JetBrains Mono, monospace' }}>
        {currentIdx + 1} / {total}
      </span>
      {btn(<ChevronRight size={15} />, 'Next (→)', next)}
      <div style={{ width: 1, height: 18, background: 'var(--surface-border)', margin: '0 4px' }} />
      {btn(<RotateCcw size={14} />, 'Undo (Ctrl+Z)', () => undo(fileName, page))}
      {btn(<Trash2 size={14} />, 'Clear all', () => { if (confirm('Clear all annotations for this image?')) clearAll(fileName, page) })}
      <div style={{ flex: 1 }} />
      {onDeskew && btn(<Crop size={14} />, 'Perspective correction (deskew)', onDeskew)}
      <div style={{ width: 1, height: 18, background: 'var(--surface-border)', margin: '0 4px' }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
        {annCount} annotations
      </span>
      <div style={{ width: 1, height: 18, background: 'var(--surface-border)', margin: '0 4px' }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
        left=draw · right=pan · scroll=zoom · Del=delete
      </span>
    </div>
  )
}