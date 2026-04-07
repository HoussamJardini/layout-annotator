import { useState, useCallback, useRef, useEffect } from 'react'
import { Trash2, Table2, Type, Image, Sparkles, Check, X, Loader, Plus, ChevronDown } from 'lucide-react'
import { useAnnotationStore } from '../../store/useAnnotationStore'
import { useClassStore } from '../../store/useClassStore'
import TableBuilder from '../canvas/TableBuilder'
import { useOCR, shouldAutoOCR } from '../../hooks/useOCR'
import { useModeStore } from '../../store/useModeStore'

// Consistent color from label name
const _PALETTE = ['#3498db','#9b59b6','#e67e22','#1abc9c','#e74c3c','#f39c12','#2980b9','#27ae60','#c0392b','#16a085','#8e44ad','#d35400','#2ecc71','#34495e','#f1c40f']
function nameToColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return _PALETTE[h % _PALETTE.length]
}

// ─── ClassPicker ─────────────────────────────────────────────────────────────
function ClassPicker({ ann, fileName, page }) {
  const classes   = useClassStore(s => s.classes)
  const addClass  = useClassStore(s => s.addClass)
  const updateAnn = useAnnotationStore(s => s.updateAnnotation)
  const getClass  = useClassStore(s => s.getClassById)

  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const inputRef = useRef(null)

  const cls      = getClass(ann.classId)
  const filtered = classes.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase())
  )
  const exactMatch = classes.find(c => c.name.toLowerCase() === query.trim().toLowerCase())
  const canCreate  = query.trim() && !exactMatch

  // Close on outside click
  const wrapRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const assign = (classId) => {
    updateAnn(fileName, page, ann.id, { classId })
    setOpen(false)
    setQuery('')
  }

  const createAndAssign = () => {
    const name = query.trim()
    if (!name) return
    const id = `cls_${Date.now()}`
    addClass({ id, name, color: nameToColor(name), shortcut: '', description: '' })
    assign(id)
  }

  return (
    <div ref={wrapRef} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
      <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Class</label>

      {/* Trigger */}
      <div
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
          background: 'var(--navy-900)', border: `1px solid ${open ? 'var(--accent)' : 'var(--surface-border)'}`,
          transition: 'border-color 0.12s',
        }}
      >
        <div style={{ width: 10, height: 10, borderRadius: 3, background: cls?.color ?? '#666', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cls?.name ?? 'unknown'}
        </span>
        <ChevronDown size={11} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 3,
          background: 'var(--surface)', border: '1px solid var(--surface-border)',
          borderRadius: 7, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{ padding: '7px 8px', borderBottom: '1px solid var(--surface-border)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') canCreate ? createAndAssign() : filtered[0] && assign(filtered[0].id)
                if (e.key === 'Escape') setOpen(false)
              }}
              placeholder="Search or type new class…"
              style={{
                width: '100%', background: 'var(--navy-900)', border: '1px solid var(--surface-border)',
                borderRadius: 5, padding: '4px 8px', color: 'var(--text-primary)',
                fontSize: 11.5, fontFamily: 'JetBrains Mono,monospace', outline: 'none',
              }}
            />
          </div>

          {/* Class list */}
          <div style={{ maxHeight: 160, overflowY: 'auto' }}>
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => assign(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', cursor: 'pointer',
                  background: c.id === ann.classId ? c.color + '1a' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (c.id !== ann.classId) e.currentTarget.style.background = 'var(--navy-800)' }}
                onMouseLeave={e => { e.currentTarget.style.background = c.id === ann.classId ? c.color + '1a' : 'transparent' }}
              >
                <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: c.id === ann.classId ? c.color : 'var(--text-secondary)', fontFamily: 'JetBrains Mono,monospace' }}>
                  {c.name}
                </span>
                {c.id === ann.classId && <Check size={11} color={c.color} />}
              </div>
            ))}

            {/* Create new */}
            {canCreate && (
              <div
                onClick={createAndAssign}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', cursor: 'pointer',
                  borderTop: filtered.length ? '1px solid var(--surface-border)' : 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#9B59B611'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Plus size={11} color="#9B59B6" />
                <span style={{ fontSize: 12, color: '#9B59B6', fontFamily: 'JetBrains Mono,monospace' }}>
                  Create &ldquo;{query.trim()}&rdquo;
                </span>
              </div>
            )}

            {filtered.length === 0 && !canCreate && (
              <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>No classes found</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const getMode = (clsName) => {
  if (!clsName) return 'text'
  const n = clsName.toLowerCase()
  if (n.includes('table') && !n.includes('cell')) return 'table'
  if (n.includes('figure') || n.includes('image') || n.includes('logo') || n.includes('chart')) return 'image'
  return 'text'
}

function OCRSuggestion({ suggestion, onAccept, onDismiss }) {
  const conf = suggestion.confidence
  const confColor = conf > 0.85 ? '#27ae60' : conf > 0.6 ? '#f39c12' : '#e74c3c'

  return (
    <div className="fade-in" style={{
      background: 'var(--navy-800)', border: '1px solid #2E86AB55',
      borderRadius: 6, padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sparkles size={11} color="#2E86AB" />
        <span style={{ fontSize: 10, color: '#2E86AB', fontWeight: 700, letterSpacing: '0.05em' }}>
          OCR SUGGESTION
        </span>
        <span style={{ fontSize: 10, color: confColor, marginLeft: 'auto', fontFamily: 'JetBrains Mono,monospace' }}>
          {Math.round(conf * 100)}% conf
        </span>
      </div>

      <div style={{
        background: 'var(--surface)', borderRadius: 4, padding: '5px 8px',
        fontSize: 11.5, color: 'var(--text-primary)', lineHeight: 1.55,
        maxHeight: 80, overflowY: 'auto',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        border: '1px solid var(--surface-border)',
      }}>
        {suggestion.text
          ? suggestion.text
          : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No text detected</span>
        }
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onAccept} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          background: '#27ae6022', border: '1px solid #27ae6066',
          borderRadius: 5, padding: '5px', cursor: 'pointer',
          fontSize: 11, color: '#27ae60', fontFamily: 'inherit', fontWeight: 600,
        }}>
          <Check size={11} /> Accept
        </button>
        <button onClick={onDismiss} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          background: 'transparent', border: '1px solid var(--surface-border)',
          borderRadius: 5, padding: '5px', cursor: 'pointer',
          fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit',
        }}>
          <X size={11} /> Dismiss
        </button>
      </div>
    </div>
  )
}

