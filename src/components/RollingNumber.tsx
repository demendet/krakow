import { memo } from 'react'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * The balance is the only number in the app that changes on its own, so it is
 * the only one that moves. Each digit column slides to its new value; the
 * separators sit still.
 */
function RollingNumberInner({ text }: { text: string }) {
  return (
    <span>
      <span className="sr-only">{text}</span>
      {text.split('').map((ch, i) => {
        const n = DIGITS.indexOf(ch)
        if (n < 0)
          return (
            <span key={`${i}-${ch}`} aria-hidden>
              {ch}
            </span>
          )
        return (
          <span className="roll-window" key={i} aria-hidden>
            <span className="roll-col" style={{ transform: `translateY(${-n}em)` }}>
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}

export const RollingNumber = memo(RollingNumberInner)
