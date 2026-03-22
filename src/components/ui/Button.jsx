export default function Button({ children, onClick, variant = 'primary', size = 'md', disabled, icon: Icon, className = '', ...rest }) {
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' },
    ghost:   { background: 'transparent',   color: 'var(--text-secondary)', border: '1px solid var(--surface-border)' },
    danger:  { background: 'transparent',   color: 'var(--danger)', border: '1px solid var(--danger)' },
    subtle:  { background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--surface-border)' },
  }
  const sizes = {
    sm: { padding: '4px 10px', fontSize: 12, gap: 5 },
    md: { padding: '6px 14px', fontSize: 13, gap: 7 },
    lg: { padding: '9px 20px', fontSize: 14, gap: 8 },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit', fontWeight: 500,
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.15s ease',
        ...variants[variant],
        ...sizes[size],
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(1.15)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
      {...rest}
    >
      {Icon && <Icon size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} />}
      {children}
    </button>
  )
}
