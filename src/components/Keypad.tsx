import { useRef } from 'react'
import { haptic } from '../lib/haptics'

type Props = {
  onDigit: (d: string) => void
  onDecimal: () => void
  onBackspace: () => void
  onClear: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function Keypad({ onDigit, onDecimal, onBackspace, onClear }: Props) {
  const holdRef = useRef<number | null>(null)
  const clearedRef = useRef(false)

  const startHold = () => {
    clearedRef.current = false
    holdRef.current = window.setTimeout(() => {
      clearedRef.current = true
      haptic.undo()
      onClear()
    }, 420)
  }
  const endHold = () => {
    if (holdRef.current) window.clearTimeout(holdRef.current)
    holdRef.current = null
  }

  const press = (fn: () => void) => () => {
    haptic.tap()
    fn()
  }

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Amount keypad">
      {KEYS.map((k) => (
        <Key key={k} onClick={press(() => onDigit(k))} label={k}>
          {k}
        </Key>
      ))}
      <Key onClick={press(onDecimal)} label="Decimal point" muted>
        ,
      </Key>
      <Key onClick={press(() => onDigit('0'))} label="0">
        0
      </Key>
      <Key
        label="Delete"
        muted
        onClick={() => {
          if (clearedRef.current) return
          haptic.tap()
          onBackspace()
        }}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onPointerCancel={endHold}
      >
        <svg width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden>
          <path
            d="M8.6 2h14a1.4 1.4 0 0 1 1.4 1.4v13.2A1.4 1.4 0 0 1 22.6 18h-14a1.4 1.4 0 0 1-1.06-.49L2 10l5.54-7.51A1.4 1.4 0 0 1 8.6 2Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="m12.4 7.2 6 5.6M18.4 7.2l-6 5.6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </Key>
    </div>
  )
}

function Key({
  children,
  label,
  muted,
  ...rest
}: {
  children: React.ReactNode
  label: string
  muted?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className="key disp flex items-center justify-center"
      style={{
        // 68px on any current phone; shrinks only on SE-class screens, where
        // the alternative is the save buttons falling below the fold.
        height: 'clamp(48px, 8.4vh, 68px)',
        fontSize: 'var(--text-title)',
        fontWeight: 600,
        color: muted ? 'var(--fg-dim)' : 'var(--fg)',
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
