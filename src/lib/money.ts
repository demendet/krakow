import type { Currency, Person, Split } from './types'

export const GLYPH: Record<Currency, string> = {
  PLN: 'zł',
  NOK: 'kr',
  EUR: '€',
}

/** Norwegian convention: thin-space thousands, comma decimal. Reads right in both languages. */
const NBTHIN = ' '

function group(intPart: string) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBTHIN)
}

/** 1234.5 -> "1 234,50". decimals=0 rounds. */
export function formatNumber(value: number, decimals = 2) {
  const neg = value < 0
  const fixed = Math.abs(value).toFixed(decimals)
  const [i, d] = fixed.split('.')
  const out = d ? `${group(i)},${d}` : group(i)
  return neg ? `−${out}` : out
}

/** "60 zł" — glyph trails the number, which is right for both zł and kr. */
export function formatMoney(value: number, currency: Currency, decimals = 2) {
  return `${formatNumber(value, decimals)}${NBTHIN}${GLYPH[currency]}`
}

/** Whole kroner. Nobody cares about øre at 2am. */
export function formatBase(value: number) {
  return `${formatNumber(value, 0)}${NBTHIN}kr`
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * The payer's own share of an expense, as a fraction 0–1.
 * The rest is what the other person owes them.
 */
export function payerShare(split: Split, paidBy: Person, customShare?: number): number {
  switch (split) {
    case 'even':
      return 0.5
    case 'full_mattis':
      // Mattis alone benefits: if Mattis paid he owes it all himself.
      return paidBy === 'mattis' ? 1 : 0
    case 'full_mikko':
      return paidBy === 'mikko' ? 1 : 0
    case 'custom':
      return clamp01(customShare ?? 0.5)
  }
}

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n))
}

export const SPLIT_LABEL: Record<Split, string> = {
  even: 'Split evenly',
  full_mattis: 'All mine',
  full_mikko: "All Mikko's",
  custom: 'Custom split',
}

export function splitShort(split: Split, customShare?: number) {
  if (split === 'custom') return `${Math.round(clamp01(customShare ?? 0.5) * 100)}/${100 - Math.round(clamp01(customShare ?? 0.5) * 100)}`
  if (split === 'even') return '50/50'
  return split === 'full_mattis' ? 'all mine' : 'all Mikko'
}
