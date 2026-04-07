import { RotateCcw, Trash2, ChevronLeft, ChevronRight, Crop, Wand2, Loader } from 'lucide-react'
import { useAnnotationStore } from '../../store/useAnnotationStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useModeStore } from '../../store/useModeStore'
import { useModelStore } from '../../store/useModelStore'
import Tooltip from '../ui/Tooltip'

export default function CanvasToolbar({ fileName, page, onDeskew, onAutoAnnotate, autoAnnotating, autoAnnotateMsg }) {
  const undo       = useAnnotationStore(s => s.undo)
  const clearAll   = useAnnotationStore(s => s.clearAnnotations)
  const annCount   = useAnnotationStore(s => s.getAnnotations(fileName, page).length)
  const next       = useSessionStore(s => s.nextFile)
  const prev       = useSessionStore(s => s.prevFile)
  const currentIdx = useSessionStore(s => s.currentIdx)
  const total      = useSessionStore(s => s.flatQueue.length)
  const mode       = useModeStore(s => s.mode)
  const modelPath  = useModelStore(s => s.modelPath)

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

  const canAutoAnnotate = mode === 'object' && !!modelPath && !!fileName && !autoAnnotating

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

      {/* Auto-Annotate — object mode only */}
      {mode === 'object' && (
        <>
          <div style={{ width: 1, height: 18, background: 'var(--surface-border)', margin: '0 4px' }} />
          <Tooltip
            text={!modelPath ? 'Select a model in the Model tab first' : !fileName ? 'Open an image first' : 'Run model on this image and add bounding boxes'}
            position="bottom"
          >
            <button
              onClick={canAutoAnnotate ? onAutoAnnotate : undefined}
              disabled={!canAutoAnnotate}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: canAutoAnnotate ? '#9B59B622' : 'transparent',
                border: `1px solid ${canAutoAnnotate ? '#9B59B666' : 'var(--surface-border)'}`,
                borderRadius: 5, padding: '4px 10px',
                cursor: canAutoAnnotate ? 'pointer' : 'not-allowed',
                color: canAutoAnnotate ? '#9B59B6' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                opacity: autoAnnotating ? 0.7 : 1,
                transition: 'all 0.15s',
              }}
            >
              {autoAnnotating
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
                : <><Wand2 size={13} /> Auto-Annotate</>
              }
            </button>
          </Tooltip>

          {autoAnnotateMsg && (
            <span style={{
              fontSize: 11, fontFamily: 'JetBrains Mono,monospace',
              color: autoAnnotateMsg.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
              padding: '0 6px',
            }}>
              {autoAnnotateMsg}
            </span>
          )}
        </>
      )}

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
