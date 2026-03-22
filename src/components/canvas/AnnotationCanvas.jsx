import { useRef, useState, useEffect, useCallback } from 'react'
import { useAnnotationStore } from '../../store/useAnnotationStore'
import { useClassStore } from '../../store/useClassStore'
import { rectFromPoints, clampBox, generateId } from '../../utils/bboxMath'
import { hexToRgba } from '../../utils/colorUtils'
import BoundingBox from './BoundingBox'

export default function AnnotationCanvas({ imageUrl, fileName, page, imgWidth, imgHeight }) {
  const containerRef = useRef(null)
  const transformRef = useRef({ scale: 1, ox: 0, oy: 0 })
  const [transform, setTransform] = useState({ scale: 1, ox: 0, oy: 0 })
  const [drawing, setDrawing] = useState(null)
  const drawingRef = useRef(null)
  const [cursor, setCursor] = useState('crosshair')

  const annotations = useAnnotationStore(s => s.getAnnotations(fileName, page))
  const selectedId  = useAnnotationStore(s => s.selectedId)
  const addAnn      = useAnnotationStore(s => s.addAnnotation)
  const updateAnn   = useAnnotationStore(s => s.updateAnnotation)
  const setSelected = useAnnotationStore(s => s.setSelected)
  const activeClass = useClassStore(s => s.getActiveClass())

  useEffect(() => { drawingRef.current = drawing }, [drawing])

  useEffect(() => {
    if (!containerRef.current || !imgWidth) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const s  = Math.min((width - 40) / imgWidth, (height - 40) / imgHeight, 1.5)
    const ox = (width  - imgWidth  * s) / 2
    const oy = (height - imgHeight * s) / 2
    const t  = { scale: s, ox, oy }
    transformRef.current = t
    setTransform(t)
  }, [imageUrl, imgWidth, imgHeight])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const prevent = (e) => e.preventDefault()
    el.addEventListener('contextmenu', prevent)
    return () => el.removeEventListener('contextmenu', prevent)
  }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const rect   = containerRef.current.getBoundingClientRect()
    const mx     = e.clientX - rect.left
    const my     = e.clientY - rect.top
    let delta    = e.deltaY
    if (e.deltaMode === 1) delta *= 30
    if (e.deltaMode === 2) delta *= 300
    const factor = Math.exp(-delta / 400)
    const { scale: s, ox, oy } = transformRef.current
    const ns = Math.max(0.05, Math.min(15, s * factor))
    const t  = { scale: ns, ox: mx - (mx - ox) * (ns / s), oy: my - (my - oy) * (ns / s) }
    transformRef.current = t
    setTransform({ ...t })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  const clientToImg = useCallback((cx, cy) => {
    const rect = containerRef.current.getBoundingClientRect()
    const { scale, ox, oy } = transformRef.current
    return {
      x: (cx - rect.left - ox) / scale,
      y: (cy - rect.top  - oy) / scale,
    }
  }, [])

  const onMouseDown = useCallback((e) => {
    // RIGHT CLICK = PAN
    if (e.button === 2) {
      e.preventDefault()
      const startX = e.clientX
      const startY = e.clientY
      const { ox: startOx, oy: startOy } = transformRef.current
      setCursor('grabbing')
      const onMove = (ev) => {
        const t = { ...transformRef.current, ox: startOx + ev.clientX - startX, oy: startOy + ev.clientY - startY }
        transformRef.current = t
        setTransform({ ...t })
      }
      const onUp = () => {
        setCursor('crosshair')
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup',   onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup',   onUp)
      return
    }

    // LEFT CLICK = DRAW
    if (e.button !== 0) return
    if (e.target.closest('[data-bbox]')) return
    setSelected(null)
    const pt = clientToImg(e.clientX, e.clientY)
    const d  = { x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y }
    setDrawing(d)
    drawingRef.current = d
    const onMove = (ev) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const { scale, ox, oy } = transformRef.current
      const next = { ...drawingRef.current, x2: (ev.clientX - rect.left - ox) / scale, y2: (ev.clientY - rect.top - oy) / scale }
      drawingRef.current = next
      setDrawing({ ...next })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      const cur = drawingRef.current
      setDrawing(null)
      drawingRef.current = null
      if (!cur) return
      const raw = rectFromPoints(cur.x1, cur.y1, cur.x2, cur.y2)
      if (raw.w >= 5 && raw.h >= 5 && imgWidth && imgHeight) {
        addAnn(fileName, page, {
          id: generateId(), classId: activeClass?.id,
          ...clampBox(raw, imgWidth, imgHeight),
          text: '', notes: '', reading_order: null, confidence: null, tableData: null,
        })
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [clientToImg, setSelected, imgWidth, imgHeight, fileName, page, activeClass, addAnn])

  const { scale, ox, oy } = transform
  const drawRect = drawing ? rectFromPoints(drawing.x1, drawing.y1, drawing.x2, drawing.y2) : null

  return (
    <div ref={containerRef}
      style={{ flex:1, position:'relative', overflow:'hidden', background:'#07111a', cursor }}
      onMouseDown={onMouseDown}
    >
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, #1a2535 1px, transparent 1px)', backgroundSize:'28px 28px', opacity:0.5, pointerEvents:'none' }} />

      {imageUrl && (
        <div style={{ position:'absolute', left:ox, top:oy, width:imgWidth*scale, height:imgHeight*scale, willChange:'transform', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}>
          <img src={imageUrl} alt="" draggable={false} style={{ width:'100%', height:'100%', display:'block', userSelect:'none', pointerEvents:'none' }} />
          <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }}>
            {annotations.map(ann => (
              <BoundingBox key={ann.id} ann={ann} scale={scale}
                selected={ann.id === selectedId}
                onSelect={() => setSelected(ann.id === selectedId ? null : ann.id)}
                onUpdate={(patch) => updateAnn(fileName, page, ann.id, patch)}
                containerRef={containerRef} transformRef={transformRef}
                imgWidth={imgWidth} imgHeight={imgHeight}
              />
            ))}
            {drawRect && activeClass && (
              <g>
                <rect x={drawRect.x*scale} y={drawRect.y*scale} width={drawRect.w*scale} height={drawRect.h*scale}
                  fill={hexToRgba(activeClass.color, 0.1)} stroke={activeClass.color} strokeWidth={1.5} strokeDasharray="6 3" />
                <text x={drawRect.x*scale+4} y={drawRect.y*scale-4} fontSize={10} fill={activeClass.color} fontFamily="JetBrains Mono,monospace" fontWeight={600}>
                  {Math.round(drawRect.w)} × {Math.round(drawRect.h)}
                </text>
              </g>
            )}
          </svg>
        </div>
      )}

      <div style={{ position:'absolute', bottom:10, right:12, display:'flex', gap:6, alignItems:'center', fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', background:'rgba(10,20,30,0.85)', padding:'3px 10px', borderRadius:5, border:'1px solid var(--surface-border)', backdropFilter:'blur(4px)' }}>
        <span>{Math.round(scale * 100)}%</span>
        <span style={{ color:'var(--surface-border)' }}>|</span>
        <span>left=draw · right=pan · scroll=zoom</span>
      </div>
    </div>
  )
}