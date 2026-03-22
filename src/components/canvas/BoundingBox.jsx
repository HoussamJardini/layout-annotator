import { useRef, useCallback } from 'react'
import { hexToRgba } from '../../utils/colorUtils'
import { useClassStore } from '../../store/useClassStore'
import { clampBox } from '../../utils/bboxMath'

const HANDLE_R = 5
const HANDLES = [
  { id: 'nw', cx: 0,   cy: 0   }, { id: 'ne', cx: 1,   cy: 0   },
  { id: 'sw', cx: 0,   cy: 1   }, { id: 'se', cx: 1,   cy: 1   },
  { id: 'n',  cx: 0.5, cy: 0   }, { id: 's',  cx: 0.5, cy: 1   },
  { id: 'w',  cx: 0,   cy: 0.5 }, { id: 'e',  cx: 1,   cy: 0.5 },
]
const CURSORS = { nw:'nw-resize', ne:'ne-resize', sw:'sw-resize', se:'se-resize', n:'n-resize', s:'s-resize', w:'w-resize', e:'e-resize' }

export default function BoundingBox({ ann, scale, selected, onSelect, onUpdate, containerRef, transformRef, imgWidth, imgHeight }) {
  const getClass = useClassStore(s => s.getClassById)
  const cls      = getClass(ann.classId)
  const color    = cls?.color ?? '#888888'

  const x = ann.x * scale, y = ann.y * scale
  const w = ann.w * scale, h = ann.h * scale

  const startDrag = useCallback((e, handle) => {
    e.stopPropagation()
    e.preventDefault()
    const orig = { ...ann }

    const onMove = (ev) => {
      const s  = transformRef.current.scale
      const dx = (ev.clientX - e.clientX) / s
      const dy = (ev.clientY - e.clientY) / s
      let { x, y, w, h } = orig
      let nx = x, ny = y, nw = w, nh = h

      if (handle === 'move') { nx = x+dx; ny = y+dy }
      if (handle === 'se')   { nw = w+dx; nh = h+dy }
      if (handle === 'sw')   { nx = x+dx; nw = w-dx; nh = h+dy }
      if (handle === 'ne')   { nw = w+dx; ny = y+dy; nh = h-dy }
      if (handle === 'nw')   { nx = x+dx; ny = y+dy; nw = w-dx; nh = h-dy }
      if (handle === 'n')    { ny = y+dy; nh = h-dy }
      if (handle === 's')    { nh = h+dy }
      if (handle === 'e')    { nw = w+dx }
      if (handle === 'w')    { nx = x+dx; nw = w-dx }

      if (nw < 0) { nx += nw; nw = -nw }
      if (nh < 0) { ny += nh; nh = -nh }
      onUpdate(clampBox({ x: nx, y: ny, w: Math.max(4, nw), h: Math.max(4, nh) }, imgWidth, imgHeight))
    }

    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [ann, onUpdate, transformRef, imgWidth, imgHeight])

  const labelW = Math.max((cls?.name?.length ?? 7) * 6.5 + 10, 40)

  return (
    <g data-bbox="true">
      <rect x={x} y={y} width={w} height={h}
        fill={hexToRgba(color, selected ? 0.15 : 0.06)}
        stroke={color} strokeWidth={selected ? 2 : 1} rx={1.5}
        style={{ cursor: selected ? 'move' : 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        onMouseDown={(e) => { if (selected) { e.stopPropagation(); startDrag(e, 'move') } }}
      />
      <rect x={x} y={Math.max(0, y - 17)} width={labelW} height={17} fill={color} rx={3} />
      <text x={x + 5} y={Math.max(0, y - 17) + 11} fontSize={9.5} fontFamily="JetBrains Mono, monospace" fill="#fff" fontWeight={700} style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {cls?.name ?? 'unknown'}
      </text>
      {selected && HANDLES.map(({ id, cx, cy }) => (
        <circle key={id} cx={x + cx * w} cy={y + cy * h} r={HANDLE_R}
          fill="#ffffff" stroke={color} strokeWidth={1.5}
          style={{ cursor: CURSORS[id] }}
          onMouseDown={(e) => startDrag(e, id)}
        />
      ))}
    </g>
  )
}