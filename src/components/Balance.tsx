import { RollingNumber } from './RollingNumber'
import { formatNumber } from '../lib/money'

type Props = {
  balance: number
  size?: 'hero' | 'compact'
  onClick?: () => void
}

export function balanceSentence(balance: number) {
  const v = Math.round(balance)
  if (v === 0) return { lead: "You're square", tone: 'even' as const, value: 0 }
  if (v > 0) return { lead: 'Mikko owes you', tone: 'owed' as const, value: v }
  return { lead: 'You owe Mikko', tone: 'owing' as const, value: -v }
}

const TONE = {
  owed: 'var(--accent-owed)',
  owing: 'var(--accent-owing)',
  even: 'var(--fg)',
}

export function Balance({ balance, size = 'hero', onClick }: Props) {
  const { lead, tone, value } = balanceSentence(balance)
  const color = TONE[tone]
  const hero = size === 'hero'
  const Tag = onClick ? 'button' : 'div'

  // On the logging screen the balance is a status line, not the hero — it runs
  // along one line so the keypad keeps the height it needs.
  if (!hero) {
    return (
      <Tag
        onClick={onClick}
        className="flex w-full items-baseline justify-between gap-3 text-left"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="label truncate">{lead}</span>
        {value === 0 ? (
          <span className="disp shrink-0" style={{ color, fontWeight: 500, fontSize: 'var(--text-lead)' }}>
            Nothing between you
          </span>
        ) : (
          <span
            className="disp flex shrink-0 items-baseline gap-1"
            style={{ color, fontWeight: 700, fontSize: 'clamp(1.5rem, 3.4vh, 1.75rem)', lineHeight: 1.1 }}
          >
            <RollingNumber text={formatNumber(value, 0)} />
            <span style={{ fontSize: '0.55em', fontWeight: 600, opacity: 0.75 }}>kr</span>
          </span>
        )}
      </Tag>
    )
  }

  return (
    <Tag
      onClick={onClick}
      className="block w-full text-left"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="label" style={{ marginBottom: 2 }}>
        {lead}
      </div>
      {value === 0 ? (
        <div
          className="disp"
          style={{ color, fontWeight: 500, fontSize: 'var(--text-figure)', lineHeight: 1.05 }}
        >
          Nothing between you
        </div>
      ) : (
        <div
          className="disp flex items-baseline gap-1.5"
          style={{ color, fontWeight: 700, fontSize: 'var(--text-hero)', lineHeight: 1 }}
        >
          <RollingNumber text={formatNumber(value, 0)} />
          <span
            style={{ fontSize: '0.36em', fontWeight: 600, opacity: 0.75, letterSpacing: '0.01em' }}
          >
            kr
          </span>
        </div>
      )}
    </Tag>
  )
}
