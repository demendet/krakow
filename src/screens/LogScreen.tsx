import { useCallback, useEffect, useState } from 'react'
import { Balance } from '../components/Balance'
import { Chip } from '../components/Chip'
import { Keypad } from '../components/Keypad'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { toLocalInput } from '../lib/dates'
import { convertToBase, snapshotRate } from '../lib/fx'
import { haptic } from '../lib/haptics'
import { newId } from '../lib/ids'
import { GLYPH, formatBase, formatMoney, splitShort } from '../lib/money'
import { useStore } from '../lib/store'
import { CATEGORIES, type Currency, type Expense, type Person, type Split } from '../lib/types'
import { HistoryScreen } from './HistoryScreen'

const CURRENCIES: Currency[] = ['PLN', 'NOK', 'EUR']
const CUR_TONE: Record<Currency, string> = {
  PLN: 'var(--pln)',
  NOK: 'var(--nok)',
  EUR: 'var(--eur)',
}
const QUICK: Record<Currency, number[]> = {
  PLN: [20, 50, 60, 100],
  NOK: [50, 100, 200, 500],
  EUR: [5, 10, 20, 50],
}

const SPLITS: { id: Split; label: string }[] = [
  { id: 'even', label: '50/50' },
  { id: 'full_mattis', label: 'All mine' },
  { id: 'full_mikko', label: 'All Mikko' },
]

