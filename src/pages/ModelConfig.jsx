import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FolderOpen, Cpu, Zap, ChevronDown, ChevronRight,
  Copy, RefreshCw, Play, Save, Search, FileCode2,
  AlertTriangle, CheckCircle, Loader, Terminal, Sparkles, Box,
} from 'lucide-react'
import { useModelStore, DEFAULT_CODE } from '../store/useModelStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// ─── Constants ────────────────────────────────────────────────────────────────

const FRAMEWORK_COLORS = {
  PyTorch:      '#e67e22',
  ONNX:         '#2980b9',
  HuggingFace:  '#27ae60',
  Darknet:      '#8e44ad',
  Unknown:      '#7f8c8d',
}

const CONTRACT_TEXT = `OUTPUT CONTRACT — what your run() function must return:
  List of dicts, each with:
    x          → int, left edge in pixels (original image coordinates)
    y          → int, top edge in pixels
    w          → int, box width in pixels
    h          → int, box height in pixels
    label      → str, class name (e.g. "cat", "invoice_number")
    confidence → float, 0.0 to 1.0

INPUT CONTRACT — what is injected into your run() function:
  image_pil  → PIL.Image, RGB, full original image
  model_path → str, absolute path to the selected model file
  device     → str, "cpu" or "cuda"

RULES:
  • Function must be named exactly: run(image_pil, model_path, device)
  • Must return a list (empty list [] is valid — means no detections)
  • Do not use sys.exit() or os._exit()
  • Import everything inside the function (no top-level imports guaranteed)
  • Coordinates must be in original image pixel space, not normalized
  • If your model outputs normalized coords (0–1), multiply by image width/height`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 ** 3)).toFixed(1) + ' GB'
  if (bytes >= 1024 * 1024)        return (bytes / (1024 ** 2)).toFixed(1) + ' MB'
  if (bytes >= 1024)               return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}

function timestamp() {
  return new Date().toTimeString().slice(0, 8)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, collapsible = false, defaultOpen = true, accent = 'var(--accent)', noPad = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
      <div
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 12px', background: 'var(--navy-900)',
          borderBottom: open ? '1px solid var(--surface-border)' : 'none',
          cursor: collapsible ? 'pointer' : 'default', userSelect: 'none',
        }}
      >
        {Icon && <Icon size={12} color={accent} />}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
          {title}
        </span>
        {collapsible && (open
          ? <ChevronDown size={12} color="var(--text-muted)" />
          : <ChevronRight size={12} color="var(--text-muted)" />
        )}
      </div>
      {open && <div style={noPad ? {} : { padding: 12 }}>{children}</div>}
    </div>
  )
}

function Chip({ label, color = 'var(--accent)' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: color + '1a', border: `1px solid ${color}44`,
      color, fontSize: 11, fontFamily: 'JetBrains Mono,monospace', fontWeight: 600,
    }}>
      {label}
    </span>
  )
}

function CodeEditor({ value, onChange, height = 300 }) {
  const textareaRef = useRef(null)
  const gutterRef   = useRef(null)
  const lines = value.split('\n').length

  const syncScroll = () => {
    if (gutterRef.current && textareaRef.current)
      gutterRef.current.scrollTop = textareaRef.current.scrollTop
  }

  return (
    <div style={{ display: 'flex', height, overflow: 'hidden', border: '1px solid var(--surface-border)', borderRadius: 6, fontFamily: 'JetBrains Mono,monospace', fontSize: 12, lineHeight: '1.6' }}>
      {/* Gutter */}
      <div ref={gutterRef} style={{
        width: 38, overflowY: 'hidden', flexShrink: 0,
        background: '#060d14', color: '#2e4055',
        textAlign: 'right', padding: '8px 0',
        userSelect: 'none', borderRight: '1px solid #1a2530',
      }}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>
        ))}
      </div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        style={{
          flex: 1, resize: 'none', background: '#080f18', color: '#c9d8ea',
          border: 'none', padding: '8px 12px',
          fontFamily: 'JetBrains Mono,monospace', fontSize: 12,
          lineHeight: '1.6', outline: 'none', overflowY: 'auto',
        }}
      />
    </div>
  )
}

