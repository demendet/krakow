import type { DistributiveOmit, Event, Expense, Settlement } from './types'
import { newId } from './ids'

/**
 * Enough of a trip to judge the UI without typing: a couple of days in Kraków,
 * one hotel Mikko fronted, one custom split, one edit, one retraction, one
 * Vipps transfer.
 */
const PLN = 2.5533
const EUR = 10.975

type Draft = Omit<Expense, 'id' | 'rateToBase' | 'amountInBase'> & {
  rate?: number
}

const DRAFTS: Draft[] = [
  { paidBy: 'mikko', amount: 1180, currency: 'PLN', split: 'even', category: 'Stay', note: 'Apartment, 3 nights', spentAt: dayAt(-3, 15, 10) },
  { paidBy: 'mattis', amount: 74, currency: 'PLN', split: 'even', category: 'Transport', note: 'Airport train', spentAt: dayAt(-3, 16, 40) },
  { paidBy: 'mattis', amount: 168, currency: 'PLN', split: 'even', category: 'Food', note: 'Pierogi + żurek', spentAt: dayAt(-3, 20, 15) },
  { paidBy: 'mikko', amount: 96, currency: 'PLN', split: 'even', category: 'Drinks', note: 'Kazimierz', spentAt: dayAt(-3, 23, 5) },
  { paidBy: 'mattis', amount: 60, currency: 'PLN', split: 'even', category: 'Transport', note: 'Taxi home', spentAt: dayAt(-2, 1, 42) },
  { paidBy: 'mattis', amount: 132, currency: 'PLN', split: 'even', category: 'Tickets', note: 'Wawel castle', spentAt: dayAt(-2, 12, 0) },
  { paidBy: 'mikko', amount: 45, currency: 'PLN', split: 'full_mikko', category: 'Shop', note: 'Socks, forgot to pack', spentAt: dayAt(-2, 14, 20) },
  { paidBy: 'mattis', amount: 240, currency: 'PLN', split: 'even', category: 'Food', note: 'Dinner, Plac Nowy', spentAt: dayAt(-2, 19, 30) },
  { paidBy: 'mikko', amount: 310, currency: 'PLN', split: 'custom', customShare: 0.7, category: 'Drinks', note: 'Bar tab — he drank more', spentAt: dayAt(-2, 23, 50) },
  { paidBy: 'mattis', amount: 22, currency: 'EUR', split: 'even', category: 'Tickets', note: 'Salt mine, booked online', spentAt: dayAt(-1, 9, 0) },
  { paidBy: 'mattis', amount: 34, currency: 'PLN', split: 'even', category: 'Food', note: 'Zapiekanka', spentAt: dayAt(-1, 13, 15) },
  { paidBy: 'mikko', amount: 88, currency: 'PLN', split: 'even', category: 'Drinks', note: 'Vodka flight', spentAt: dayAt(-1, 22, 10) },
]

function dayAt(dayOffset: number, h: number, m: number) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function seedEvents(): Event[] {
  const out: Event[] = []
  let seq = 1
  const push = (e: DistributiveOmit<Event, 'seq'>) => {
    out.push({ ...e, seq: seq++ } as Event)
  }

  const ids: string[] = []
  for (const d of DRAFTS) {
    const rate = d.currency === 'PLN' ? PLN : d.currency === 'EUR' ? EUR : 1
    const id = newId()
    ids.push(id)
    const expense: Expense = {
      ...d,
      id,
      rateToBase: rate,
      amountInBase: Math.round(d.amount * rate * 100) / 100,
      rateDate: d.spentAt.slice(0, 10),
    }
    push({ type: 'expense_added', id: newId(), at: d.spentAt, payload: expense })
  }

  // one correction and one retraction, so the log screen has something to show
  push({
    type: 'expense_edited',
    id: newId(),
    at: dayAt(-1, 13, 40),
    targetId: ids[10],
    payload: {
      amount: 51,
      amountInBase: Math.round(51 * PLN * 100) / 100,
      note: 'Zapiekanka ×2',
    },
  })

  const strayId = newId()
  push({
    type: 'expense_added',
    id: newId(),
    at: dayAt(-1, 22, 12),
    payload: {
      id: strayId,
      paidBy: 'mattis',
      amount: 880,
      currency: 'PLN',
      rateToBase: PLN,
      amountInBase: Math.round(880 * PLN * 100) / 100,
      split: 'even',
      note: 'fat thumb',
      spentAt: dayAt(-1, 22, 12),
    },
  })
  push({ type: 'expense_deleted', id: newId(), at: dayAt(-1, 22, 13), targetId: strayId })

  const settlement: Settlement = {
    id: newId(),
    from: 'mattis',
    to: 'mikko',
    amount: 400,
    currency: 'NOK',
    rateToBase: 1,
    amountInBase: 400,
    note: 'Vipps',
    settledAt: dayAt(-1, 23, 59),
  }
  push({ type: 'settlement_added', id: newId(), at: settlement.settledAt, payload: settlement })

  return out
}
