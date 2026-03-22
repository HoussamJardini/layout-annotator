export default function Badge({ children, color, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 7px', borderRadius: 10,
      fontSize: 11, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
      background: color ? color + '22' : 'var(--surface-border)',
      color: color ?? 'var(--text-secondary)',
      border: `1px solid ${color ? color + '44' : 'var(--surface-border)'}`,
      ...style
    }}>{children}</span>
  )
}