function AnnItem({ ann, index, fileName, page, imageUrl, imgWidth, imgHeight }) {
  const selectedId    = useAnnotationStore(s => s.selectedId)
  const setSelected   = useAnnotationStore(s => s.setSelected)
  const deleteAnn     = useAnnotationStore(s => s.deleteAnnotation)
  const updateAnn     = useAnnotationStore(s => s.updateAnnotation)
  const getClass      = useClassStore(s => s.getClassById)

  const [showTable, setShowTable]         = useState(false)
  const [ocrLoading, setOcrLoading]       = useState(false)
  const [ocrSuggestion, setOcrSuggestion] = useState(null)

  const { runOCR, serverOnline } = useOCR()
  const appMode    = useModeStore(s => s.mode)

  const cls        = getClass(ann.classId)
  const isSelected = ann.id === selectedId
  const mode       = getMode(cls?.name)
  const color      = cls?.color ?? '#888888'
  const ModeIcon   = mode === 'table' ? Table2 : mode === 'image' ? Image : Type
  const canOCR     = mode === 'text' && shouldAutoOCR(cls?.name) && imageUrl && appMode === 'document'

  const triggerOCR = useCallback(async (e) => {
    e.stopPropagation()
    if (ocrLoading) return
    setOcrLoading(true)
    setOcrSuggestion(null)
    const result = await runOCR(imageUrl, ann, imgWidth, imgHeight)
    setOcrLoading(false)
    if (result) setOcrSuggestion(result)
  }, [ocrLoading, runOCR, imageUrl, ann, imgWidth, imgHeight])

  const acceptOCR = (e) => {
    e?.stopPropagation()
    if (ocrSuggestion) {
      updateAnn(fileName, page, ann.id, { text: ocrSuggestion.text })
      setOcrSuggestion(null)
    }
  }

  const dismissOCR = (e) => {
    e?.stopPropagation()
    setOcrSuggestion(null)
  }

  return (
    <>
      <div
        onClick={() => setSelected(isSelected ? null : ann.id)}
        style={{
          borderRadius: 7, cursor: 'pointer',
          background: isSelected ? 'var(--surface-raised)' : 'transparent',
          border: `1px solid ${isSelected ? color + '77' : 'transparent'}`,
          transition: 'all 0.12s', overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px' }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
          <ModeIcon size={11} color={color} />
          <span style={{
            fontSize: 11, fontFamily: 'JetBrains Mono,monospace',
            color: isSelected ? color : 'var(--text-secondary)',
            flex: 1, fontWeight: isSelected ? 700 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {cls?.name ?? 'unknown'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>#{index + 1}</span>
          <button
            onClick={e => { e.stopPropagation(); deleteAnn(fileName, page, ann.id) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', display: 'flex', padding: 2, borderRadius: 3, flexShrink: 0 }}
          >
            <Trash2 size={11} />
          </button>
        </div>

        {/* Bbox coords */}
        <div style={{ padding: '0 9px 6px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace' }}>
          [{Math.round(ann.x)}, {Math.round(ann.y)}, {Math.round(ann.w)}, {Math.round(ann.h)}]
        </div>

        {/* Expanded */}
        {isSelected && (
          <div onClick={e => e.stopPropagation()} style={{ padding: '0 9px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* CLASS PICKER — object mode */}
            {appMode === 'object' && (
              <ClassPicker ann={ann} fileName={fileName} page={page} />
            )}

            {/* Confidence badge (model-generated) */}
            {appMode === 'object' && ann.confidence != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Confidence</span>
                <span style={{
                  fontSize: 10, fontFamily: 'JetBrains Mono,monospace',
                  color: ann.confidence > 0.75 ? 'var(--success)' : ann.confidence > 0.5 ? 'var(--warning)' : 'var(--danger)',
                  fontWeight: 700,
                }}>
                  {Math.round(ann.confidence * 100)}%
                </span>
              </div>
            )}

            {/* TEXT */}
            {mode === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 10, color: 'var(--text-muted)' }}>Text content</label>

                  {canOCR && (
                    <button
                      onClick={triggerOCR}
                      disabled={ocrLoading}
                      title={serverOnline === false ? 'OCR server offline — run: python server.py' : 'Auto-detect text with OCR'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: serverOnline === false ? 'transparent' : '#2E86AB22',
                        border: `1px solid ${serverOnline === false ? 'var(--surface-border)' : '#2E86AB66'}`,
                        borderRadius: 4, padding: '2px 7px',
                        cursor: ocrLoading ? 'wait' : 'pointer',
                        fontSize: 10,
                        color: serverOnline === false ? 'var(--text-muted)' : '#2E86AB',
                        fontFamily: 'inherit', fontWeight: 600,
                        opacity: ocrLoading ? 0.7 : 1,
                      }}
                    >
                      {ocrLoading
                        ? <><Loader size={9} style={{ animation: 'spin 1s linear infinite' }} /> scanning…</>
                        : <><Sparkles size={9} /> OCR</>
                      }
                    </button>
                  )}
                </div>

                {ocrSuggestion && (
                  <OCRSuggestion
                    suggestion={ocrSuggestion}
                    onAccept={acceptOCR}
                    onDismiss={dismissOCR}
                  />
                )}

                <textarea
                  rows={3}
                  placeholder="Type or paste text, or use OCR button…"
                  value={ann.text ?? ''}
                  onChange={e => updateAnn(fileName, page, ann.id, { text: e.target.value })}
                  style={{
                    width: '100%', resize: 'vertical',
                    background: 'var(--surface)', border: '1px solid var(--surface-border)',
                    borderRadius: 5, padding: '5px 8px',
                    color: 'var(--text-primary)', fontSize: 11.5,
                    fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />
              </div>
            )}

            {/* IMAGE */}
            {mode === 'image' && (
              <div style={{
                background: color + '11', border: `1px dashed ${color}55`,
                borderRadius: 5, padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Image size={14} color={color} />
                <div>
                  <div style={{ fontSize: 11, color, fontWeight: 600 }}>Image / Figure region</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Exported as cropped region.</div>
                </div>
              </div>
            )}

            {/* TABLE */}
            {mode === 'table' && appMode === 'document' && (
              <div>
                {ann.tableData ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, background: color + '11', border: `1px solid ${color}44`, borderRadius: 5, padding: '6px 10px', fontSize: 11 }}>
                      <span style={{ color, fontWeight: 600 }}>Table defined</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{ann.tableData.rows}r × {ann.tableData.cols}c</span>
                    </div>
                    <button
                      onClick={() => setShowTable(true)}
                      style={{ background: color + '22', border: `1px solid ${color}55`, borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 11, color, fontFamily: 'inherit', fontWeight: 600 }}
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTable(true)}
                    style={{ width: '100%', padding: '8px', background: color + '11', border: `1px dashed ${color}55`, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color, fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}
                  >
                    <Table2 size={13} /> Build table structure
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Notes</label>
              <input
                placeholder="optional notes…"
                value={ann.notes ?? ''}
                onChange={e => updateAnn(fileName, page, ann.id, { notes: e.target.value })}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 5, padding: '4px 8px', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'inherit' }}
              />
            </div>

            {/* Reading order — document mode only */}
            {appMode === 'document' && (
              <div>
                <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Reading order</label>
                <input
                  type="number" min={0} placeholder="0, 1, 2…"
                  value={ann.reading_order ?? ''}
                  onChange={e => updateAnn(fileName, page, ann.id, { reading_order: e.target.value === '' ? null : parseInt(e.target.value) })}
                  style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 5, padding: '4px 8px', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'JetBrains Mono,monospace' }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showTable && (
        <TableBuilder
          ann={ann} classColor={color}
          imageUrl={imageUrl} imgWidth={imgWidth} imgHeight={imgHeight}
          onUpdate={patch => updateAnn(fileName, page, ann.id, patch)}
          onClose={() => setShowTable(false)}
        />
      )}
    </>
  )
}

export default function AnnotationList({ fileName, page, imageUrl, imgWidth, imgHeight }) {
  const annotations = useAnnotationStore(s => s.getAnnotations(fileName, page))
  if (!fileName)           return <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12 }}>No file loaded</div>
  if (!annotations.length) return <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', marginTop: 12 }}>No annotations yet.<br />Draw a box on the canvas.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {annotations.map((ann, i) => (
        <AnnItem key={ann.id} ann={ann} index={i}
          fileName={fileName} page={page}
          imageUrl={imageUrl} imgWidth={imgWidth} imgHeight={imgHeight}
        />
      ))}
    </div>
  )
}