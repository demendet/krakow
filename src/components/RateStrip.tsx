import { useStore, type SyncState } from '../lib/store'
import { formatNumber } from '../lib/money'

const DOT: Record<SyncState, { color: string; label: string }> = {
  synced: { color: 'var(--accent-owed)', label: 'Synced' },
  pending: { color: 'var(--accent-owing)', label: 'Saving' },
  offline: { color: 'var(--fg-dim)', label: 'Offline' },
  local: { color: 'var(--accent-owing)', label: 'Demo' },
}

function shortDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** The app's letterhead: today's fixing, the way a bureau posts it. */
export function RateStrip() {
  const { sync, rates } = useStore()
  const dot = DOT[sync]

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-micro"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {/* Quoted per 100, the way a bureau posts it. "1 zł = 2,553 kr" put a
          decimal comma next to three digits and read as two and a half
          thousand kroner; per 100 there is no separator to misread at all. */}
      <span className="disp" style={{ fontWeight: 600, letterSpacing: '0.02em' }}>
        100 <span style={{ color: 'var(--pln)' }}>zł</span>
        <span style={{ color: 'var(--fg-dim)' }}> = </span>
        {formatNumber(rates.toBase.PLN * 100, 0)} <span style={{ color: 'var(--nok)' }}>kr</span>
      </span>
      <span style={{ color: 'var(--fg-dim)' }}>ECB {shortDate(rates.date)}</span>
      <span className="ml-auto flex items-center gap-1.5" role="status">
        <span className="label" style={{ letterSpacing: '0.1em' }}>
          {dot.label}
        </span>
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: dot.color,
            boxShadow: `0 0 0 3px color-mix(in srgb, ${dot.color} 18%, transparent)`,
          }}
        />
      </span>
    </div>
  )
}
