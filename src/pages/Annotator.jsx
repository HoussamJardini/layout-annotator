import { useState, useEffect, useCallback, useRef } from 'react'
import { FolderOpen, AlertCircle } from 'lucide-react'
import { useSessionStore } from '../store/useSessionStore'
import { useAnnotationStore } from '../store/useAnnotationStore'
import { useFileSystem } from '../hooks/useFileSystem'
import { usePdfRenderer } from '../hooks/usePdfRenderer'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import AnnotationCanvas from '../components/canvas/AnnotationCanvas'
import CanvasToolbar from '../components/canvas/CanvasToolbar'
import FileTree from '../components/sidebar/FileTree'
import LabelPicker from '../components/sidebar/LabelPicker'
import AnnotationList from '../components/sidebar/AnnotationList'
import Button from '../components/ui/Button'

function ResizeHandle({ onDrag, vertical = false }) {
  const dragging = useRef(false)
  const last     = useRef(0)

  const onMouseDown = (e) => {
    e.preventDefault()
    dragging.current = true
    last.current = vertical ? e.clientY : e.clientX
    const onMove = (ev) => {
      if (!dragging.current) return
      const cur   = vertical ? ev.clientY : ev.clientX
      const delta = cur - last.current
      last.current = cur
      onDrag(delta)
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
    <div
      onMouseDown={onMouseDown}
      style={{
        width: vertical ? '100%' : 4, height: vertical ? 4 : '100%',
        flexShrink: 0, background: 'var(--surface-border)',
        cursor: vertical ? 'row-resize' : 'col-resize',
        transition: 'background 0.15s', position: 'relative', zIndex: 10,
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

  const [imgData, setImgData]     = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [leftW,  setLeftW]        = useState(220)
  const [rightW, setRightW]       = useState(240)
  const [labelH, setLabelH]       = useState(200)

  useKeyboardShortcuts(currentFile)

  useEffect(() => {
    if (!currentFile) return
    setImgData(null); setLoadError(null)
    const load = async () => {
      try {
        if (currentFile.sourceType === 'pdf') {
          const res = await renderPage(currentFile.handle, (currentFile.page ?? 0) + 1, 2)
          setImgData({ url: res.dataUrl, width: res.width, height: res.height })
          setImageMeta(currentFile.fileName, currentFile.page ?? 0, {
            width: res.width, height: res.height, sourceType: 'pdf', folder: currentFile.folder,
          })
        } else {
          const file = await currentFile.handle.getFile()
          const url  = URL.createObjectURL(file)
          const img  = new Image()
          img.onload = () => {
            setImgData({ url, width: img.naturalWidth, height: img.naturalHeight })
            setImageMeta(currentFile.fileName, currentFile.page ?? 0, {
              width: img.naturalWidth, height: img.naturalHeight,
              sourceType: 'image', folder: currentFile.folder,
            })
          }
          img.onerror = () => setLoadError('Failed to load image')
          img.src = url
        }
      } catch (e) { setLoadError(e.message) }
    }
    load()
  }, [currentFile?.path, currentFile?.page])

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

      {/* Center canvas */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:200 }}>
        <CanvasToolbar fileName={currentFile?.fileName} page={currentFile?.page ?? 0} />
        {!currentFile ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'var(--text-muted)' }}>
            <FolderOpen size={48} strokeWidth={1} />
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:16, fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>No file selected</p>
              <p style={{ fontSize:13 }}>Open a folder from the left sidebar</p>
            </div>
            <Button icon={FolderOpen} onClick={openFolder}>Open Folder</Button>
          </div>
        ) : loadError ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:'var(--danger)' }}>
            <AlertCircle size={20}/><span>{loadError}</span>
          </div>
        ) : rendering || !imgData ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', gap:10 }}>
            <div className="pulse-dot" style={{ width:8, height:8, borderRadius:'50%', background:'var(--accent)' }} />
            <span style={{ fontSize:13 }}>Loading{currentFile.sourceType === 'pdf' ? ' PDF page' : ' image'}…</span>
          </div>
        ) : (
          <AnnotationCanvas
            imageUrl={imgData.url} imgWidth={imgData.width} imgHeight={imgData.height}
            fileName={currentFile.fileName} page={currentFile.page ?? 0}
          />
        )}
      </div>

      <ResizeHandle onDrag={dx => setRightW(w => Math.max(160, Math.min(520, w - dx)))} />

      {/* Right sidebar */}
      <div style={{ width:rightW, minWidth:160, maxWidth:520, display:'flex', flexDirection:'column', background:'var(--surface)', overflow:'hidden', flexShrink:0 }}>

        {/* Labels */}
        <div style={{ height:labelH, minHeight:80, maxHeight:'70%', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          <div style={{ padding:'8px 10px 6px', borderBottom:'1px solid var(--surface-border)', flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Labels</span>
          </div>
          <div style={{ padding:8, overflowY:'auto', flex:1 }}>
            <LabelPicker />
          </div>
        </div>

        <ResizeHandle vertical onDrag={dy => setLabelH(h => Math.max(80, Math.min(500, h + dy)))} />

        {/* Annotations */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:80 }}>
          <div style={{ padding:'8px 10px 6px', borderBottom:'1px solid var(--surface-border)', flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Annotations</span>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'0 8px 8px' }}>
            <AnnotationList
              fileName={currentFile?.fileName}
              page={currentFile?.page ?? 0}
              imageUrl={imgData?.url}
              imgWidth={imgData?.width}
              imgHeight={imgData?.height}
            />
          </div>
        </div>
      </div>
    </div>
  )
}