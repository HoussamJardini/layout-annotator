import { useClassStore } from '../../store/useClassStore'
import Badge from '../ui/Badge'

export default function LabelPicker() {
  const { classes, activeClassId, setActiveClass } = useClassStore()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {classes.map(cls => {
        const active = cls.id === activeClassId
        return (
          <div key={cls.id} onClick={() => setActiveClass(cls.id)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
            background: active ? cls.color + '22' : 'transparent',
            border: `1px solid ${active ? cls.color + '88' : 'transparent'}`,
            transition: 'all 0.12s',
          }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: cls.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: active ? cls.color : 'var(--text-secondary)', flex: 1, fontFamily: 'JetBrains Mono, monospace', fontWeight: active ? 600 : 400 }}>
              {cls.name}
            </span>
            {cls.shortcut && (
              <kbd style={{ fontSize: 10, background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 3, padding: '0 4px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                {cls.shortcut}
              </kbd>
            )}
          </div>
        )
      })}
    </div>
  )
}
