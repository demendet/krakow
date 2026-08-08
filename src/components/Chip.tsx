import type { ReactNode } from 'react'

export function Chip({
  active,
  onClick,
  children,
  tone,
  small,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
  tone?: string
  small?: boolean
}) {
  const accent = tone ?? 'var(--accent-owed)'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="pill disp-tight shrink-0"
      style={{
        padding: small ? '6px 11px' : '7px 13px',
        fontSize: small ? 'var(--text-micro)' : 'var(--text-small)',
        fontWeight: 600,
        minHeight: small ? 32 : 36,
        color: active ? 'var(--bg)' : 'var(--fg-dim)',
        background: active ? accent : 'transparent',
        borderColor: active ? accent : 'var(--line)',
      }}
    >
      {children}
    </button>
  )
}
