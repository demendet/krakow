import { useEffect, useState } from 'react'
import { RateStrip } from './components/RateStrip'
import { ToastHost } from './components/Toast'
import { haptic } from './lib/haptics'
import { useStore } from './lib/store'
import { CategoriesScreen } from './screens/CategoriesScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { LedgerScreen } from './screens/LedgerScreen'
import { LogScreen } from './screens/LogScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { SignInScreen } from './screens/SignInScreen'
import { TripScreen } from './screens/TripScreen'

type Screen = 'add' | 'history' | 'trip' | 'ledger' | 'categories' | 'settings'

type NavItem = { id: Screen; label: string; icon: () => React.JSX.Element }

const TABS: NavItem[] = [
  { id: 'add', label: 'Add', icon: IconAdd },
  { id: 'history', label: 'History', icon: IconList },
  { id: 'trip', label: 'Trip', icon: IconBalance },
  { id: 'ledger', label: 'Log', icon: IconLog },
  { id: 'settings', label: 'More', icon: IconGear },
]

const active = (screen: Screen, id: Screen) =>
  screen === id || (id === 'trip' && screen === 'categories')

export default function App() {
  const { ready, user, mode, configured } = useStore()
  const [screen, setScreen] = useState<Screen>('add')

  const signedOut = configured && mode === 'firestore' && !user

  useEffect(() => {
    if (signedOut) setScreen('add')
  }, [signedOut])

  if (!ready) {
    return (
      <Frame>
        <div className="flex flex-1 items-center justify-center">
          <span className="mosaic w-16" aria-hidden />
        </div>
      </Frame>
    )
  }

  if (signedOut) {
    return (
      <Frame>
        <SignInScreen />
      </Frame>
    )
  }

  const go = (id: Screen) => {
    haptic.tap()
    setScreen(id)
  }

  return (
    <ToastHost>
      <div className="flex h-full flex-col">
        <RateStrip />

        <div className="mx-auto flex min-h-0 w-full max-w-[26rem] flex-1 lg:max-w-[76rem] lg:gap-6 lg:px-6">
          {/* On a laptop the sections become a rail — a bottom bar under a
              1000px-tall window is a phone habit, not a desktop one. */}
          <nav
            className="hidden shrink-0 flex-col gap-1 py-6 lg:flex"
            style={{ width: 176 }}
            aria-label="Sections"
          >
            {TABS.map((t) => {
              const on = active(screen, t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  onClick={() => go(t.id)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left"
                  style={{
                    color: on ? 'var(--fg)' : 'var(--fg-dim)',
                    background: on ? 'var(--surface)' : 'transparent',
                  }}
                >
                  <t.icon />
                  <span
                    className="disp-tight"
                    style={{ fontSize: 'var(--text-body)', fontWeight: on ? 600 : 400 }}
                  >
                    {t.label}
                  </span>
                </button>
              )
            })}
          </nav>

          <main
            className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            style={{ borderInline: '1px solid var(--line)' }}
          >
            {screen === 'categories' && (
              <button
                type="button"
                onClick={() => setScreen('trip')}
                className="label shrink-0 px-4 py-3 text-left"
                style={{ color: 'var(--accent-owed)' }}
              >
                ← Back to trip
              </button>
            )}
            {screen === 'add' && <LogScreen onOpenBalance={() => setScreen('trip')} />}
            {screen === 'history' && <HistoryScreen />}
            {screen === 'trip' && <TripScreen onCategories={() => setScreen('categories')} />}
            {screen === 'ledger' && <LedgerScreen />}
            {screen === 'categories' && <CategoriesScreen />}
            {screen === 'settings' && <SettingsScreen />}
          </main>
        </div>

        <nav
          className="mx-auto flex w-full max-w-[26rem] shrink-0 items-stretch lg:hidden"
          style={{
            borderTop: '1px solid var(--line)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            background: 'var(--bg)',
          }}
          aria-label="Sections"
        >
          {TABS.map((t) => {
            const on = active(screen, t.id)
            return (
              <button
                key={t.id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => go(t.id)}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
                style={{ color: on ? 'var(--fg)' : 'var(--fg-dim)', minHeight: 52 }}
              >
                <t.icon />
                <span
                  className="disp-tight"
                  style={{ fontSize: 'var(--text-micro)', fontWeight: on ? 600 : 400 }}
                >
                  {t.label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </ToastHost>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <ToastHost>
      <div
        className="mx-auto flex h-full max-w-[26rem] flex-col"
        style={{ borderInline: '1px solid var(--line)' }}
      >
        {children}
      </div>
    </ToastHost>
  )
}

const S = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', 'aria-hidden': true } as const
const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function IconAdd() {
  return (
    <svg {...S}>
      <path d="M10 3.5v13M3.5 10h13" {...stroke} />
    </svg>
  )
}
function IconList() {
  return (
    <svg {...S}>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h9" {...stroke} />
    </svg>
  )
}
function IconBalance() {
  return (
    <svg {...S}>
      <path
        d="M10 3v14M4 7h12M4 7l-2 5a2.4 2.4 0 0 0 4 0L4 7ZM16 7l-2 5a2.4 2.4 0 0 0 4 0l-2-5Z"
        {...stroke}
      />
    </svg>
  )
}
function IconLog() {
  return (
    <svg {...S}>
      <path d="M5 2.5h10v15l-2.5-1.8-2.5 1.8-2.5-1.8L5 17.5v-15Z" {...stroke} />
      <path d="M8 6.5h4M8 10h4" {...stroke} />
    </svg>
  )
}
function IconGear() {
  return (
    <svg {...S}>
      <circle cx="10" cy="10" r="2.6" {...stroke} />
      <path
        d="M10 2.5v1.8M10 15.7v1.8M17.5 10h-1.8M4.3 10H2.5M15.3 4.7l-1.3 1.3M6 14l-1.3 1.3M15.3 15.3 14 14M6 6 4.7 4.7"
        {...stroke}
      />
    </svg>
  )
}
