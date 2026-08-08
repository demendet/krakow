import { useEffect, useState } from 'react'
import { Chip } from './Chip'
import { Sheet } from './Sheet'
import { toLocalInput } from '../lib/dates'
import { convertToBase, snapshotRate } from '../lib/fx'
import { GLYPH, formatBase } from '../lib/money'
import {
  CATEGORIES,
  type Currency,
  type Expense,
  type ExpensePatch,
  type Person,
  type Split,
} from '../lib/types'

const CURRENCIES: Currency[] = ['PLN', 'NOK', 'EUR']
const SPLITS: { id: Split; label: string }[] = [
  { id: 'even', label: '50/50' },
  { id: 'full_mattis', label: 'All mine' },
  { id: 'full_mikko', label: 'All Mikko' },
  { id: 'custom', label: 'Custom' },
]

export function EditExpense({
  expense,
  onClose,
  onSave,
  onDelete,
}: {
  expense: Expense | null
  onClose: () => void
  onSave: (patch: ExpensePatch) => void
  onDelete: () => void
}) {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('PLN')
  const [paidBy, setPaidBy] = useState<Person>('mattis')
  const [split, setSplit] = useState<Split>('even')
  const [customShare, setCustomShare] = useState(0.5)
  const [note, setNote] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const [spentAt, setSpentAt] = useState('')

  useEffect(() => {
    if (!expense) return
    setAmount(String(expense.amount).replace('.', ','))
    setCurrency(expense.currency)
    setPaidBy(expense.paidBy)
    setSplit(expense.split)
    setCustomShare(expense.customShare ?? 0.5)
    setNote(expense.note ?? '')
    setCategory(expense.category)
    setSpentAt(expense.spentAt)
  }, [expense])

  if (!expense) return null

  const parsed = Number(amount.replace(',', '.')) || 0
  // Only re-snapshot when the currency actually changed; an edit to the note
  // must never silently re-price a historical expense.
  const rate =
    currency === expense.currency
      ? { rateToBase: expense.rateToBase, rateDate: expense.rateDate, rateEstimated: false }
      : snapshotRate(currency)

  const commit = () => {
    const patch: ExpensePatch = {}
    if (parsed > 0 && parsed !== expense.amount) patch.amount = parsed
    if (currency !== expense.currency) {
      patch.currency = currency
      patch.rateToBase = rate.rateToBase
      patch.rateDate = rate.rateDate ?? null
    }
    if (paidBy !== expense.paidBy) patch.paidBy = paidBy
    if (split !== expense.split) patch.split = split
    if (split === 'custom' && customShare !== expense.customShare) patch.customShare = customShare
    if ((note.trim() || undefined) !== expense.note) patch.note = note.trim() || null
    if (category !== expense.category) patch.category = category ?? null
    if (spentAt !== expense.spentAt) patch.spentAt = spentAt

    if (patch.amount != null || patch.rateToBase != null) {
      patch.amountInBase = convertToBase(
        patch.amount ?? expense.amount,
        patch.rateToBase ?? expense.rateToBase,
      )
    }

    if (Object.keys(patch).length) onSave(patch)
    onClose()
  }

  return (
    <Sheet open onClose={commit} title="Edit">
      <div className="space-y-5 pb-2">
        <div className="flex items-end gap-3">
          <input
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            className="disp min-w-0 flex-1 rounded-lg px-3 py-2"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              fontSize: 'var(--text-figure)',
              fontWeight: 700,
            }}
            aria-label="Amount"
          />
          <div className="flex flex-col gap-1.5">
            {CURRENCIES.map((c) => (
              <Chip key={c} small active={currency === c} onClick={() => setCurrency(c)}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
        <div className="disp-tight -mt-3" style={{ fontSize: 'var(--text-small)', color: 'var(--fg-dim)' }}>
          {currency === 'NOK'
            ? `${GLYPH.NOK} is the base currency`
            : `≈ ${formatBase(convertToBase(parsed, rate.rateToBase))} at the rate on this expense`}
        </div>

        <Row label="Paid by">
          <Chip small active={paidBy === 'mattis'} onClick={() => setPaidBy('mattis')}>
            Me
          </Chip>
          <Chip small active={paidBy === 'mikko'} onClick={() => setPaidBy('mikko')}>
            Mikko
          </Chip>
        </Row>

        <Row label="Split">
          {SPLITS.map((s) => (
            <Chip key={s.id} small active={split === s.id} onClick={() => setSplit(s.id)}>
              {s.label}
            </Chip>
          ))}
        </Row>

        {split === 'custom' && (
          <Row label={`Payer keeps ${Math.round(customShare * 100)}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(customShare * 100)}
              onChange={(e) => setCustomShare(Number(e.target.value) / 100)}
              className="w-full"
              style={{ accentColor: 'var(--accent-owed)' }}
              aria-label="Payer's share"
            />
          </Row>
        )}

        <Row label="Category">
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              small
              active={category === c}
              onClick={() => setCategory((p) => (p === c ? undefined : c))}
            >
              {c}
            </Chip>
          ))}
        </Row>

        <div>
          <div className="label mb-2">Note</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-lg px-3 py-2.5"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
          />
        </div>

        <div>
          <div className="label mb-2">When</div>
          <input
            type="datetime-local"
            value={toLocalInput(spentAt)}
            onChange={(e) =>
              setSpentAt(e.target.value ? new Date(e.target.value).toISOString() : spentAt)
            }
            className="w-full rounded-lg px-3 py-2.5"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)' }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            onDelete()
            onClose()
          }}
          className="disp w-full rounded-lg py-3"
          style={{
            border: '1px solid var(--accent-bad)',
            color: 'var(--accent-bad)',
            fontWeight: 600,
          }}
        >
          Delete this
        </button>
      </div>
    </Sheet>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

