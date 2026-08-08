const can = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

function reduced() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export const haptic = {
  tap() {
    if (can() && !reduced()) navigator.vibrate(8)
  },
  save() {
    if (can() && !reduced()) navigator.vibrate([14, 40, 22])
  },
  undo() {
    if (can() && !reduced()) navigator.vibrate([8, 30, 8])
  },
}
