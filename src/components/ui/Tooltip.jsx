import { useState } from 'react'

export default function Tooltip({ children, text, position = 'top' }) {
  const [show, setShow] = useState(false)
  const pos = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top:    'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    right:  { left:   'calc(100% + 6px)', top:  '50%', transform: 'translateY(-50%)' },
  }
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && (
        <div style={{
          position: 'absolute', zIndex: 999, pointerEvents: 'none',
          background: '#0f1e2e', border: '1px solid var(--surface-border)',
          color: 'var(--text-primary)', fontSize: 12, padding: '4px 9px',
          borderRadius: 5, whiteSpace: 'nowrap', ...pos[position]
        }}>{text}</div>
      )}
    </div>
  )
}
