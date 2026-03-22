import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Layers, Settings, PenTool, Download, Info } from 'lucide-react'
import ClassConfig   from './pages/ClassConfig'
import SchemaEditor  from './pages/SchemaEditor'
import Annotator     from './pages/Annotator'
import ExportReview  from './pages/ExportReview'
import About         from './pages/About'

const NAV = [
  { to: '/',        icon: Settings,  label: 'Classes',  desc: 'Label config' },
  { to: '/schema',  icon: Layers,    label: 'Schema',   desc: 'Export structure' },
  { to: '/annotate',icon: PenTool,   label: 'Annotate', desc: 'Draw boxes' },
  { to: '/export',  icon: Download,  label: 'Export',   desc: 'Review & export' },
  { to: '/about',   icon: Info,      label: 'About',    desc: 'About this tool' },
]
export default function App() {
  const location = useLocation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--navy-950)' }}>

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
          {NAV.map(({ to, icon: Icon, label, desc }) => {
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

        {/* Right side status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Auto-saved
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route path="/"         element={<ClassConfig />} />
          <Route path="/schema"   element={<SchemaEditor />} />
          <Route path="/annotate" element={<Annotator />} />
          <Route path="/export"   element={<ExportReview />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
    </div>
  )
}
