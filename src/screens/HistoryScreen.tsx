import { useMemo, useState } from 'react'
import { EditExpense } from '../components/EditExpense'
import { SwipeRow } from '../components/SwipeRow'
import { useToast } from '../components/Toast'
import { GLYPH, formatBase, formatMoney, splitShort } from '../lib/money'
import { useStore } from '../lib/store'
import type { Expense, Settlement } from '../lib/types'

type Item =
  | { kind: 'expense'; at: string; x: Expense }
  | { kind: 'settlement'; at: string; s: Settlement }

export function HistoryScreen() {
  const { d, append } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<Expense | null>(null)

  const days = useMemo(() => {
    const items: Item[] = [
      ...d.expenses.map((x) => ({ kind: 'expense' as const, at: x.spentAt, x })),
      ...d.settlements.map((s) => ({ kind: 'settlement' as const, at: s.settledAt, s })),
    ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

    const map = new Map<string, Item[]>()
    for (const it of items) {
      const key = it.at.slice(0, 10)
      const arr = map.get(key)
      if (arr) arr.push(it)
      else map.set(key, [it])
    }
    return [...map.entries()]
  }, [d.expenses, d.settlements])

  const removeExpense = (x: Expense) => {
    append({ type: 'expense_deleted', targetId: x.id })
    toast({
      text: `Deleted ${formatMoney(x.amount, x.currency, x.amount % 1 ? 2 : 0)}`,
      action: { label: 'Undo', run: () => append({ type: 'expense_added', payload: x }) },
    })
  }

  if (days.length === 0) {
    return (
      <Empty
        title="Nothing logged yet"
        body="Everything you and Mikko spend shows up here, newest first."
      />
    )
  }

  return (
    <div className="px-4 pb-6">
      {days.map(([day, items]) => {
        const dayTotal = items.reduce(
          (t, it) => t + (it.kind === 'expense' ? it.x.amountInBase : 0),
          0,
        )
        return (
          <section key={day} className="pt-5">
            <header className="mb-2 flex items-baseline justify-between">
              <h2 className="label">{dayLabel(day)}</h2>
              <span
                className="disp-tight"
                style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
              >
                {formatBase(dayTotal)}
              </span>
            </header>
            <div className="mosaic mb-1" aria-hidden />
            {items.map((it) =>
              it.kind === 'expense' ? (
                <SwipeRow
                  key={it.x.id}
                  onDelete={() => removeExpense(it.x)}
                  onTap={() => setEditing(it.x)}
                >
                  <ExpenseRow x={it.x} />
                </SwipeRow>
              ) : (
                <SettlementRow
                  key={it.s.id}
                  s={it.s}
                  onDelete={() => {
                    append({ type: 'settlement_deleted', targetId: it.s.id })
                    toast({
                      text: 'Settlement removed',
                      action: {
                        label: 'Undo',
                        run: () => append({ type: 'settlement_added', payload: it.s }),
                      },
                    })
                  }}
                />
              ),
            )}
          </section>
        )
      })}

      <EditExpense
        expense={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) =>
          editing && append({ type: 'expense_edited', targetId: editing.id, payload: patch })
        }
        onDelete={() => editing && removeExpense(editing)}
      />
    </div>
  )
}

function ExpenseRow({ x }: { x: Expense }) {
  const who = x.paidBy === 'mattis' ? 'You' : 'Mikko'
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ fontWeight: 500 }}>
          {x.note || x.category || 'Expense'}
        </div>
        <div
          className="disp-tight truncate"
          style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)', letterSpacing: '.02em' }}
        >
          {who} paid · {splitShort(x.split, x.customShare)}
          {x.category && x.note ? ` · ${x.category}` : ''}
          {' · '}
          {time(x.spentAt)}
          {x.rateEstimated ? ' · est. rate' : ''}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="disp" style={{ fontWeight: 600, fontSize: 'var(--text-lead)' }}>
          {formatMoney(x.amount, x.currency, x.amount % 1 ? 2 : 0).replace(GLYPH[x.currency], '')}
          <span style={{ color: `var(--${x.currency.toLowerCase()})`, fontSize: '.72em' }}>
            {GLYPH[x.currency]}
          </span>
        </div>
        {x.currency !== 'NOK' && (
          <div
            className="disp-tight"
            style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
          >
            {formatBase(x.amountInBase)}
          </div>
        )}
      </div>
    </div>
  )
}

function SettlementRow({ s, onDelete }: { s: Settlement; onDelete: () => void }) {
  const label = s.from === 'mikko' ? 'Mikko paid you back' : 'You paid Mikko back'
  return (
    <SwipeRow onDelete={onDelete}>
      <div
        className="my-2 flex items-center gap-3 rounded-lg px-3 py-3"
        style={{ border: '1px dashed var(--line)', background: 'var(--surface)' }}
      >
        <span
          aria-hidden
          className="disp"
          style={{ color: 'var(--accent-owed)', fontSize: 'var(--text-lead)' }}
        >
          {s.from === 'mikko' ? '←' : '→'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate" style={{ fontWeight: 500 }}>
            {label}
          </div>
          <div
            className="disp-tight"
            style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
          >
            Settlement{s.note ? ` · ${s.note}` : ''} · {time(s.settledAt)}
          </div>
        </div>
        <div className="disp shrink-0" style={{ fontWeight: 600, fontSize: 'var(--text-lead)' }}>
          {formatMoney(s.amount, s.currency, 0)}
        </div>
      </div>
    </SwipeRow>
  )
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mosaic mb-5 w-16" aria-hidden />
      <h2 className="disp" style={{ fontSize: 'var(--text-title)', fontWeight: 600 }}>
        {title}
      </h2>
      <p className="mt-2 max-w-[22rem]" style={{ color: 'var(--fg-dim)' }}>
        {body}
      </p>
    </div>
  )
}

export function dayLabel(day: string) {
  const today = new Date()
  const d = new Date(`${day}T12:00:00`)
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
