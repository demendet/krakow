import type { Currency } from './types'
import { BASE } from './types'

/**
 * Frankfurter serves ECB reference rates. One fixing per business day around
 * 16:00 CET — weekends and holidays return the last published day, which is
 * correct and not worth surfacing as a warning.
 *
 * One request, EUR-based, gives every cross rate we need.
 */
const ENDPOINT = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=NOK,PLN'
const CACHE_KEY = 'krakow.fx.v1'

export type RateTable = {
  /** currency -> rate into BASE (NOK) */
  toBase: Record<Currency, number>
  /** ECB fixing date, YYYY-MM-DD */
  date: string
  /** when we fetched it */
  fetchedAt: string
}

/** Last-resort numbers so a cold, offline first launch still logs an expense. */
const SEED_TABLE: RateTable = {
  toBase: { NOK: 1, PLN: 2.5533, EUR: 10.975 },
  date: '2026-08-07',
  fetchedAt: '1970-01-01T00:00:00.000Z',
}

function readCache(): RateTable | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RateTable
    if (!parsed?.toBase?.PLN) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(table: RateTable) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(table))
  } catch {
    /* private mode, quota — not worth failing over */
  }
}

let current: RateTable = readCache() ?? SEED_TABLE
/** true when `current` came from cache/seed rather than a successful fetch this session */
let currentIsFresh = false
let inflight: Promise<RateTable> | null = null

const listeners = new Set<(t: RateTable) => void>()

export function onRates(fn: (t: RateTable) => void) {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}

export function getRates(): RateTable {
  return current
}

export function ratesAreFresh() {
  return currentIsFresh
}

function sameDay(iso: string) {
  return iso.slice(0, 10) === new Date().toISOString().slice(0, 10)
}

/**
 * Snapshot of the rate to use for an expense entered right now.
 * Never blocks: if we have nothing fresh, we return the cached rate and mark
 * it estimated so it can be corrected later.
 */
export function snapshotRate(currency: Currency): {
  rateToBase: number
  rateDate: string
  rateEstimated: boolean
} {
  if (currency === BASE) {
    return { rateToBase: 1, rateDate: current.date, rateEstimated: false }
  }
  return {
    rateToBase: current.toBase[currency],
    rateDate: current.date,
    rateEstimated: !currentIsFresh && !sameDay(current.fetchedAt),
  }
}

export function convertToBase(amount: number, rateToBase: number) {
  return Math.round((amount * rateToBase + Number.EPSILON) * 100) / 100
}

export async function refreshRates(): Promise<RateTable> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' })
      if (!res.ok) throw new Error(`frankfurter ${res.status}`)
      const json = (await res.json()) as {
        date: string
        rates: Record<string, number>
      }
      const nokPerEur = json.rates.NOK
      const plnPerEur = json.rates.PLN
      if (!nokPerEur || !plnPerEur) throw new Error('frankfurter: missing rates')
      const table: RateTable = {
        toBase: {
          NOK: 1,
          PLN: nokPerEur / plnPerEur,
          EUR: nokPerEur,
        },
        date: json.date,
        fetchedAt: new Date().toISOString(),
      }
      current = table
      currentIsFresh = true
      writeCache(table)
      for (const fn of listeners) fn(table)
      return table
    } catch {
      // Offline or ECB hiccup. Keep whatever we had; logging must never block.
      return current
    } finally {
      inflight = null
    }
  })()
  return inflight
}
