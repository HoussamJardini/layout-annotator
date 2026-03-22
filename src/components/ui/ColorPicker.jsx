const PRESETS = [
  '#3498db','#9b59b6','#e67e22','#f39c12','#1abc9c',
  '#16a085','#e74c3c','#c0392b','#27ae60','#2ecc71',
  '#34495e','#2980b9','#8e44ad','#d35400','#f1c40f',
]

export default function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, background: 'var(--surface)', border: '1px solid var(--surface-border)',
            borderRadius: 6, padding: '5px 10px', color: 'var(--text-primary)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
          }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {PRESETS.map(c => (
          <div key={c} onClick={() => onChange(c)} style={{
            width: 22, height: 22, borderRadius: 4, background: c, cursor: 'pointer',
            border: value === c ? '2px solid #fff' : '2px solid transparent',
            transition: 'transform 0.1s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        ))}
      </div>
    </div>
  )
}
