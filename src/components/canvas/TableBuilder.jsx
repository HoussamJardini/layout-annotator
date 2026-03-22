import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Minus, X, Check, Trash2, Table2, Merge, Split, Copy, ChevronDown, ChevronUp, Sparkles, Loader } from 'lucide-react'
import Button from '../ui/Button'

const makeCell = () => ({ text: '', header: false, merged: false, hidden: false, rowspan: 1, colspan: 1 })
const makeTable = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, makeCell))
const MIN = 1, MAX = 30

const selBounds = (sel) => {
  if (!sel) return null
  return {
    r1: Math.min(sel.start[0], sel.end[0]), r2: Math.max(sel.start[0], sel.end[0]),
    c1: Math.min(sel.start[1], sel.end[1]), c2: Math.max(sel.start[1], sel.end[1]),
  }
}
const inSel = (r, c, b) => b && r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2

function AutoInput({ value, onChange, suggestions, autoFocus }) {
  const [open, setOpen] = useState(false)
  const [filtered, setFiltered] = useState([])
  const ref = useRef()

  const onType = (e) => {
    const v = e.target.value
    onChange(v)
    if (v.trim().length >= 1) {
      const q = v.trim().toLowerCase()
      const f = suggestions.filter(s => s.toLowerCase().includes(q) && s !== v).slice(0, 6)
      setFiltered(f)
      setOpen(f.length > 0)
    } else {
      setOpen(false)
    }
  }

  const pick = (s) => { onChange(s); setOpen(false); ref.current?.focus() }

  useEffect(() => {
    const h = (e) => { if (!ref.current?.closest('[data-autoinput]')?.contains(e.target)) setOpen(false) }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [])

  return (
    <div data-autoinput="true" style={{ position: 'relative', width: '100%' }}>
      <textarea ref={ref} autoFocus={autoFocus} rows={4} value={value} onChange={onType}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Tab' && open && filtered[0]) { e.preventDefault(); pick(filtered[0]) }
        }}
        placeholder="Type cell content… (autocomplete from detected text)"
        style={{ width:'100%', resize:'vertical', background:'var(--surface)', border:'1px solid var(--surface-border)', borderRadius:6, padding:'7px 9px', color:'var(--text-primary)', fontSize:13, fontFamily:'inherit', lineHeight:1.6 }}
      />
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:100, background:'var(--surface-raised)', border:'1px solid var(--surface-border)', borderRadius:6, overflow:'hidden', boxShadow:'0 8px 24px rgba(0,0,0,0.4)', marginTop:2 }}>
          {filtered.map((s, i) => (
            <div key={i} onMouseDown={() => pick(s)}
              style={{ padding:'7px 12px', cursor:'pointer', fontSize:12, color:'var(--text-primary)', borderBottom:'1px solid var(--surface-border)', display:'flex', alignItems:'center', gap:8 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--navy-800)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize:10, color:'var(--accent)', fontFamily:'JetBrains Mono,monospace' }}>↵</span>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s}</span>
              {i === 0 && <span style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>Tab</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TableBuilder({ ann, onUpdate, onClose, classColor, imageUrl, imgWidth, imgHeight }) {
  const initial = ann.tableData ?? { rows: 3, cols: 3, cells: makeTable(3, 3) }
  const [rows, setRows]   = useState(initial.rows)
  const [cols, setCols]   = useState(initial.cols)
  const [cells, setCells] = useState(initial.cells)
  const [sel, setSel]     = useState(null)
  const [dragging, setDragging] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [detecting, setDetecting]     = useState(false)
  const [detectError, setDetectError] = useState(null)
  const [suggestions, setSuggestions] = useState([])

  const croppedDataUrl = useRef(null)
  const cropW = useRef(0); const cropH = useRef(0)
  const canvasRef = useRef(null)
  const color = classColor ?? '#2E86AB'

  useEffect(() => {
    if (!imageUrl || !ann.w) return
    const img = new Image()
    img.onload = () => {
      const sx = Math.max(0, Math.round(ann.x)), sy = Math.max(0, Math.round(ann.y))
      const sw = Math.min(Math.round(ann.w), (imgWidth||img.naturalWidth)-sx)
      const sh = Math.min(Math.round(ann.h), (imgHeight||img.naturalHeight)-sy)
      const scale = Math.min(900/sw, 800/sh, 3)
      const off = document.createElement('canvas')
      off.width = Math.round(sw*scale); off.height = Math.round(sh*scale)
      const ctx = off.getContext('2d')
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, off.width, off.height)
      croppedDataUrl.current = off.toDataURL('image/png')
      cropW.current = off.width; cropH.current = off.height
      if (canvasRef.current) paintCanvas(canvasRef.current)
    }
    img.src = imageUrl
  }, [])

  const paintCanvas = (el) => {
    if (!el || !croppedDataUrl.current) return
    el.width = cropW.current; el.height = cropH.current
    const ctx = el.getContext('2d')
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0)
    img.src = croppedDataUrl.current
  }
  const canvasCbRef = (el) => { canvasRef.current = el; if (el) paintCanvas(el) }

  const autoDetect = async () => {
    if (!croppedDataUrl.current) return
    setDetecting(true); setDetectError(null)
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
      const res = await fetch(`${API_BASE}/detect-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: croppedDataUrl.current }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await res.json()
      if (data.error) { setDetectError(data.error); return }
      if (!data.rows || !data.cols) { setDetectError('No table structure detected'); return }
      const newCells = makeTable(data.rows, data.cols)
      for (const cd of data.cells) {
        if (cd.row < data.rows && cd.col < data.cols) {
          newCells[cd.row][cd.col] = { ...makeCell(), text: cd.text, rowspan: cd.rowspan??1, colspan: cd.colspan??1 }
        }
      }
      setRows(data.rows); setCols(data.cols); setCells(newCells)
      setSuggestions(data.all_texts ?? []); setSel(null)
    } catch (e) {
      setDetectError('Server unreachable. Is python server.py running?')
    } finally {
      setDetecting(false)
    }
  }

  const updCell = (r, c, patch) =>
    setCells(prev => prev.map((row, ri) =>
      ri === r ? row.map((cell, ci) => ci === c ? { ...cell, ...patch } : cell) : row
    ))

  const resize = (newR, newC) => {
    setRows(newR); setCols(newC); setSel(null)
    setCells(prev => Array.from({ length: newR }, (_, r) =>
      Array.from({ length: newC }, (_, c) => prev[r]?.[c] ?? makeCell())
    ))
  }
  const addRow = () => resize(Math.min(rows+1, MAX), cols)
  const removeRow = () => { if (rows > MIN) resize(rows-1, cols) }
  const addCol = () => resize(rows, Math.min(cols+1, MAX))
  const removeCol = () => { if (cols > MIN) resize(rows, cols-1) }

  const bounds = selBounds(sel)
  const singleSel = bounds && bounds.r1===bounds.r2 && bounds.c1===bounds.c2 ? [bounds.r1,bounds.c1] : null

  const onCellDown  = (r, c, e) => { e.preventDefault(); setSel({ start:[r,c], end:[r,c] }); setDragging(true) }
  const onCellEnter = (r, c)    => { if (dragging) setSel(s => s ? { ...s, end:[r,c] } : s) }

  useEffect(() => {
    const up = () => setDragging(false)
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const canMerge = bounds && (bounds.r2 > bounds.r1 || bounds.c2 > bounds.c1)
  const mergeCells = () => {
    if (!bounds) return
    const { r1,r2,c1,c2 } = bounds
    const texts = []
    for (let r=r1;r<=r2;r++) for (let c=c1;c<=c2;c++) if (cells[r][c].text) texts.push(cells[r][c].text)
    setCells(prev => prev.map((row,r) => row.map((cell,c) => {
      if (r===r1&&c===c1) return { ...cell, merged:true, hidden:false, rowspan:r2-r1+1, colspan:c2-c1+1, text:texts.join(' ') }
      if (r>=r1&&r<=r2&&c>=c1&&c<=c2) return { ...cell, hidden:true, text:'' }
      return cell
    })))
    setSel({ start:[r1,c1], end:[r1,c1] })
  }

  const canSplit = singleSel && cells[singleSel[0]]?.[singleSel[1]]?.merged
  const splitCell = () => {
    if (!singleSel) return
    const [r,c] = singleSel
    const { rowspan=1, colspan=1, text } = cells[r][c]
    setCells(prev => prev.map((row,ri) => row.map((cell,ci) => {
      if (ri===r&&ci===c) return { ...makeCell(), text }
      if (ri>=r&&ri<r+rowspan&&ci>=c&&ci<c+colspan) return makeCell()
      return cell
    })))
  }

  const toggleHeader = () => {
    if (!bounds) return
    const { r1,r2,c1,c2 } = bounds
    const vals = []
    for (let r=r1;r<=r2;r++) for (let c=c1;c<=c2;c++) if (!cells[r][c].hidden) vals.push(cells[r][c].header)
    const setTo = !vals.every(Boolean)
    setCells(prev => prev.map((row,r) => row.map((cell,c) =>
      r>=r1&&r<=r2&&c>=c1&&c<=c2&&!cell.hidden ? { ...cell, header:setTo } : cell
    )))
  }

  const clearSel = () => {
    if (!bounds) return
    const { r1,r2,c1,c2 } = bounds
    setCells(prev => prev.map((row,r) => row.map((cell,c) =>
      r>=r1&&r<=r2&&c>=c1&&c<=c2 ? { ...cell, text:'' } : cell
    )))
  }

  const copyText = () => { if (!singleSel) return; navigator.clipboard.writeText(cells[singleSel[0]][singleSel[1]].text).catch(()=>{}) }
  const save = () => { onUpdate({ tableData: { rows, cols, cells } }); onClose() }

  const ib  = { background:'var(--surface-raised)', border:'1px solid var(--surface-border)', borderRadius:5, width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'var(--text-secondary)', padding:0, flexShrink:0 }
  const nd  = { fontFamily:'JetBrains Mono,monospace', fontSize:12, color:'var(--text-primary)', width:26, textAlign:'center' }
  const sep = <div style={{ width:1, height:20, background:'var(--surface-border)', margin:'0 4px', flexShrink:0 }} />

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(7,17,26,0.88)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="fade-in" style={{ width:'92vw', maxWidth:1100, height:'90vh', background:'var(--surface-raised)', border:`1px solid ${color}55`, borderRadius:12, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:`0 0 60px ${color}22` }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderBottom:'1px solid var(--surface-border)', background:'var(--surface)', flexShrink:0 }}>
          <Table2 size={15} color={color} />
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', flex:1 }}>Table Builder</span>
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', marginRight:8 }}>{rows} × {cols}</span>
          {bounds && <span style={{ fontSize:11, color, fontFamily:'JetBrains Mono,monospace' }}>sel [{bounds.r1},{bounds.c1}]→[{bounds.r2},{bounds.c2}]</span>}
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={16}/></button>
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex', gap:6, padding:'8px 14px', borderBottom:'1px solid var(--surface-border)', background:'var(--surface)', flexShrink:0, alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={autoDetect} disabled={detecting||!imageUrl} style={{ display:'flex', alignItems:'center', gap:6, padding:'0 12px', height:26, background:detecting?'var(--surface)':color+'22', border:`1px solid ${color}88`, borderRadius:5, cursor:detecting||!imageUrl?'not-allowed':'pointer', fontSize:12, color, fontFamily:'inherit', fontWeight:700, flexShrink:0, opacity:!imageUrl?0.4:1 }}>
            {detecting ? <><Loader size={11} style={{ animation:'spin 1s linear infinite' }}/> Detecting…</> : <><Sparkles size={11}/> Auto-detect cells</>}
          </button>
          {detectError && <span style={{ fontSize:11, color:'#e74c3c' }}>{detectError}</span>}
          {suggestions.length > 0 && !detectError && <span style={{ fontSize:11, color:'#27ae60', fontFamily:'JetBrains Mono,monospace' }}>✓ {suggestions.length} texts ready</span>}
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>Rows</span>
          <button onClick={removeRow} style={ib}><Minus size={11}/></button>
          <span style={nd}>{rows}</span>
          <button onClick={addRow} style={ib}><Plus size={11}/></button>
          {sep}
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>Cols</span>
          <button onClick={removeCol} style={ib}><Minus size={11}/></button>
          <span style={nd}>{cols}</span>
          <button onClick={addCol} style={ib}><Plus size={11}/></button>
          {sep}
          <button onClick={mergeCells} disabled={!canMerge} style={{ ...ib, width:'auto', padding:'0 10px', gap:5, fontSize:12, opacity:canMerge?1:0.3, color:canMerge?color:'var(--text-muted)', border:`1px solid ${canMerge?color+'66':'var(--surface-border)'}` }}>
            <Merge size={12}/> Merge
          </button>
          <button onClick={splitCell} disabled={!canSplit} style={{ ...ib, width:'auto', padding:'0 10px', gap:5, fontSize:12, opacity:canSplit?1:0.3, color:canSplit?'#f39c12':'var(--text-muted)', border:`1px solid ${canSplit?'#f39c1266':'var(--surface-border)'}` }}>
            <Split size={12}/> Split
          </button>
          {sep}
          <button onClick={toggleHeader} disabled={!bounds} style={{ ...ib, width:'auto', padding:'0 10px', fontSize:12, opacity:bounds?1:0.3 }}>Header</button>
          <button onClick={clearSel} disabled={!bounds} style={{ ...ib, color:bounds?'#e74c3c':'var(--text-muted)', opacity:bounds?1:0.3 }}><Trash2 size={12}/></button>
          {singleSel && <button onClick={copyText} style={ib}><Copy size={12}/></button>}
          {sep}
          <button onClick={() => setShowPreview(p=>!p)} style={{ ...ib, width:'auto', padding:'0 10px', gap:5, fontSize:12, color:showPreview?color:'var(--text-secondary)', border:`1px solid ${showPreview?color+'66':'var(--surface-border)'}` }}>
            {showPreview?<ChevronDown size={12}/>:<ChevronUp size={12}/>} Preview
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflow:'hidden', display:'flex' }}>
          <div style={{ flex:1, overflow:'auto', padding:16 }}>
            <table style={{ borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width:22 }}/>
                  {Array.from({ length:cols }, (_,c) => (
                    <th key={c} style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', fontWeight:400, textAlign:'center', paddingBottom:4, minWidth:80 }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cells.map((row, r) => (
                  <tr key={r}>
                    <td style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', textAlign:'right', paddingRight:6, userSelect:'none', verticalAlign:'middle' }}>{r}</td>
                    {row.map((cell, c) => {
                      if (cell.hidden) return null
                      const isSel    = inSel(r, c, bounds)
                      const isSingle = singleSel?.[0]===r && singleSel?.[1]===c
                      return (
                        <td key={c} rowSpan={cell.rowspan??1} colSpan={cell.colspan??1}
                          onMouseDown={e => onCellDown(r,c,e)}
                          onMouseEnter={() => onCellEnter(r,c)}
                          style={{ border:`1px solid ${isSel?color:'var(--surface-border)'}`, background:cell.header?color+'28':isSel?color+'18':'var(--surface)', padding:'6px 8px', cursor:'pointer', position:'relative', verticalAlign:'top', userSelect:'none', boxShadow:isSingle?`inset 0 0 0 2px ${color}`:isSel?`inset 0 0 0 1px ${color}55`:'none', transition:'background 0.08s' }}
                        >
                          {cell.header && <span style={{ position:'absolute', top:1, right:3, fontSize:8, color, fontFamily:'JetBrains Mono,monospace', fontWeight:700 }}>H</span>}
                          {cell.merged && <span style={{ position:'absolute', top:1, left:3, fontSize:8, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>{cell.rowspan}×{cell.colspan}</span>}
                          <span style={{ fontSize:11, display:'block', paddingTop:cell.merged?10:0, color:cell.text?'var(--text-primary)':'var(--text-muted)', fontStyle:cell.text?'normal':'italic', fontWeight:cell.header?600:400 }}>
                            {cell.text||'empty'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right panel */}
          <div style={{ width:330, borderLeft:'1px solid var(--surface-border)', display:'flex', flexDirection:'column', flexShrink:0, overflow:'hidden' }}>
            {showPreview && imageUrl && (
              <div style={{ borderBottom:'1px solid var(--surface-border)', display:'flex', flexDirection:'column', maxHeight:'50%', minHeight:80, flexShrink:0 }}>
                <div style={{ fontSize:10, color:'var(--text-muted)', padding:'6px 12px 4px', fontFamily:'JetBrains Mono,monospace', display:'flex', justifyContent:'space-between', flexShrink:0 }}>
                  <span>TABLE CROP</span><span>{Math.round(ann.w)} × {Math.round(ann.h)}px</span>
                </div>
                <div style={{ overflow:'auto', padding:'0 10px 10px', flex:1 }}>
                  <canvas ref={canvasCbRef} style={{ border:`1px solid ${color}44`, borderRadius:4, display:'block', maxWidth:'none' }}/>
                </div>
              </div>
            )}

            <div style={{ flex:1, overflow:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              {singleSel ? (
                <>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>Cell [{singleSel[0]},{singleSel[1]}]</span>
                    {cells[singleSel[0]][singleSel[1]].merged && <span style={{ color, fontSize:10 }}>merged {cells[singleSel[0]][singleSel[1]].rowspan}×{cells[singleSel[0]][singleSel[1]].colspan}</span>}
                  </div>
                  <AutoInput autoFocus
                    value={cells[singleSel[0]][singleSel[1]].text}
                    onChange={v => updCell(singleSel[0], singleSel[1], { text: v })}
                    suggestions={suggestions}
                  />
                  <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:12, color:'var(--text-secondary)' }}>
                    <input type="checkbox"
                      checked={cells[singleSel[0]][singleSel[1]].header}
                      onChange={() => updCell(singleSel[0], singleSel[1], { header: !cells[singleSel[0]][singleSel[1]].header })}
                    />
                    Mark as header cell
                  </label>
                  <button onClick={copyText} style={{ display:'flex', alignItems:'center', gap:6, background:'var(--surface)', border:'1px solid var(--surface-border)', borderRadius:5, padding:'6px 10px', cursor:'pointer', fontSize:12, color:'var(--text-secondary)', fontFamily:'inherit' }}>
                    <Copy size={12}/> Copy text
                  </button>
                  {suggestions.length > 0 && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', padding:'8px 10px', background:'var(--surface)', borderRadius:5, border:'1px solid var(--surface-border)' }}>
                      <b style={{ color:'var(--text-secondary)' }}>💡 Tip</b><br/>
                      Type to search detected texts. Press <kbd style={{ background:'var(--surface-raised)', border:'1px solid var(--surface-border)', borderRadius:3, padding:'0 4px', fontFamily:'JetBrains Mono,monospace', fontSize:10 }}>Tab</kbd> to accept.
                    </div>
                  )}
                </>
              ) : bounds ? (
                <div style={{ color:'var(--text-muted)', fontSize:12 }}>
                  <div style={{ marginBottom:8, color:'var(--text-secondary)', fontWeight:600 }}>{bounds.r2-bounds.r1+1} × {bounds.c2-bounds.c1+1} cells selected</div>
                  <div style={{ fontSize:11, lineHeight:1.9 }}>
                    • <b style={{ color }}>Merge</b> — combine into one cell<br/>
                    • <b style={{ color:'var(--text-secondary)' }}>Header</b> — mark all as headers<br/>
                    • <b style={{ color:'#e74c3c' }}>Clear</b> — erase text in selection
                  </div>
                </div>
              ) : (
                <div style={{ color:'var(--text-muted)', fontSize:12, textAlign:'center', marginTop:20, lineHeight:1.8 }}>
                  {imageUrl
                    ? <>Click <b style={{ color }}>Auto-detect cells</b> to detect<br/>structure automatically,<br/>then click any cell to edit.</>
                    : <>Click a cell to edit<br/><span style={{ fontSize:11 }}>Drag to select multiple</span></>
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'10px 16px', borderTop:'1px solid var(--surface-border)', background:'var(--surface)', flexShrink:0 }}>
          <Button variant="ghost" onClick={onClose} icon={X}>Cancel</Button>
          <Button onClick={save} icon={Check}>Save Table</Button>
        </div>
      </div>
    </div>
  )
}