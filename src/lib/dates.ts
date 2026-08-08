const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The day an expense belongs to, in the spender's own timezone.
 *
 * Never slice the ISO string for this. A 01:40 taxi in Kraków is 23:40 the
 * previous day in UTC, so a UTC key files the app's single most common
 * expense under "Yesterday".
 */
export function localDayKey(iso: string | Date) {
  const d = iso instanceof Date ? iso : new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isToday(iso: string) {
  return localDayKey(iso) === localDayKey(new Date())
}

export function dayLabel(dayKey: string) {
  const d = new Date(`${dayKey}T12:00:00`)
  const today = new Date()
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  )
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function time(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function stamp(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Value for an <input type="datetime-local">, which expects local wall time. */
export function toLocalInput(iso: string) {
  const d = new Date(iso)
  return `${localDayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
