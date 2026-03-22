import { useState, useCallback } from 'react'
import { Trash2, Table2, Type, Image, Sparkles, Check, X, Loader } from 'lucide-react'
import { useAnnotationStore } from '../../store/useAnnotationStore'
import { useClassStore } from '../../store/useClassStore'
import TableBuilder from '../canvas/TableBuilder'
import { useOCR, shouldAutoOCR } from '../../hooks/useOCR'

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

  const cls        = getClass(ann.classId)
  const isSelected = ann.id === selectedId
  const mode       = getMode(cls?.name)
  const color      = cls?.color ?? '#888888'
  const ModeIcon   = mode === 'table' ? Table2 : mode === 'image' ? Image : Type
  const canOCR     = mode === 'text' && shouldAutoOCR(cls?.name) && imageUrl

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
            {mode === 'table' && (
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

            {/* Reading order */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Reading order</label>
              <input
                type="number" min={0} placeholder="0, 1, 2…"
                value={ann.reading_order ?? ''}
                onChange={e => updateAnn(fileName, page, ann.id, { reading_order: e.target.value === '' ? null : parseInt(e.target.value) })}
                style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 5, padding: '4px 8px', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'JetBrains Mono,monospace' }}
              />
            </div>
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