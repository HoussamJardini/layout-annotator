import { useState } from 'react'
import { PenTool, FileText, Box } from 'lucide-react'
import { useModeStore } from '../store/useModeStore'

function ModeCard({ icon: Icon, title, desc, onClick, accentColor }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 280, padding: '36px 28px',
        background: hovered ? 'var(--surface-raised)' : 'var(--surface)',
        border: `2px solid ${hovered ? accentColor : 'var(--surface-border)'}`,
        borderRadius: 14, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? `0 8px 32px ${accentColor}33` : 'none',
      }}
    >
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: accentColor + '22',
        border: `2px solid ${accentColor}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={28} color={accentColor} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.35 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          {desc}
        </div>
      </div>

      <div style={{
        marginTop: 4, padding: '8px 24px',
        background: accentColor + '22',
        border: `1px solid ${accentColor}66`,
        borderRadius: 8,
        fontSize: 13, fontWeight: 600, color: accentColor,
        transition: 'background 0.15s',
      }}>
        Select
      </div>
    </div>
  )
}

export default function ModeSelector() {
  const setMode = useModeStore(s => s.setMode)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--navy-950)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.35s ease',
    }}>
      {/* Logo + title */}
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PenTool size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 24, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Layout<span style={{ color: 'var(--accent)' }}>Annotator</span>
          </span>
          <span style={{
            fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text-muted)', border: '1px solid var(--surface-border)',
            borderRadius: 3, padding: '2px 6px', alignSelf: 'flex-start', marginTop: 4,
          }}>v2.1</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Choose an annotation mode to get started
        </p>
      </div>

      {/* Mode cards */}
      <div style={{ display: 'flex', gap: 24 }}>
        <ModeCard
          icon={FileText}
          title="Document Layout Annotation"
          desc="Annotate document regions, tables, OCR text extraction"
          onClick={() => setMode('document')}
          accentColor="var(--accent)"
        />
        <ModeCard
          icon={Box}
          title="Object Annotation"
          desc="Annotate objects in images with bounding boxes"
          onClick={() => setMode('object')}
          accentColor="#9B59B6"
        />
      </div>

      {/* Footer hint */}
      <p style={{ marginTop: 40, fontSize: 11.5, color: 'var(--text-muted)' }}>
        You can switch modes later from the top navigation bar
      </p>
    </div>
  )
}