function parseAmount(s: string) {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function LogScreen({ onOpenBalance }: { onOpenBalance: () => void }) {
  const { d, append } = useStore()
  const toast = useToast()

  const [raw, setRaw] = useState('')
  const [currency, setCurrency] = useState<Currency>('PLN')
  const [split, setSplit] = useState<Split>('even')
  const [customShare, setCustomShare] = useState(0.5)
  const [category, setCategory] = useState<string | undefined>()
  const [note, setNote] = useState('')
  const [when, setWhen] = useState<string | null>(null)
  const [more, setMore] = useState(false)

  const amount = parseAmount(raw)
  // Read on every render rather than memoised: when the day's fixing lands the
  // store re-renders us, and the expense must carry the fresh rate.
  const rate = snapshotRate(currency)
  const inBase = convertToBase(amount, rate.rateToBase)

  // A hardware keyboard should work too — this opens on a laptop as well.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (more) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (/^[0-9]$/.test(e.key)) setRaw((r) => appendDigit(r, e.key))
      else if (e.key === ',' || e.key === '.') setRaw((r) => appendDecimal(r))
      else if (e.key === 'Backspace') setRaw((r) => r.slice(0, -1))
      else if (e.key === 'Escape') setRaw('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [more])

  const reset = useCallback(() => {
    setRaw('')
    setSplit('even')
    setCustomShare(0.5)
    setCategory(undefined)
    setNote('')
    setWhen(null)
  }, [])

  const save = (paidBy: Person) => {
    if (amount <= 0) {
      haptic.undo()
      toast({ text: 'Type an amount first', duration: 2200, tone: 'bad' })
      return
    }
    const expense: Expense = {
      id: newId(),
      paidBy,
      amount,
      currency,
      rateToBase: rate.rateToBase,
      amountInBase: inBase,
      rateDate: rate.rateDate,
      split,
      spentAt: when ?? new Date().toISOString(),
      ...(split === 'custom' ? { customShare } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(category ? { category } : {}),
      ...(rate.rateEstimated ? { rateEstimated: true } : {}),
    }
    append({ type: 'expense_added', payload: expense })
    haptic.save()

    const who = paidBy === 'mattis' ? 'You' : 'Mikko'
    toast({
      text: `${who} paid ${formatMoney(amount, currency, amount % 1 ? 2 : 0)} · ${splitShort(split, customShare)}`,
      action: {
        label: 'Undo',
        run: () => append({ type: 'expense_deleted', targetId: expense.id }),
      },
    })
    reset()
  }

  const hasAmount = amount > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-6 lg:p-6">
      {/* entry column ---------------------------------------------------- */}
      <div className="flex min-h-0 flex-1 flex-col lg:w-[23rem] lg:flex-none">
      <div className="shrink-0 px-4 pt-2 pb-2 lg:hidden">
        <Balance balance={d.balance} size="compact" onClick={onOpenBalance} />
      </div>

      <div className="mosaic mx-4 lg:hidden" aria-hidden />

      {/* amount ---------------------------------------------------------- */}
      <div className="shrink-0 px-4 pt-2">
        <div
          className={`disp truncate ${hasAmount ? '' : 'caret'}`}
          style={{
            fontSize: 'clamp(2.5rem, 6.6vh, 3.5rem)',
            fontWeight: 700,
            lineHeight: 1,
            color: hasAmount ? 'var(--fg)' : 'var(--fg-dim)',
          }}
          aria-label={`Amount ${raw || 0} ${currency}`}
        >
          {raw || '0'}
          <span style={{ color: CUR_TONE[currency], marginLeft: '.1em', fontSize: '.5em' }}>
            {GLYPH[currency]}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          {CURRENCIES.map((c) => (
            <Chip
              key={c}
              small
              tone={CUR_TONE[c]}
              active={currency === c}
              onClick={() => {
                haptic.tap()
                setCurrency(c)
              }}
            >
              {c}
            </Chip>
          ))}
          <span
            className="disp-tight ml-auto truncate pl-2"
            style={{ fontSize: 'var(--text-small)', color: 'var(--fg-dim)' }}
          >
            {currency !== 'NOK' && hasAmount ? `≈ ${formatBase(inBase)}` : ''}
            {rate.rateEstimated && hasAmount && currency !== 'NOK' ? ' · old rate' : ''}
          </span>
        </div>
      </div>

      {/* quick amounts --------------------------------------------------- */}
      <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pt-2.5">
        {QUICK[currency].map((q) => (
          <Chip
            key={q}
            tone={CUR_TONE[currency]}
            onClick={() => {
              haptic.tap()
              setRaw(String(q))
            }}
          >
            {q} {GLYPH[currency]}
          </Chip>
        ))}
      </div>

      <div className="min-h-0 flex-1" />

      {/* keypad ---------------------------------------------------------- */}
      <div className="shrink-0 px-4 pt-2.5">
        <Keypad
          onDigit={(dg) => setRaw((r) => appendDigit(r, dg))}
          onDecimal={() => setRaw(appendDecimal)}
          onBackspace={() => setRaw((r) => r.slice(0, -1))}
          onClear={() => setRaw('')}
        />
      </div>

      {/* split ----------------------------------------------------------- */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto px-4 pt-2.5">
        {SPLITS.map((s) => (
          <Chip
            key={s.id}
            small
            active={split === s.id}
            onClick={() => {
              haptic.tap()
              setSplit(s.id)
            }}
          >
            {s.label}
          </Chip>
        ))}
        <Chip
          small
          active={split === 'custom' || !!category || !!note || !!when}
          onClick={() => {
            haptic.tap()
            setMore(true)
          }}
        >
          {split === 'custom'
            ? `${Math.round(customShare * 100)}/${100 - Math.round(customShare * 100)}`
            : category
              ? category
              : 'More…'}
        </Chip>
      </div>

      {/* who paid -------------------------------------------------------- */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 px-4 pt-2.5" style={{ paddingBottom: 10 }}>
        <PayerButton label="I paid" tone="var(--accent-owed)" onClick={() => save('mattis')} />
        <PayerButton label="Mikko paid" tone="var(--accent-owing)" onClick={() => save('mikko')} />
      </div>
      <p
        className="hidden shrink-0 px-4 pb-1 lg:block"
        style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
      >
        Number keys, comma and backspace work too.
      </p>
      </div>

      {/* on a laptop there is room to show the number and the run of
          expenses next to the keypad instead of a screen away */}
      <aside
        className="hidden min-h-0 flex-1 flex-col lg:flex"
        style={{ borderLeft: '1px solid var(--line)' }}
      >
        <div className="shrink-0 px-6 pt-2 pb-5">
          <Balance balance={d.balance} onClick={onOpenBalance} />
        </div>
        <div className="mosaic mx-6 shrink-0" aria-hidden />
        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <HistoryScreen />
        </div>
      </aside>

      <Sheet open={more} onClose={() => setMore(false)} title="Details">
        <div className="space-y-5 pb-2">
          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  small
                  active={category === c}
                  onClick={() => setCategory((prev) => (prev === c ? undefined : c))}
                >
                  {c}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Note">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Taxi from Kazimierz"
              className="w-full rounded-lg px-3 py-2.5"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                fontSize: 'var(--text-body)',
              }}
            />
          </Field>

          <Field label={`Custom split — you keep ${Math.round(customShare * 100)}%`}>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(customShare * 100)}
                onChange={(e) => {
                  setCustomShare(Number(e.target.value) / 100)
                  setSplit('custom')
                }}
                className="w-full"
                style={{ accentColor: 'var(--accent-owed)' }}
                aria-label="Payer's share"
              />
              {split === 'custom' && (
                <button
                  type="button"
                  className="label shrink-0"
                  onClick={() => {
                    setSplit('even')
                    setCustomShare(0.5)
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </Field>

          <Field label="When">
            <input
              type="datetime-local"
              value={toLocalInput(when ?? new Date().toISOString())}
              onChange={(e) =>
                setWhen(e.target.value ? new Date(e.target.value).toISOString() : null)
              }
              className="w-full rounded-lg px-3 py-2.5"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                fontSize: 'var(--text-body)',
              }}
            />
          </Field>
        </div>
      </Sheet>
    </div>
  )
}

function PayerButton({
  label,
  tone,
  onClick,
}: {
  label: string
  tone: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="key disp flex items-center justify-center"
      style={{
        height: 'clamp(60px, 9vh, 70px)',
        fontSize: 'var(--text-lead)',
        fontWeight: 700,
        letterSpacing: '0.005em',
        color: 'var(--bg)',
        background: tone,
        borderColor: tone,
      }}
    >
      {label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-2">{label}</div>
      {children}
    </div>
  )
}

function appendDigit(r: string, dg: string) {
  if (r === '0') return dg
  const [, dec] = r.split(',')
  if (dec !== undefined && dec.length >= 2) return r
  if (r.replace(',', '').length >= 9) return r
  return r + dg
}

function appendDecimal(r: string) {
  if (r.includes(',')) return r
  return (r || '0') + ','
}

