import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Layers, Settings, PenTool, Download, Info, RefreshCw } from 'lucide-react'
import ClassConfig   from './pages/ClassConfig'
import SchemaEditor  from './pages/SchemaEditor'
import Annotator     from './pages/Annotator'
import ExportReview  from './pages/ExportReview'
import About         from './pages/About'
import ModeSelector  from './components/ModeSelector'
import { useModeStore } from './store/useModeStore'

const NAV_ALL = [
  { to: '/',        icon: Settings,  label: 'Classes',  modes: ['document', 'object'] },
  { to: '/schema',  icon: Layers,    label: 'Schema',   modes: ['document'] },
  { to: '/annotate',icon: PenTool,   label: 'Annotate', modes: ['document', 'object'] },
  { to: '/export',  icon: Download,  label: 'Export',   modes: ['document', 'object'] },
  { to: '/about',   icon: Info,      label: 'About',    modes: ['document', 'object'] },
]

const MODE_LABELS = {
  document: { label: 'Document Layout', color: 'var(--accent)' },
  object:   { label: 'Object Annotation', color: '#9B59B6' },
}

export default function App() {
  const location  = useLocation()
  const mode      = useModeStore(s => s.mode)
  const resetMode = useModeStore(s => s.resetMode)
  if (mode === null) return <ModeSelector />

  const NAV = NAV_ALL.filter(n => n.modes.includes(mode))
  const modeInfo = MODE_LABELS[mode]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--navy-950)', animation: 'fadeIn 0.25s ease' }}>

      {/* ── Top Nav ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--surface-border)',
        height: 52, flexShrink: 0, padding: '0 16px',
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <PenTool size={14} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Layout<span style={{ color: 'var(--accent)' }}>Annotator</span>
          </span>
          <span style={{
            fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-muted)', border: '1px solid var(--surface-border)',
            borderRadius: 3, padding: '1px 5px'
          }}>v2.1</span>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV.map(({ to, icon: Icon, label }) => {
            const active = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to)
            return (
              <NavLink
                key={to} to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 14px', borderRadius: 6, textDecoration: 'none',
                  background: active ? 'var(--navy-800)' : 'transparent',
                  border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
                  color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Auto-saved
          </div>

          {/* Mode badge + switch */}
          <button
            onClick={resetMode}
            title="Switch annotation mode"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: modeInfo.color + '18',
              border: `1px solid ${modeInfo.color}55`,
              borderRadius: 6, padding: '4px 10px',
              cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
              color: modeInfo.color, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={11} />
            {modeInfo.label}
          </button>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/"         element={<ClassConfig />} />
          <Route path="/schema"   element={<SchemaEditor />} />
          <Route path="/annotate" element={<Annotator />} />
          <Route path="/export"   element={<ExportReview />} />
          <Route path="/about"    element={<About />} />
        </Routes>
      </main>
    </div>
  )
}