function ConsolePanel({ logs, onClear }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [logs])

  const colorFor = (level) => {
    if (level === 'error')   return '#e74c3c'
    if (level === 'success') return '#27ae60'
    if (level === 'warn')    return '#f39c12'
    return '#7aadcc'
  }

  return (
    <div style={{ height: 250, background: '#040b11', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--surface-border)', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px', borderBottom: '1px solid #0d1a24', background: '#060d14', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Terminal size={11} color="#3a5a7a" />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#3a5a7a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Console</span>
        </div>
        <button onClick={onClear} style={{ background: 'none', border: 'none', color: '#3a5a7a', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', padding: '2px 6px' }}>
          Clear
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 10px', fontFamily: 'JetBrains Mono,monospace', fontSize: 11 }}>
        {logs.length === 0 && (
          <span style={{ color: '#1a2f40' }}>— console ready —</span>
        )}
        {logs.map((entry, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 2, lineHeight: 1.55 }}>
            <span style={{ color: '#1e3a52', flexShrink: 0 }}>{entry.time}</span>
            <span style={{ color: colorFor(entry.level), flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{entry.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ModelConfig() {
  const store = useModelStore()
  const {
    modelDir, modelFiles, modelPath, modelArchitecture,
    translatorCode, device, confidence,
    setModelDir, setModelFiles, setModelPath, setModelArchitecture,
    setTranslatorCode, setDevice, setConfidence, resetTranslatorCode,
  } = store

  const [dirInput,      setDirInput]      = useState(modelDir)
  const [loadingFiles,  setLoadingFiles]  = useState(false)
  const [inspecting,    setInspecting]    = useState(false)
  const [testing,       setTesting]       = useState(false)
  const [logs,          setLogs]          = useState([])
  const [promptText,    setPromptText]    = useState('')
  const [promptVisible, setPromptVisible] = useState(false)
  const testImageRef = useRef(null)

  const addLog = useCallback((text, level = 'info') => {
    setLogs(prev => [...prev, { time: timestamp(), text, level }])
  }, [])

  // ── A: Browse models ────────────────────────────────────────────────────────
  const handleBrowse = async () => {
    const dir = dirInput.trim()
    if (!dir) return
    setModelDir(dir)
    setLoadingFiles(true)
    try {
      const res = await fetch(`${API_BASE}/models?dir=${encodeURIComponent(dir)}`, { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      setModelFiles(data.files ?? [])
      if (data.error) addLog(`Browse error: ${data.error}`, 'error')
      else addLog(`Found ${data.files.length} model file(s) in ${dir}`)
    } catch (e) {
      addLog(`Failed to list models: ${e.message}`, 'error')
      setModelFiles([])
    }
    setLoadingFiles(false)
  }

  // ── A: Native file picker ───────────────────────────────────────────────────
  const [picking, setPicking] = useState(false)

  const handlePickFile = async () => {
    setPicking(true)
    addLog('Opening file picker…')
    try {
      const res  = await fetch(`${API_BASE}/pick-file`, { method: 'POST', signal: AbortSignal.timeout(60000) })
      const data = await res.json()
      if (data.error) {
        addLog(`File picker error: ${data.error}`, 'error')
      } else if (data.path) {
        setModelPath(data.path)
        setModelDir(data.dir)
        setDirInput(data.dir)
        addLog(`Selected: ${data.path}`, 'success')
      } else {
        addLog('No file selected')
      }
    } catch (e) {
      addLog(`File picker failed: ${e.message}`, 'error')
    }
    setPicking(false)
  }

  // ── B: Inspect model ────────────────────────────────────────────────────────
  const handleInspect = async () => {
    if (!modelPath) return
    setInspecting(true)
    addLog(`Inspecting model: ${modelPath}`)
    try {
      const res = await fetch(`${API_BASE}/inspect-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: modelPath }),
        signal: AbortSignal.timeout(30000),
      })
      const data = await res.json()
      setModelArchitecture(data)
      if (data.error) {
        addLog(`Inspection error: ${data.error}`, 'error')
      } else {
        addLog(`Framework: ${data.framework}`, 'success')
        addLog(`Input: ${data.input_shape}  Output: ${data.output_shape}`)
        if (data.num_classes) addLog(`Classes: ${data.num_classes}`)
      }
    } catch (e) {
      addLog(`Inspection failed: ${e.message}`, 'error')
    }
    setInspecting(false)
  }

  // ── F: Test run ─────────────────────────────────────────────────────────────
  const handleTest = async (file) => {
    if (!modelPath) { addLog('Select a model first', 'error'); return }

    setTesting(true)
    addLog(`Loading image: ${file.name}`)

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    addLog('Sending to backend...')
    try {
      const res = await fetch(`${API_BASE}/run-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, model_path: modelPath, translator_code: translatorCode, device, confidence }),
        signal: AbortSignal.timeout(120000),
      })
      const data = await res.json()
      if (data.error) {
        addLog(`Error:\n${data.error}`, 'error')
        if (data.stderr) addLog(data.stderr, 'error')
      } else {
        addLog(`Model output received — ${data.boxes.length} box(es) detected`, 'success')
        data.boxes.forEach((b, i) => {
          addLog(`[${i}] label=${b.label}  conf=${Number(b.confidence).toFixed(2)}  x=${b.x} y=${b.y} w=${b.w} h=${b.h}`)
        })
      }
    } catch (e) {
      addLog(`Request failed: ${e.message}`, 'error')
    }
    setTesting(false)
  }

  // ── E: Prompt generator ─────────────────────────────────────────────────────
  const generatePrompt = () => {
    const arch = modelArchitecture
    if (!arch) addLog('Model not yet inspected — prompt will be generic', 'warn')

    const classStr = arch?.class_names?.length
      ? arch.class_names.slice(0, 30).join(', ') + (arch.class_names.length > 30 ? ` ... (+${arch.class_names.length - 30} more)` : '')
      : 'unknown'

    const prompt = `I have an object annotation app that expects bounding box predictions in a specific format.

Here is the app's input/output contract:

${CONTRACT_TEXT}

My model information:
  File:                 ${modelPath ?? 'not selected'}
  Framework:            ${arch?.framework ?? 'unknown'}
  Input shape:          ${arch?.input_shape ?? 'unknown'}
  Output shape:         ${arch?.output_shape ?? 'unknown'}
  Number of classes:    ${arch?.num_classes ?? 'unknown'}
  Class names:          ${classStr}
  Architecture summary: ${arch?.layers_summary ?? 'not available'}

Please write a Python function called run(image_pil, model_path, device) that:
1. Loads the model from model_path
2. Preprocesses image_pil to match the model's expected input shape ${arch?.input_shape ?? 'unknown'}
3. Runs inference on the image
4. Post-processes the output (shape: ${arch?.output_shape ?? 'unknown'}) into the app's required format
5. Returns a list of dicts with keys: x, y, w, h, label, confidence
6. Handles both CPU and CUDA via the device argument
7. Imports all dependencies inside the function

Return only the Python function, no explanation, no markdown fences.`

    setPromptText(prompt)
    setPromptVisible(true)
    addLog('Prompt generated ✓', 'success')
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(promptText)
    addLog('Prompt copied to clipboard ✓', 'success')
  }

  const archColor = FRAMEWORK_COLORS[modelArchitecture?.framework] ?? FRAMEWORK_COLORS.Unknown

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--navy-950)' }}>

      {/* ── Left panel ── */}
      <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', padding: 12, borderRight: '1px solid var(--surface-border)' }}>

        {/* A: Model Browser */}
        <Section title="Model Directory" icon={FolderOpen}>
          {/* Primary: native file picker */}
          <button
            onClick={handlePickFile}
            disabled={picking}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--navy-800)', border: '2px dashed var(--surface-border)',
              borderRadius: 7, padding: '10px 12px', cursor: picking ? 'wait' : 'pointer',
              color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              marginBottom: 12, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {picking
              ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Opening picker…</>
              : <><FolderOpen size={15} /> Select Model File…</>
            }
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>or browse by folder</span>
            <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input
              value={dirInput}
              onChange={e => setDirInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBrowse()}
              placeholder="C:\models\yolov8"
              style={{
                flex: 1, background: 'var(--navy-900)', border: '1px solid var(--surface-border)',
                borderRadius: 5, padding: '5px 9px', color: 'var(--text-primary)',
                fontSize: 12, fontFamily: 'JetBrains Mono,monospace', outline: 'none',
              }}
            />
            <button
              onClick={handleBrowse} disabled={loadingFiles}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'var(--accent)', border: 'none', borderRadius: 5,
                padding: '5px 10px', cursor: 'pointer', color: '#fff',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit', flexShrink: 0,
                opacity: loadingFiles ? 0.6 : 1,
              }}
            >
              {loadingFiles ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={12} />}
              Browse
            </button>
          </div>

          {/* File list */}
          {modelFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflowY: 'auto' }}>
              {modelFiles.map((f) => {
                const selected = f.path === modelPath
                return (
                  <div
                    key={f.path}
                    onClick={() => { setModelPath(f.path); addLog(`Selected: ${f.name}`) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
                      background: selected ? 'var(--accent)18' : 'var(--navy-900)',
                      border: `1px solid ${selected ? 'var(--accent)55' : 'var(--surface-border)'}`,
                      transition: 'all 0.1s',
                    }}
                  >
                    <FileCode2 size={12} color={selected ? 'var(--accent)' : 'var(--text-muted)'} />
                    <span style={{ flex: 1, fontSize: 12, color: selected ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: 'JetBrains Mono,monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selected ? 700 : 400 }}>
                      {f.name}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{formatSize(f.size)}</span>
                  </div>
                )
              })}
            </div>
          )}
          {modelFiles.length === 0 && modelDir && !loadingFiles && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: '8px 0 0' }}>No model files found</p>
          )}

          {/* Selected badge */}
          {modelPath && (
            <div style={{ marginTop: 10, background: 'var(--accent)12', border: '1px solid var(--accent)33', borderRadius: 6, padding: '7px 10px' }}>
              <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 3 }}>ACTIVE MODEL</div>
              <div style={{ fontSize: 11, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono,monospace', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {modelPath}
              </div>
            </div>
          )}
        </Section>

        {/* B: Architecture Inspector */}
        <Section title="Model Architecture" icon={Box}>
          <button
            onClick={handleInspect}
            disabled={!modelPath || inspecting}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: modelPath ? 'var(--accent)' : 'var(--navy-800)',
              border: 'none', borderRadius: 6, padding: '7px 12px', cursor: modelPath ? 'pointer' : 'not-allowed',
              color: modelPath ? '#fff' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              opacity: inspecting ? 0.7 : 1,
            }}
          >
            {inspecting
              ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Inspecting…</>
              : <><Search size={13} /> Inspect Model</>
            }
          </button>

          {!modelPath && (
            <p style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Select a model file above first</p>
          )}

          {modelArchitecture && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Framework badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 80 }}>Framework</span>
                <Chip label={modelArchitecture.framework} color={archColor} />
              </div>

              {/* Shapes */}
              {modelArchitecture.input_shape && modelArchitecture.input_shape !== 'unknown' && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 80, paddingTop: 2 }}>Input</span>
                  <Chip label={modelArchitecture.input_shape} color="#5dade2" />
                </div>
              )}
              {modelArchitecture.output_shape && modelArchitecture.output_shape !== 'unknown' && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 80, paddingTop: 2 }}>Output</span>
                  <Chip label={modelArchitecture.output_shape} color="#a29bfe" />
                </div>
              )}

              {/* Classes */}
              {modelArchitecture.num_classes != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 80 }}>Classes</span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{modelArchitecture.num_classes}</span>
                </div>
              )}
              {modelArchitecture.class_names?.length > 0 && (
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Class names</span>
                  <div style={{ maxHeight: 90, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {modelArchitecture.class_names.map((name, i) => (
                      <span key={i} style={{ fontSize: 10, background: archColor + '18', color: archColor, border: `1px solid ${archColor}33`, borderRadius: 3, padding: '1px 5px', fontFamily: 'JetBrains Mono,monospace' }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Layers summary */}
              {modelArchitecture.layers_summary && (
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Layers</span>
                  <pre style={{ margin: 0, maxHeight: 100, overflowY: 'auto', background: 'var(--navy-950)', border: '1px solid var(--surface-border)', borderRadius: 4, padding: '6px 8px', fontSize: 10, color: '#7aadcc', fontFamily: 'JetBrains Mono,monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.55 }}>
                    {modelArchitecture.layers_summary}
                  </pre>
                </div>
              )}

              {/* Raw info */}
              {modelArchitecture.raw_info && (
                <details>
                  <summary style={{ fontSize: 10, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 4 }}>Raw info</summary>
                  <pre style={{ margin: 0, maxHeight: 120, overflowY: 'auto', background: 'var(--navy-950)', border: '1px solid var(--surface-border)', borderRadius: 4, padding: '6px 8px', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.55 }}>
                    {modelArchitecture.raw_info}
                  </pre>
                </details>
              )}
            </div>
          )}
        </Section>

        {/* G: Device + Confidence */}
        <Section title="Inference Settings" icon={Zap}>
          {/* Device toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 90 }}>Device</span>
            <div style={{ display: 'flex', background: 'var(--navy-900)', borderRadius: 6, border: '1px solid var(--surface-border)', overflow: 'hidden' }}>
              {['cpu', 'cuda'].map(d => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 14px', border: 'none', cursor: 'pointer',
                    background: device === d ? 'var(--accent)' : 'transparent',
                    color: device === d ? '#fff' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {d === 'cpu' ? <Cpu size={12} /> : <Zap size={12} />}
                  {d.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 90 }}>Confidence</span>
            <input
              type="range" min={0} max={1} step={0.01}
              value={confidence}
              onChange={e => setConfidence(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono,monospace', width: 36, textAlign: 'right' }}>
              {confidence.toFixed(2)}
            </span>
          </div>
        </Section>

        {/* C: App Contract */}
        <Section title="App Contract" icon={CheckCircle} collapsible defaultOpen={false} accent="#27ae60">
          <pre style={{ margin: 0, fontSize: 11, color: '#7ecba1', fontFamily: 'JetBrains Mono,monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6, background: 'var(--navy-950)', border: '1px solid #27ae6033', borderRadius: 5, padding: '10px 12px' }}>
            {CONTRACT_TEXT}
          </pre>
        </Section>
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 12, gap: 10, minWidth: 0 }}>

        {/* D: Translator Code Editor */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'var(--navy-900)', borderBottom: '1px solid var(--surface-border)' }}>
            <FileCode2 size={12} color="var(--accent)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
              Translator Code
            </span>
            <button
              onClick={() => { resetTranslatorCode(); addLog('Reset to default template') }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--surface-border)', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'inherit' }}
            >
              <RefreshCw size={10} /> Reset
            </button>
            <button
              onClick={() => { addLog('Configuration saved ✓', 'success') }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent)', border: 'none', borderRadius: 5, padding: '3px 9px', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
            >
              <Save size={10} /> Save Config
            </button>
          </div>
          <CodeEditor value={translatorCode} onChange={setTranslatorCode} height={320} />
        </div>

        {/* E: AI Prompt Generator */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'var(--navy-900)', borderBottom: promptVisible ? '1px solid var(--surface-border)' : 'none' }}>
            <Sparkles size={12} color="#9B59B6" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', flex: 1 }}>
              Generate Converter Code with AI
            </span>
            <button
              onClick={generatePrompt}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#9B59B6', border: 'none', borderRadius: 5, padding: '3px 10px', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
            >
              <Sparkles size={10} /> Generate Prompt
            </button>
          </div>

          {promptVisible && (
            <div style={{ padding: 12 }}>
              {!modelArchitecture && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f39c1218', border: '1px solid #f39c1244', borderRadius: 5, padding: '6px 10px', marginBottom: 10 }}>
                  <AlertTriangle size={12} color="#f39c12" />
                  <span style={{ fontSize: 11, color: '#f39c12' }}>Inspect your model first for a better prompt.</span>
                </div>
              )}
              <textarea
                readOnly
                value={promptText}
                style={{
                  width: '100%', height: 200, resize: 'vertical',
                  background: 'var(--navy-950)', border: '1px solid var(--surface-border)',
                  borderRadius: 5, padding: '8px 10px', color: 'var(--text-secondary)',
                  fontSize: 11.5, fontFamily: 'JetBrains Mono,monospace', lineHeight: 1.55, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Paste into ChatGPT, Claude, or any AI assistant to generate your converter code.
                </span>
                <button
                  onClick={copyPrompt}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--navy-800)', border: '1px solid var(--surface-border)', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'inherit', flexShrink: 0 }}
                >
                  <Copy size={11} /> Copy to Clipboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* F: Console */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Test & Debug
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={testImageRef}
                type="file" accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleTest(file)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => testImageRef.current?.click()}
                disabled={testing || !modelPath}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: modelPath ? '#27ae6022' : 'transparent',
                  border: `1px solid ${modelPath ? '#27ae6066' : 'var(--surface-border)'}`,
                  borderRadius: 5, padding: '4px 10px', cursor: modelPath ? 'pointer' : 'not-allowed',
                  color: modelPath ? '#27ae60' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  opacity: testing ? 0.7 : 1,
                }}
              >
                {testing
                  ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
                  : <><Play size={11} /> Test with Image…</>
                }
              </button>
            </div>
          </div>
          <ConsolePanel logs={logs} onClear={() => setLogs([])} />
        </div>

      </div>
    </div>
  )
}
