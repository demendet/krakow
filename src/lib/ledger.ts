import { applyPatch } from './replay'
import { GLYPH, formatMoney, splitShort } from './money'
import type { Event, Expense, Settlement } from './types'

export type Change = { key: string; from: string; to: string }

export type LedgerRow = {
  event: Event
  /** headline for the row */
  title: string
  /** dim second line */
  detail: string
  changes: Change[]
  /** the entry was later retracted */
  struck: boolean
  tone: 'add' | 'edit' | 'delete' | 'settle'
}

function describeExpense(x: Expense) {
  const who = x.paidBy === 'mattis' ? 'you' : 'Mikko'
  return `${formatMoney(x.amount, x.currency, x.amount % 1 ? 2 : 0)} · ${who} · ${splitShort(x.split, x.customShare)}`
}

function label(x: Expense) {
  return x.note || x.category || 'Expense'
}

const FIELD: Record<string, string> = {
  amount: 'amount',
  currency: 'currency',
  paidBy: 'paid by',
  split: 'split',
  customShare: 'share',
  note: 'note',
  category: 'category',
  spentAt: 'when',
  amountInBase: 'in kr',
  rateToBase: 'rate',
  rateDate: 'rate date',
}

function show(key: string, value: unknown, x?: Expense): string {
  if (value === undefined || value === null || value === '') return '—'
  switch (key) {
    case 'amount':
      return `${String(value).replace('.', ',')} ${x ? GLYPH[x.currency] : ''}`.trim()
    case 'amountInBase':
      return `${String(value).replace('.', ',')} kr`
    case 'paidBy':
      return value === 'mattis' ? 'you' : 'Mikko'
    case 'customShare':
      return `${Math.round(Number(value) * 100)}%`
    case 'spentAt':
      return new Date(String(value)).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    case 'rateToBase':
      return Number(value).toFixed(4)
    default:
      return String(value)
  }
}

/**
 * The log screen replays the same events the balance does, but keeps the
 * intermediate states so an edit can say what it changed and what it changed
 * it from. This is the screen you open when a number looks wrong.
 */
export function buildLedger(events: Event[]): LedgerRow[] {
  const ordered = [...events].sort((a, b) => a.seq - b.seq)
  const state = new Map<string, Expense>()
  const settles = new Map<string, Settlement>()
  const deletedExpense = new Set<string>()
  const deletedSettlement = new Set<string>()

  for (const e of ordered) {
    if (e.type === 'expense_deleted') deletedExpense.add(e.targetId)
    if (e.type === 'settlement_deleted') deletedSettlement.add(e.targetId)
  }

  const rows: LedgerRow[] = []

  for (const e of ordered) {
    switch (e.type) {
      case 'expense_added': {
        state.set(e.payload.id, e.payload)
        rows.push({
          event: e,
          title: label(e.payload),
          detail: describeExpense(e.payload),
          changes: [],
          struck: deletedExpense.has(e.payload.id),
          tone: 'add',
        })
        break
      }
      case 'expense_edited': {
        const before = state.get(e.targetId)
        const changes: Change[] = []
        if (before) {
          const after = applyPatch(before, e.payload)
          for (const [k, v] of Object.entries(e.payload)) {
            if (k === 'id') continue
            const prev = (before as unknown as Record<string, unknown>)[k]
            if (prev === v || (v === null && prev === undefined)) continue
            changes.push({
              key: FIELD[k] ?? k,
              from: show(k, prev, before),
              to: show(k, v ?? undefined, after),
            })
          }
          state.set(e.targetId, after)
        }
        rows.push({
          event: e,
          title: `Edited ${before ? label(before) : 'an expense'}`,
          detail: changes.length ? '' : 'no effective change',
          changes,
          struck: deletedExpense.has(e.targetId),
          tone: 'edit',
        })
        break
      }
      case 'expense_deleted': {
        const before = state.get(e.targetId)
        rows.push({
          event: e,
          title: `Deleted ${before ? label(before) : 'an expense'}`,
          detail: before ? describeExpense(before) : '',
          changes: [],
          struck: true,
          tone: 'delete',
        })
        break
      }
      case 'settlement_added': {
        settles.set(e.payload.id, e.payload)
        const s = e.payload
        rows.push({
          event: e,
          title: s.from === 'mikko' ? 'Mikko paid you back' : 'You paid Mikko back',
          detail: `${formatMoney(s.amount, s.currency, s.amount % 1 ? 2 : 0)}${s.note ? ` · ${s.note}` : ''}`,
          changes: [],
          struck: deletedSettlement.has(s.id),
          tone: 'settle',
        })
        break
      }
      case 'settlement_deleted': {
        const s = settles.get(e.targetId)
        rows.push({
          event: e,
          title: 'Deleted a settlement',
          detail: s ? formatMoney(s.amount, s.currency, 0) : '',
          changes: [],
          struck: true,
          tone: 'delete',
        })
        break
      }
    }
  }

  return rows.reverse()
}
