import { useMemo } from 'react'
import { Empty } from '../components/Empty'
import { stamp } from '../lib/dates'
import { buildLedger, type LedgerRow } from '../lib/ledger'
import { useStore } from '../lib/store'

const TONE: Record<LedgerRow['tone'], { mark: string; color: string; word: string }> = {
  add: { mark: '+', color: 'var(--accent-owed)', word: 'added' },
  edit: { mark: '~', color: 'var(--accent-owing)', word: 'edited' },
  delete: { mark: '×', color: 'var(--accent-bad)', word: 'deleted' },
  settle: { mark: '=', color: 'var(--eur)', word: 'settled' },
}

export function LedgerScreen() {
  const { events } = useStore()
  const rows = useMemo(() => buildLedger(events), [events])

  if (rows.length === 0) {
    return (
      <Empty
        title="The log is empty"
        body="Every entry, edit and retraction lands here in the order it happened. It's the record the balance is derived from."
      />
    )
  }

  return (
    <div className="px-4 pb-8 pt-5">
      <h1 className="disp" style={{ fontSize: 'var(--text-title)', fontWeight: 600 }}>
        The log
      </h1>
      <p className="mb-4 mt-1" style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-small)' }}>
        {rows.length} events. Nothing is ever overwritten — this is where the balance comes from.
      </p>
      <div className="mosaic mb-1" aria-hidden />

      <ol>
        {rows.map((r) => {
          const t = TONE[r.tone]
          return (
            <li
              key={r.event.id}
              className="flex gap-3 py-2.5"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <span
                aria-hidden
                className="disp mt-0.5 shrink-0 text-center"
                style={{ width: 16, color: t.color, fontWeight: 700 }}
              >
                {t.mark}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 'var(--text-small)',
                    textDecoration: r.struck ? 'line-through' : undefined,
                    opacity: r.struck ? 0.55 : 1,
                  }}
                >
                  {r.title}
                </div>
                {r.detail && (
                  <div
                    className="disp-tight"
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--fg-dim)',
                      textDecoration: r.struck ? 'line-through' : undefined,
                    }}
                  >
                    {r.detail}
                  </div>
                )}
                {r.changes.map((c) => (
                  <div
                    key={c.key}
                    className="disp-tight"
                    style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
                  >
                    {c.key}: <span style={{ textDecoration: 'line-through' }}>{c.from}</span>
                    <span aria-hidden> → </span>
                    <span style={{ color: 'var(--fg)' }}>{c.to}</span>
                  </div>
                ))}
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="disp-tight"
                  style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
                >
                  {stamp(r.event.at)}
                </div>
                <div
                  className="disp-tight"
                  style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)', opacity: 0.7 }}
                >
                  #{r.event.seq}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
