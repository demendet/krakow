import type { Event } from './types'

export type Backup = {
  app: 'krakow-ledger'
  version: 1
  exportedAt: string
  events: Event[]
}

const VALID = new Set([
  'expense_added',
  'expense_edited',
  'expense_deleted',
  'settlement_added',
  'settlement_deleted',
])

export function toBackup(events: Event[]): Backup {
  return {
    app: 'krakow-ledger',
    version: 1,
    exportedAt: new Date().toISOString(),
    events: [...events].sort((a, b) => a.seq - b.seq),
  }
}

export function serialise(events: Event[]) {
  return JSON.stringify(toBackup(events), null, 2)
}

export function filename() {
  return `krakow-ledger-${new Date().toISOString().slice(0, 10)}.json`
}

export function download(events: Event[]) {
  const blob = new Blob([serialise(events)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyToClipboard(events: Event[]) {
  const text = serialise(events)
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Safari and locked-down webviews refuse the async API outside a gesture.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

/** Throws with a readable message rather than returning null — the caller shows it. */
export function parseBackup(text: string): Event[] {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error("That file isn't JSON.")
  }
  const events = Array.isArray(json)
    ? json
    : (json as Backup)?.events && Array.isArray((json as Backup).events)
      ? (json as Backup).events
      : null
  if (!events) throw new Error("No event list in that file — it isn't a ledger export.")

  const clean = events.filter(
    (e): e is Event =>
      !!e &&
      typeof e === 'object' &&
      VALID.has((e as Event).type) &&
      typeof (e as Event).seq === 'number',
  )
  if (clean.length === 0) throw new Error('That file has no usable events in it.')
  return clean
}
