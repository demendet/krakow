import { registerSW } from 'virtual:pwa-register'

/**
 * The injected default registration only ever calls register(), so an
 * installed copy kept serving its precached bundle and a deployed fix sat
 * behind it — indistinguishable, from the outside, from the fix not working.
 *
 * So: check for a new worker on a schedule and whenever the app comes back to
 * the foreground, and swap to it while the app is *hidden*. Reloading under
 * someone's thumb mid-entry would throw away the amount they were typing.
 */
export function installUpdater() {
  if (!('serviceWorker' in navigator)) return

  const hadController = Boolean(navigator.serviceWorker.controller)
  let pending = false
  let reloading = false

  const reload = () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // first install of the worker on a fresh visit — nothing stale to replace
    if (!hadController) return
    if (document.visibilityState === 'hidden') reload()
    else pending = true
  })

  document.addEventListener('visibilitychange', () => {
    if (pending && document.visibilityState === 'hidden') reload()
  })

  const update = registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => void registration.update().catch(() => {})
      setInterval(check, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  return update
}
