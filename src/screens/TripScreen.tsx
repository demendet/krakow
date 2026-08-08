import { useState } from 'react'
import { Balance, balanceSentence } from '../components/Balance'
import { Chip } from '../components/Chip'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { convertToBase, snapshotRate } from '../lib/fx'
import { haptic } from '../lib/haptics'
import { newId } from '../lib/ids'
import { GLYPH, formatBase, formatMoney } from '../lib/money'
import { useStore } from '../lib/store'
import type { Currency, Settlement } from '../lib/types'

const CURRENCIES: Currency[] = ['NOK', 'PLN', 'EUR']

export function TripScreen({ onCategories }: { onCategories: () => void }) {
  const { d } = useStore()
  const [settling, setSettling] = useState(false)
  const { tone } = balanceSentence(d.balance)
  const settled = Math.round(d.balance) === 0

  return (
    <div className="px-4 pb-8">
      <div className="pt-6">
        <Balance balance={d.balance} />
      </div>

      <button
        type="button"
        onClick={() => {
          haptic.tap()
          setSettling(true)
        }}
        className="key disp mt-5 flex w-full items-center justify-center"
        style={{
          height: 56,
          fontWeight: 700,
          fontSize: 'var(--text-body)',
          letterSpacing: '.02em',
          color: settled ? 'var(--fg-dim)' : 'var(--bg)',
          background: settled ? 'transparent' : `var(--accent-${tone === 'owing' ? 'owing' : 'owed'})`,
          borderColor: settled ? 'var(--line)' : 'transparent',
        }}
      >
        Settle up
      </button>

      <div className="mosaic my-6" aria-hidden />

      <h2 className="label mb-3">What the trip cost</h2>
      <div
        className="disp"
        style={{ fontSize: 'var(--text-figure)', fontWeight: 700, lineHeight: 1 }}
      >
        {formatBase(d.total)}
      </div>
      <p className="mt-1" style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-small)' }}>
        {d.expenses.length} expense{d.expenses.length === 1 ? '' : 's'}, settlements excluded
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <PersonCard
          name="You"
          paid={d.paid.mattis}
          burden={d.burden.mattis}
          tone="var(--accent-owed)"
        />
        <PersonCard
          name="Mikko"
          paid={d.paid.mikko}
          burden={d.burden.mikko}
          tone="var(--accent-owing)"
        />
      </div>

      <button
        type="button"
        onClick={onCategories}
        className="key mt-3 flex w-full items-center justify-between px-4 py-4"
      >
        <span style={{ fontWeight: 500 }}>Where it went</span>
        <span className="disp" style={{ color: 'var(--fg-dim)' }}>
          →
        </span>
      </button>

      {settling && <SettleSheet onClose={() => setSettling(false)} />}
    </div>
  )
}

function PersonCard({
  name,
  paid,
  burden,
  tone,
}: {
  name: string
  paid: number
  burden: number
  tone: string
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="label" style={{ color: tone }}>
        {name}
      </div>
      <div className="disp mt-1" style={{ fontSize: 'var(--text-title)', fontWeight: 700 }}>
        {formatBase(burden)}
      </div>
      <div style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}>
        share of the trip
      </div>
      <div
        className="disp-tight mt-3"
        style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}
      >
        laid out {formatBase(paid)}
      </div>
    </div>
  )
}

function SettleSheet({ onClose }: { onClose: () => void }) {
  const { d, append } = useStore()
  const toast = useToast()
  const owed = Math.abs(Math.round(d.balance))
  const mikkoOwes = d.balance > 0

  const [amount, setAmount] = useState(String(owed))
  const [currency, setCurrency] = useState<Currency>('NOK')
  const [note, setNote] = useState('Vipps')

  const parsed = Number(amount.replace(',', '.')) || 0
  const rate = snapshotRate(currency)
  const inBase = convertToBase(parsed, rate.rateToBase)

  const commit = () => {
    if (parsed <= 0) return
    const s: Settlement = {
      id: newId(),
      from: mikkoOwes ? 'mikko' : 'mattis',
      to: mikkoOwes ? 'mattis' : 'mikko',
      amount: parsed,
      currency,
      rateToBase: rate.rateToBase,
      amountInBase: inBase,
      rateDate: rate.rateDate,
      settledAt: new Date().toISOString(),
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    append({ type: 'settlement_added', payload: s })
    haptic.save()
    toast({
      text: `${mikkoOwes ? 'Mikko paid you' : 'You paid Mikko'} ${formatMoney(parsed, currency, 0)}`,
      action: {
        label: 'Undo',
        run: () => append({ type: 'settlement_deleted', targetId: s.id }),
      },
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={mikkoOwes ? 'Mikko pays you back' : 'You pay Mikko back'}>
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
            aria-label="Settlement amount"
          />
          <div className="flex flex-col gap-1.5">
            {CURRENCIES.map((c) => (
              <Chip key={c} small active={currency === c} onClick={() => setCurrency(c)}>
                {GLYPH[c]}
              </Chip>
            ))}
          </div>
        </div>

        {currency !== 'NOK' && (
          <div className="disp-tight -mt-3" style={{ fontSize: 'var(--text-small)', color: 'var(--fg-dim)' }}>
            ≈ {formatBase(inBase)}
          </div>
        )}

        <div className="flex gap-2">
          <Chip small onClick={() => { setCurrency('NOK'); setAmount(String(owed)) }}>
            All of it — {formatBase(owed)}
          </Chip>
          <Chip small onClick={() => { setCurrency('NOK'); setAmount(String(Math.round(owed / 2))) }}>
            Half
          </Chip>
        </div>

        <div>
          <div className="label mb-2">How</div>
          <div className="flex gap-2">
            {['Vipps', 'Cash', 'Revolut'].map((m) => (
              <Chip key={m} small active={note === m} onClick={() => setNote(m)}>
                {m}
              </Chip>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={commit}
          className="key disp flex w-full items-center justify-center"
          style={{
            height: 60,
            fontWeight: 700,
            fontSize: 'var(--text-lead)',
            color: 'var(--bg)',
            background: 'var(--accent-owed)',
            borderColor: 'var(--accent-owed)',
          }}
        >
          Record it
        </button>
      </div>
    </Sheet>
  )
}
