import type { Event, Expense, ExpensePatch, Person, Settlement } from './types'
import { payerShare, round2 } from './money'

/** A patch merges field by field; `null` erases, and the id is never touched. */
export function applyPatch(prev: Expense, patch: ExpensePatch): Expense {
  const next = { ...prev } as Record<string, unknown>
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'id') continue
    if (v === null) delete next[k]
    else next[k] = v
  }
  return next as Expense
}

export type Derived = {
  expenses: Expense[]
  settlements: Settlement[]
  /** ids that a delete event retired, so the log view can strike them through */
  deletedExpenses: Set<string>
  deletedSettlements: Set<string>
  /** positive = Mikko owes Mattis, in BASE */
  balance: number
  /** what the trip actually cost, in BASE, settlements excluded */
  total: number
  /** what each person is ultimately on the hook for, in BASE */
  burden: Record<Person, number>
  /** what each person laid out up front, in BASE */
  paid: Record<Person, number>
  byCategory: { category: string; total: number }[]
  maxSeq: number
  /** expenses whose rate was a fallback and may want correcting */
  estimatedCount: number
}

const EMPTY: Derived = {
  expenses: [],
  settlements: [],
  deletedExpenses: new Set(),
  deletedSettlements: new Set(),
  balance: 0,
  total: 0,
  burden: { mattis: 0, mikko: 0 },
  paid: { mattis: 0, mikko: 0 },
  byCategory: [],
  maxSeq: 0,
  estimatedCount: 0,
}

/**
 * The whole state of the app is a fold over the event log. A few hundred
 * events replay in well under a frame, so there is nothing to memoise beyond
 * "did the log change".
 */
export function replay(events: Event[]): Derived {
  if (events.length === 0) return EMPTY

  const ordered = [...events].sort((a, b) => a.seq - b.seq)

  const expenses = new Map<string, Expense>()
  const settlements = new Map<string, Settlement>()
  const deletedExpenses = new Set<string>()
  const deletedSettlements = new Set<string>()
  let maxSeq = 0

  for (const e of ordered) {
    maxSeq = Math.max(maxSeq, e.seq)
    switch (e.type) {
      case 'expense_added':
        expenses.set(e.payload.id, e.payload)
        break
      case 'expense_edited': {
        const prev = expenses.get(e.targetId)
        if (prev) expenses.set(e.targetId, applyPatch(prev, e.payload))
        break
      }
      case 'expense_deleted':
        expenses.delete(e.targetId)
        deletedExpenses.add(e.targetId)
        break
      case 'settlement_added':
        settlements.set(e.payload.id, e.payload)
        break
      case 'settlement_deleted':
        settlements.delete(e.targetId)
        deletedSettlements.add(e.targetId)
        break
    }
  }

  const liveExpenses = [...expenses.values()].sort(
    (a, b) => Date.parse(b.spentAt) - Date.parse(a.spentAt),
  )
  const liveSettlements = [...settlements.values()].sort(
    (a, b) => Date.parse(b.settledAt) - Date.parse(a.settledAt),
  )

  let balance = 0
  let total = 0
  let estimatedCount = 0
  const burden: Record<Person, number> = { mattis: 0, mikko: 0 }
  const paid: Record<Person, number> = { mattis: 0, mikko: 0 }
  const cats = new Map<string, number>()

  for (const x of liveExpenses) {
    const mine = payerShare(x.split, x.paidBy, x.customShare)
    const theirs = 1 - mine
    const owed = x.amountInBase * theirs
    balance += x.paidBy === 'mattis' ? owed : -owed

    total += x.amountInBase
    paid[x.paidBy] += x.amountInBase
    burden[x.paidBy] += x.amountInBase * mine
    burden[x.paidBy === 'mattis' ? 'mikko' : 'mattis'] += owed

    if (x.rateEstimated) estimatedCount++

    const key = x.category || 'Other'
    cats.set(key, (cats.get(key) ?? 0) + x.amountInBase)
  }

  for (const s of liveSettlements) {
    // Money moving discharges debt, so it pushes the balance toward zero:
    // Mattis paying Mikko reduces what Mattis owes (balance rises toward 0),
    // Mikko paying Mattis reduces what Mikko owes (balance falls toward 0).
    balance += s.from === 'mattis' ? s.amountInBase : -s.amountInBase
  }

  return {
    expenses: liveExpenses,
    settlements: liveSettlements,
    deletedExpenses,
    deletedSettlements,
    balance: round2(balance),
    total: round2(total),
    burden: { mattis: round2(burden.mattis), mikko: round2(burden.mikko) },
    paid: { mattis: round2(paid.mattis), mikko: round2(paid.mikko) },
    byCategory: [...cats.entries()]
      .map(([category, t]) => ({ category, total: round2(t) }))
      .sort((a, b) => b.total - a.total),
    maxSeq,
    estimatedCount,
  }
}

/** For the log screen: the raw event stream, newest first, with its subject resolved. */
export function eventSubject(
  event: Event,
  events: Event[],
): { expense?: Expense; settlement?: Settlement } {
  const targetId =
    'targetId' in event ? event.targetId : 'payload' in event ? event.payload.id : undefined
  if (!targetId) return {}
  for (const e of events) {
    if (e.type === 'expense_added' && e.payload.id === targetId) return { expense: e.payload }
    if (e.type === 'settlement_added' && e.payload.id === targetId)
      return { settlement: e.payload }
  }
  return {}
}
