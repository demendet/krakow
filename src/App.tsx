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

type Tab = 'add' | 'history' | 'trip' | 'ledger'
type Screen = Tab | 'categories' | 'settings'

const TABS: { id: Tab; label: string; icon: () => React.JSX.Element }[] = [
  { id: 'add', label: 'Add', icon: IconAdd },
  { id: 'history', label: 'History', icon: IconList },
  { id: 'trip', label: 'Trip', icon: IconBalance },
  { id: 'ledger', label: 'Log', icon: IconLog },
]

export default function App() {
  const { ready, user, mode, configured } = useStore()
  const [screen, setScreen] = useState<Screen>('add')

  const signedOut = configured && mode === 'firestore' && !user

  useEffect(() => {
    if (signedOut) setScreen('add')
  }, [signedOut])

  if (!ready) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center">
          <span className="mosaic w-16" aria-hidden />
        </div>
      </Shell>
    )
  }

  if (signedOut) {
    return (
      <Shell>
        <SignInScreen />
      </Shell>
    )
  }

  const isTab = TABS.some((t) => t.id === screen)

  return (
    <Shell>
      <RateStrip />

      {!isTab && (
        <button
          type="button"
          onClick={() => setScreen(screen === 'settings' ? 'add' : 'trip')}
          className="label px-4 py-3 text-left"
          style={{ color: 'var(--accent-owed)' }}
        >
          ← Back
        </button>
      )}

      <main
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ display: screen === 'add' ? 'flex' : 'block', flexDirection: 'column' }}
      >
        {screen === 'add' && <LogScreen onOpenBalance={() => setScreen('trip')} />}
        {screen === 'history' && <HistoryScreen />}
        {screen === 'trip' && <TripScreen onCategories={() => setScreen('categories')} />}
        {screen === 'ledger' && <LedgerScreen />}
        {screen === 'categories' && <CategoriesScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>

      <nav
        className="flex shrink-0 items-stretch"
        style={{
          borderTop: '1px solid var(--line)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--bg)',
        }}
        aria-label="Sections"
      >
        {TABS.map((t) => {
          const on = screen === t.id || (t.id === 'trip' && screen === 'categories')
          return (
            <button
              key={t.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => {
                haptic.tap()
                setScreen(t.id)
              }}
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
        <button
          type="button"
          aria-current={screen === 'settings' ? 'page' : undefined}
          onClick={() => {
            haptic.tap()
            setScreen('settings')
          }}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          style={{
            color: screen === 'settings' ? 'var(--fg)' : 'var(--fg-dim)',
            minHeight: 52,
          }}
        >
          <IconGear />
          <span className="disp-tight" style={{ fontSize: 'var(--text-micro)' }}>
            More
          </span>
        </button>
      </nav>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
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
const stroke = { stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

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
      <path d="M10 3v14M4 7h12M4 7l-2 5a2.4 2.4 0 0 0 4 0L4 7ZM16 7l-2 5a2.4 2.4 0 0 0 4 0l-2-5Z" {...stroke} />
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
