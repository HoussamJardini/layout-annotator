// src/pages/Annotator.jsx
import { useState, useEffect, useRef } from 'react'
import { FolderOpen, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSessionStore } from '../store/useSessionStore'
import { useAnnotationStore } from '../store/useAnnotationStore'
import { useClassStore } from '../store/useClassStore'
import { useModeStore } from '../store/useModeStore'
import { useModelStore } from '../store/useModelStore'
import { useFileSystem, resolveFile } from '../hooks/useFileSystem'
import { usePdfRenderer } from '../hooks/usePdfRenderer'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import AnnotationCanvas from '../components/canvas/AnnotationCanvas'
import CanvasToolbar from '../components/canvas/CanvasToolbar'
import FileTree from '../components/sidebar/FileTree'
import LabelPicker from '../components/sidebar/LabelPicker'
import AnnotationList from '../components/sidebar/AnnotationList'
import Button from '../components/ui/Button'
import PerspectiveCorrector from '../components/canvas/PerspectiveCorrector'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// Consistent color from label name using the same palette as colorUtils
const PALETTE = ['#3498db','#9b59b6','#e67e22','#1abc9c','#e74c3c','#f39c12','#2980b9','#27ae60','#c0392b','#16a085','#8e44ad','#d35400','#2ecc71','#34495e','#f1c40f']
function nameToColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function ResizeHandle({ onDrag, vertical = false }) {
  const dragging = useRef(false)
  const last     = useRef(0)
  const onMouseDown = (e) => {
    e.preventDefault()
    dragging.current = true
    last.current = vertical ? e.clientY : e.clientX
    const onMove = (ev) => {
      if (!dragging.current) return
      const cur = vertical ? ev.clientY : ev.clientX
      onDrag(cur - last.current)
      last.current = cur
    }
    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor     = vertical ? 'row-resize' : 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  return (
    <div onMouseDown={onMouseDown} style={{
      width: vertical ? '100%' : 4, height: vertical ? 4 : '100%',
      flexShrink: 0, background: 'var(--surface-border)',
      cursor: vertical ? 'row-resize' : 'col-resize',
      transition: 'background 0.15s', zIndex: 10,
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent)'}
    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-border)'}
    />
  )
}

export default function Annotator() {
  const { openFolder, supported } = useFileSystem()
  const { renderPage, rendering } = usePdfRenderer()
  const currentFile  = useSessionStore(s => s.getCurrentFile())
  const flatQueue    = useSessionStore(s => s.flatQueue)
  const setImageMeta = useAnnotationStore(s => s.setImageMeta)

  const [imgData,      setImgData]      = useState(null)
  const [loadError,    setLoadError]    = useState(null)
  const [pdfPage,      setPdfPage]      = useState(0)
  const [pdfNumPages,  setPdfNumPages]  = useState(1)
  const [deskewing,    setDeskewing]    = useState(false)
  const [correctedImg, setCorrectedImg] = useState(null)
  const [leftW,             setLeftW]             = useState(220)
  const [rightW,            setRightW]            = useState(240)
  const [labelH,            setLabelH]            = useState(200)
  const [autoAnnotating,    setAutoAnnotating]    = useState(false)
  const [autoAnnotateMsg,   setAutoAnnotateMsg]   = useState('')

  useEffect(() => {
    setPdfPage(0)
    setPdfNumPages(1)
    setCorrectedImg(null)
    setDeskewing(false)
  }, [currentFile?.path])

  const effectivePage = currentFile?.sourceType === 'pdf' ? pdfPage : (currentFile?.page ?? 0)
  const isPdf = currentFile?.sourceType === 'pdf'

  useKeyboardShortcuts(currentFile)

  useEffect(() => {
    if (!currentFile) return
    setImgData(null)
    setLoadError(null)

    const load = async () => {
      // Step 1: resolve a File via root-walk (no stored handles)
      let file
      try {
        file = await resolveFile(currentFile)
      } catch (e) {
        console.warn('File access error:', e.name, e.message)
        setLoadError('__REOPEN__')
        return
      }

      // Step 2: render
      try {
        if (isPdf) {
          const res = await renderPage(file, pdfPage + 1, 2)
          setImgData({ url: res.dataUrl, width: res.width, height: res.height })
          setPdfNumPages(res.numPages)
          setImageMeta(currentFile.fileName, pdfPage, {
            width: res.width, height: res.height,
            sourceType: 'pdf', folder: currentFile.folder,
          })
        } else {
          const url = URL.createObjectURL(file)
          const img = new Image()
          img.onload = () => {
            setImgData({ url, width: img.naturalWidth, height: img.naturalHeight })
            setImageMeta(currentFile.fileName, 0, {
              width: img.naturalWidth, height: img.naturalHeight,
              sourceType: 'image', folder: currentFile.folder,
            })
          }
          img.onerror = () => setLoadError('Failed to load image')
          img.src = url
        }
      } catch (e) {
        setLoadError(e.message || 'Failed to render file')
      }
    }

    load()
  }, [currentFile?.path, pdfPage])

  const activeUrl = correctedImg?.url    ?? imgData?.url
  const activeW   = correctedImg?.width  ?? imgData?.width
  const activeH   = correctedImg?.height ?? imgData?.height

  // ── Auto-Annotate (object mode) ─────────────────────────────────────────────
  const handleAutoAnnotate = async () => {
    if (!activeUrl || !currentFile) return
    const { modelPath, translatorCode, device, confidence } = useModelStore.getState()
    if (!modelPath) return

    setAutoAnnotating(true)
    setAutoAnnotateMsg('')
    try {
      // Convert blob/data URL to base64
      const blob   = await fetch(activeUrl).then(r => r.blob())
      const base64 = await new Promise(res => {
        const reader = new FileReader()
        reader.onload = e => res(e.target.result)
        reader.readAsDataURL(blob)
      })

      const resp = await fetch(`${API_BASE}/run-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, model_path: modelPath, translator_code: translatorCode, device, confidence }),
        signal: AbortSignal.timeout(120000),
      })
      const data = await resp.json()

      if (data.error) {
        setAutoAnnotateMsg(`Error: ${data.error.slice(0, 50)}`)
        setTimeout(() => setAutoAnnotateMsg(''), 5000)
        return
      }
      if (!data.boxes?.length) {
        setAutoAnnotateMsg('No detections')
        setTimeout(() => setAutoAnnotateMsg(''), 3000)
        return
      }

      // Resolve label → classId (create missing classes in one pass)
      const { classes, addClass } = useClassStore.getState()
      const { addAnnotation }     = useAnnotationStore.getState()
      const labelMap = {}

      for (const box of data.boxes) {
        if (labelMap[box.label]) continue
        const existing = classes.find(c => c.name.toLowerCase() === box.label.toLowerCase())
        if (existing) {
          labelMap[box.label] = existing.id
        } else {
          const id = `cls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          addClass({ id, name: box.label, color: nameToColor(box.label), shortcut: '', description: '' })
          labelMap[box.label] = id
        }
      }

      for (const box of data.boxes) {
        addAnnotation(currentFile.fileName, effectivePage, {
          id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          classId: labelMap[box.label],
          x: box.x, y: box.y, w: box.w, h: box.h,
          confidence: box.confidence,
        })
      }

      setAutoAnnotateMsg(`✓ ${data.boxes.length} box${data.boxes.length !== 1 ? 'es' : ''} added`)
      setTimeout(() => setAutoAnnotateMsg(''), 3000)
    } catch (e) {
      setAutoAnnotateMsg(`Failed: ${e.message}`)
      setTimeout(() => setAutoAnnotateMsg(''), 5000)
    }
    setAutoAnnotating(false)
  }

  return (
    <div style={{ height:'100%', display:'flex', overflow:'hidden' }}>

      {/* Left sidebar */}
      <div style={{ width:leftW, minWidth:140, maxWidth:480, display:'flex', flexDirection:'column', background:'var(--surface)', overflow:'hidden', flexShrink:0 }}>
        <div style={{ padding:10, borderBottom:'1px solid var(--surface-border)', flexShrink:0 }}>
          <Button size="sm" icon={FolderOpen} onClick={openFolder} style={{ width:'100%', justifyContent:'center' }}>
            {flatQueue.length ? 'Change Folder' : 'Open Folder'}
          </Button>
          {!supported && <p style={{ fontSize:10, color:'var(--warning)', marginTop:6, textAlign:'center' }}>Use Chrome/Edge</p>}
        </div>
        <FileTree />
      </div>

      <ResizeHandle onDrag={dx => setLeftW(w => Math.max(140, Math.min(480, w + dx)))} />

      {/* Center */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:200 }}>
        <CanvasToolbar
          fileName={currentFile?.fileName}
          page={effectivePage}
          onDeskew={imgData ? () => setDeskewing(true) : undefined}
          onAutoAnnotate={handleAutoAnnotate}
          autoAnnotating={autoAnnotating}
          autoAnnotateMsg={autoAnnotateMsg}
        />

        {/* PDF page nav */}
        {isPdf && pdfNumPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'4px 16px', borderBottom:'1px solid var(--surface-border)', background:'var(--surface)', flexShrink:0 }}>
            <button onClick={() => setPdfPage(p => Math.max(0, p - 1))} disabled={pdfPage === 0}
              style={{ background:'none', border:'none', cursor: pdfPage===0?'not-allowed':'pointer', color: pdfPage===0?'var(--text-muted)':'var(--text-secondary)', display:'flex', padding:4, borderRadius:4 }}>
              <ChevronLeft size={15}/>
            </button>
            <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>
              Page <b style={{ color:'var(--text-primary)' }}>{pdfPage + 1}</b> / {pdfNumPages}
            </span>
            <button onClick={() => setPdfPage(p => Math.min(pdfNumPages - 1, p + 1))} disabled={pdfPage===pdfNumPages-1}
              style={{ background:'none', border:'none', cursor: pdfPage===pdfNumPages-1?'not-allowed':'pointer', color: pdfPage===pdfNumPages-1?'var(--text-muted)':'var(--text-secondary)', display:'flex', padding:4, borderRadius:4 }}>
              <ChevronRight size={15}/>
            </button>
          </div>
        )}

        {!currentFile ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'var(--text-muted)' }}>
            <FolderOpen size={48} strokeWidth={1} />
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:16, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>No file selected</p>
              <p style={{ fontSize:13 }}>Open a folder to start annotating</p>
            </div>
            <Button icon={FolderOpen} onClick={openFolder}>Open Folder</Button>
          </div>
        ) : loadError ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, color:'var(--danger)' }}>
            <AlertCircle size={32} strokeWidth={1.5}/>
            {loadError === '__REOPEN__' ? (
              <>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>File access lost</p>
                  <p style={{ fontSize:13, color:'var(--text-muted)' }}>Chrome requires you to re-open the folder to regain access.</p>
                </div>
                <Button icon={FolderOpen} onClick={openFolder}>Re-open Folder</Button>
              </>
            ) : (
              <span style={{ fontSize:13 }}>{loadError}</span>
            )}
          </div>
        ) : rendering || !imgData ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', gap:10 }}>
            <div className="pulse-dot" style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)' }} />
            <span style={{ fontSize:13 }}>{isPdf ? `Rendering page ${pdfPage+1}…` : 'Loading image…'}</span>
          </div>
        ) : (
          <>
            {deskewing && (
              <PerspectiveCorrector
                imageUrl={activeUrl} imgWidth={activeW} imgHeight={activeH}
                onApply={(url, w, h) => { setCorrectedImg({ url, width:w, height:h }); setDeskewing(false) }}
                onClose={() => setDeskewing(false)}
              />
            )}
            <AnnotationCanvas
              imageUrl={activeUrl} imgWidth={activeW} imgHeight={activeH}
              fileName={currentFile.fileName} page={effectivePage}
            />
          </>
        )}
      </div>

      <ResizeHandle onDrag={dx => setRightW(w => Math.max(160, Math.min(520, w - dx)))} />

      {/* Right sidebar */}
      <div style={{ width:rightW, minWidth:160, maxWidth:520, display:'flex', flexDirection:'column', background:'var(--surface)', overflow:'hidden', flexShrink:0 }}>
        <div style={{ height:labelH, minHeight:80, maxHeight:'70%', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          <div style={{ padding:'8px 10px 6px', borderBottom:'1px solid var(--surface-border)', flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Labels</span>
          </div>
          <div style={{ padding:8, overflowY:'auto', flex:1 }}><LabelPicker /></div>
        </div>

        <ResizeHandle vertical onDrag={dy => setLabelH(h => Math.max(80, Math.min(500, h + dy)))} />

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:80 }}>
          <div style={{ padding:'8px 10px 6px', borderBottom:'1px solid var(--surface-border)', flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Annotations</span>
            {isPdf && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'JetBrains Mono,monospace' }}>p.{pdfPage+1}</span>}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'0 8px 8px' }}>
            <AnnotationList
              fileName={currentFile?.fileName} page={effectivePage}
              imageUrl={activeUrl} imgWidth={activeW} imgHeight={activeH}
            />
          </div>
        </div>
      </div>
    </div>
  )
}