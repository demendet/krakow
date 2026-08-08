import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { haptic } from '../lib/haptics'

type ToastSpec = {
  text: string
  action?: { label: string; run: () => void }
  tone?: 'normal' | 'bad'
  /** ms */
  duration?: number
}

type Live = ToastSpec & { key: number }

const Ctx = createContext<(t: ToastSpec) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastHost({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<Live | null>(null)
  const timer = useRef<number | null>(null)
  const seq = useRef(0)

  const show = useCallback((t: ToastSpec) => {
    if (timer.current) window.clearTimeout(timer.current)
    const key = ++seq.current
    setLive({ ...t, key })
    timer.current = window.setTimeout(
      () => setLive((cur) => (cur?.key === key ? null : cur)),
      t.duration ?? 8000,
    )
  }, [])

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), [])

  const value = useMemo(() => show, [show])

  return (
    <Ctx.Provider value={value}>
      {children}
      {live && (
        <div
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-3"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
        >
          <div
            key={live.key}
            role="status"
            className="toast-in pointer-events-auto flex w-full max-w-[26rem] items-center gap-3 overflow-hidden rounded-xl px-4 py-3"
            style={{
              background: 'var(--raised)',
              border: `1px solid ${live.tone === 'bad' ? 'var(--accent-bad)' : 'var(--line)'}`,
              boxShadow: '0 14px 34px rgba(0,0,0,.42)',
            }}
          >
            <span className="min-w-0 flex-1 truncate" style={{ fontSize: 'var(--text-body)' }}>
              {live.text}
            </span>
            {live.action && (
              <button
                type="button"
                className="disp shrink-0 px-3 py-1.5"
                style={{
                  fontWeight: 700,
                  fontSize: 'var(--text-small)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--accent-owed)',
                  border: '1px solid var(--line)',
                  borderRadius: 999,
                }}
                onClick={() => {
                  haptic.undo()
                  live.action?.run()
                  setLive(null)
                }}
              >
                {live.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
