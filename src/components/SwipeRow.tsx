import { useRef, useState, type ReactNode } from 'react'
import { haptic } from '../lib/haptics'

const THRESHOLD = 88

/**
 * Drag a row left to retract it. Tapping opens the editor, which also has a
 * delete — so nothing here is the only way to do anything.
 */
export function SwipeRow({
  children,
  onDelete,
  onTap,
}: {
  children: ReactNode
  onDelete: () => void
  onTap?: () => void
}) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  const locked = useRef<'x' | 'y' | null>(null)

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 12 }}>
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-5"
        style={{
          width: '100%',
          background: 'var(--accent-bad)',
          opacity: Math.min(1, Math.abs(dx) / THRESHOLD),
        }}
      >
        <span className="label" style={{ color: 'var(--bg)' }}>
          Delete
        </span>
      </div>
      <div
        style={{
          transform: `translateX(${dx}px)`,
          transition: start.current ? 'none' : 'transform 180ms cubic-bezier(.16,1,.3,1)',
          background: 'var(--bg)',
          touchAction: 'pan-y',
        }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY }
          moved.current = false
          locked.current = null
        }}
        onPointerMove={(e) => {
          if (!start.current) return
          const ddx = e.clientX - start.current.x
          const ddy = e.clientY - start.current.y
          if (!locked.current) {
            if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return
            locked.current = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y'
          }
          if (locked.current !== 'x') return
          moved.current = true
          setDx(Math.min(0, ddx))
        }}
        onPointerUp={() => {
          const hit = dx < -THRESHOLD
          start.current = null
          if (hit) {
            haptic.undo()
            setDx(0)
            onDelete()
          } else {
            setDx(0)
            if (!moved.current && onTap) onTap()
          }
        }}
        onPointerCancel={() => {
          start.current = null
          setDx(0)
        }}
      >
        {children}
      </div>
    </div>
  )
}
