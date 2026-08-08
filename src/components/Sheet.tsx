import { useEffect, type ReactNode } from 'react'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        className="fade-in absolute inset-0"
        style={{ background: 'rgba(0,0,0,.55)' }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in relative mx-auto w-full max-w-[26rem] rounded-t-2xl px-4 pt-3"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--line)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          maxHeight: '86vh',
          overflowY: 'auto',
        }}
      >
        <div
          aria-hidden
          className="mx-auto mb-3 h-1 w-10 rounded-full"
          style={{ background: 'var(--line)' }}
        />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="disp" style={{ fontSize: 'var(--text-lead)', fontWeight: 600 }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="label px-2 py-1"
            style={{ color: 'var(--accent-owed)' }}
          >
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
