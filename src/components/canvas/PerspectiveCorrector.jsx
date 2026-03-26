import { useState, useRef, useEffect } from 'react'
import { X, Check, RotateCcw, Move } from 'lucide-react'
import { perspectiveWarp } from '../../utils/perspectiveWarp'
import Button from '../ui/Button'

const LABELS = ['TL', 'TR', 'BR', 'BL']
const COLORS  = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12']

export default function PerspectiveCorrector({ imageUrl, imgWidth, imgHeight, onApply, onClose }) {
  const canvasRef  = useRef(null)
  const imgRef     = useRef(null)
  const layoutRef  = useRef({ scale: 1, ox: 0, oy: 0 })
  const dragging   = useRef(null)
  const panning    = useRef(null)
  const cornersRef = useRef([
    [0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92]
  ])
  const [applying, setApplying] = useState(false)

  const draw = () => {
    const canvas = canvasRef.current, img = imgRef.current
    if (!canvas || !img) return
    const { scale, ox, oy } = layoutRef.current
    const cw = canvas.width, ch = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(img, ox, oy, imgWidth * scale, imgHeight * scale)
    const pts = cornersRef.current.map(([nx, ny]) => [
      ox + nx * imgWidth  * scale,
      oy + ny * imgHeight * scale,
    ])
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, cw, ch)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath(); ctx.fill(); ctx.restore()
    ctx.save(); ctx.strokeStyle = '#3498db'; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath(); ctx.stroke(); ctx.restore()
    pts.forEach(([x, y], i) => {
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6
      ctx.fillStyle = COLORS[i]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(LABELS[i], x, y); ctx.restore()
    })
    ctx.save()
    ctx.fillStyle = 'rgba(10,20,30,0.75)'; ctx.fillRect(cw-210, ch-28, 205, 22)
    ctx.fillStyle = 'rgba(150,170,190,0.9)'; ctx.font = '11px monospace'
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillText(`${Math.round(scale*100)}%  ·  scroll=zoom  ·  right-drag=pan`, cw-8, ch-17)
    ctx.restore()
  }

  const cssToCv = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const rx = canvasRef.current.width  / rect.width
    const ry = canvasRef.current.height / rect.height
    return [(e.clientX - rect.left) * rx, (e.clientY - rect.top) * ry]
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width; canvas.height = rect.height
      const s = Math.min((rect.width-60)/imgWidth, (rect.height-60)/imgHeight)
      layoutRef.current = { scale: s, ox: (rect.width-imgWidth*s)/2, oy: (rect.height-imgHeight*s)/2 }
      draw()
    }
    const img = new Image()
    img.onload = () => { imgRef.current = img; fit() }
    img.src = imageUrl
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [imageUrl, imgWidth, imgHeight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e) => {
      e.preventDefault()
      const [cx, cy] = cssToCv(e)
      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 30
      if (e.deltaMode === 2) delta *= 300
      const factor = Math.exp(-delta / 400)
      const { scale: s, ox, oy } = layoutRef.current
      const ns = Math.max(0.1, Math.min(10, s * factor))
      layoutRef.current = { scale: ns, ox: cx-(cx-ox)*(ns/s), oy: cy-(cy-oy)*(ns/s) }
      draw()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  const hitTest = (cx, cy) => {
    const { scale, ox, oy } = layoutRef.current
    for (let i = 0; i < 4; i++) {
      const [nx, ny] = cornersRef.current[i]
      if (Math.hypot(cx-(ox+nx*imgWidth*scale), cy-(oy+ny*imgHeight*scale)) < 16) return i
    }
    return -1
  }

  const onMouseDown = (e) => {
    const [cx, cy] = cssToCv(e)
    if (e.button === 2) {
      e.preventDefault()
      panning.current = { startX: cx, startY: cy, ox: layoutRef.current.ox, oy: layoutRef.current.oy }
      return
    }
    if (e.button === 0) {
      const idx = hitTest(cx, cy)
      if (idx >= 0) { dragging.current = idx; e.preventDefault() }
    }
  }

  const onMouseMove = (e) => {
    const [cx, cy] = cssToCv(e)
    if (panning.current) {
      const p = panning.current
      layoutRef.current = { ...layoutRef.current, ox: p.ox+cx-p.startX, oy: p.oy+cy-p.startY }
      draw(); return
    }
    if (dragging.current !== null) {
      const { scale, ox, oy } = layoutRef.current
      const nx = Math.max(0, Math.min(1, (cx-ox)/(imgWidth*scale)))
      const ny = Math.max(0, Math.min(1, (cy-oy)/(imgHeight*scale)))
      cornersRef.current = cornersRef.current.map((c, i) =>
        i === dragging.current ? [nx, ny] : c)
      draw()
    }
  }

  const onMouseUp = () => { dragging.current = null; panning.current = null }

  const reset = () => {
    cornersRef.current = [[0.08,0.08],[0.92,0.08],[0.92,0.92],[0.08,0.92]]
    draw()
  }

  const apply = async () => {
    setApplying(true)
    try {
      const src = document.createElement('canvas')
      src.width = imgWidth; src.height = imgHeight
      src.getContext('2d').drawImage(imgRef.current, 0, 0, imgWidth, imgHeight)
      const result = perspectiveWarp(src, cornersRef.current.map(([nx,ny]) => [nx*imgWidth, ny*imgHeight]))
      onApply(result.toDataURL('image/png'), result.width, result.height)
    } finally { setApplying(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:3000, background:'rgba(5,12,20,0.92)', backdropFilter:'blur(8px)', display:'flex', flexDirection:'column' }}
      onContextMenu={e => e.preventDefault()}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:'1px solid var(--surface-border)', flexShrink:0, background:'var(--surface)' }}>
        <Move size={15} color="var(--accent)" />
        <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', flex:1 }}>Perspective Correction</span>
        <span style={{ fontSize:12, color:'var(--text-muted)' }}>Left-drag corners · Right-drag to pan · Scroll to zoom</span>
        <div style={{ display:'flex', gap:8, marginLeft:16 }}>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={reset}>Reset</Button>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose}>Cancel</Button>
          <Button size="sm" icon={Check} onClick={apply} disabled={applying}>
            {applying ? 'Applying…' : 'Apply Correction'}
          </Button>
        </div>
      </div>
      <div style={{ display:'flex', gap:20, justifyContent:'center', padding:'7px 0', background:'var(--surface)', borderBottom:'1px solid var(--surface-border)', flexShrink:0 }}>
        {['Top-left','Top-right','Bottom-right','Bottom-left'].map((label, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-muted)' }}>
            <div style={{ width:11, height:11, borderRadius:'50%', background:COLORS[i] }} />{label}
          </div>
        ))}
      </div>
      <canvas ref={canvasRef}
        style={{ flex:1, display:'block', cursor:'crosshair', width:'100%' }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      />
    </div>
  )
}