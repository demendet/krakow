export type Currency = 'PLN' | 'NOK' | 'EUR'
export type Person = 'mattis' | 'mikko'
export type Split = 'even' | 'full_mattis' | 'full_mikko' | 'custom'

export const BASE: Currency = 'NOK'

export type Expense = {
  id: string
  paidBy: Person
  /** in the currency actually spent */
  amount: number
  currency: Currency
  /** FX rate to BASE, snapshotted at entry time */
  rateToBase: number
  /** computed and stored at entry time */
  amountInBase: number
  split: Split
  /** payer's own fraction, 0–1. only when split === 'custom' */
  customShare?: number
  note?: string
  category?: string
  /** ISO, defaults to now, editable */
  spentAt: string
  /** true when the rate came from a stale cache because the network was down */
  rateEstimated?: boolean
  /** ECB fixing date the rate came from */
  rateDate?: string
}

export type Settlement = {
  id: string
  from: Person
  to: Person
  amount: number
  currency: Currency
  rateToBase: number
  amountInBase: number
  note?: string
  settledAt: string
  rateEstimated?: boolean
  rateDate?: string
}

type Base = { id: string; at: string; seq: number }

/**
 * `null` means "clear this field". Firestore refuses to store `undefined`, so
 * an explicit erasure has to travel as a value rather than as an absence.
 */
export type ExpensePatch = { [K in keyof Expense]?: Expense[K] | null }

export type Event =
  | (Base & { type: 'expense_added'; payload: Expense })
  | (Base & { type: 'expense_edited'; targetId: string; payload: ExpensePatch })
  | (Base & { type: 'expense_deleted'; targetId: string })
  | (Base & { type: 'settlement_added'; payload: Settlement })
  | (Base & { type: 'settlement_deleted'; targetId: string })

export type EventType = Event['type']

/** Omit across a union member by member — a plain Omit would collapse Event to its common keys. */
export type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

type Draft<T> = T extends unknown ? Omit<T, 'seq' | 'id' | 'at'> & { at?: string } : never

/** What a caller hands to `append`: the body of an event, without its identity. */
export type EventDraft = Draft<Event>

export const PEOPLE: Record<Person, string> = {
  mattis: 'Me',
  mikko: 'Mikko',
}

export const OTHER: Record<Person, Person> = {
  mattis: 'mikko',
  mikko: 'mattis',
}

export const CATEGORIES = [
  'Food',
  'Drinks',
  'Transport',
  'Stay',
  'Tickets',
  'Shop',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
