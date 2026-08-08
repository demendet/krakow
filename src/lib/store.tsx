import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, onSnapshot, orderBy, query, setDoc, writeBatch } from 'firebase/firestore'
import { auth, db, firebaseReady } from './firebase'
import { newId } from './ids'
import { replay, type Derived } from './replay'
import type { Event, EventDraft } from './types'
import { getRates, onRates, refreshRates, type RateTable } from './fx'
import { seedEvents } from './seed'

export type SyncState = 'synced' | 'pending' | 'offline' | 'local'
type Mode = 'firestore' | 'demo'

const DEMO_KEY = 'krakow.demo.v1'
const DEMO_FLAG = 'krakow.demo.on'

type NewEvent = EventDraft

type Store = {
  ready: boolean
  user: User | null
  mode: Mode
  configured: boolean
  events: Event[]
  d: Derived
  sync: SyncState
  append: (draft: NewEvent) => Event
  appendMany: (drafts: NewEvent[]) => Event[]
  importEvents: (incoming: Event[], strategy: 'replace' | 'merge') => Promise<number>
  setDemo: (on: boolean) => void
  /** switches to the local demo ledger and seeds it in one step */
  loadDemoTrip: () => void
  rates: RateTable
}

const Ctx = createContext<Store | null>(null)

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

function loadDemo(): Event[] {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? (JSON.parse(raw) as Event[]) : []
  } catch {
    return []
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(!firebaseReady)
  const [events, setEvents] = useState<Event[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [demo, setDemoState] = useState(
    () => !firebaseReady || localStorage.getItem(DEMO_FLAG) === '1',
  )

  const [rates, setRates] = useState<RateTable>(getRates)
  const seqRef = useRef(0)

  useEffect(() => {
    const off = onRates(setRates)
    void refreshRates()
    const t = setInterval(() => void refreshRates(), 1000 * 60 * 60 * 3)
    return () => {
      off()
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const up = () => {
      setOnline(true)
      void refreshRates()
    }
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    if (!firebaseReady) return
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
    })
  }, [])

  const mode: Mode = demo || !firebaseReady ? 'demo' : 'firestore'

  // ---- demo backend -------------------------------------------------------
  useEffect(() => {
    if (mode !== 'demo') return
    const e = loadDemo()
    setEvents(e)
    seqRef.current = e.reduce((m, x) => Math.max(m, x.seq), 0)
    setLoaded(true)
  }, [mode])

  // ---- firestore backend --------------------------------------------------
  useEffect(() => {
    if (mode !== 'firestore' || !user) return
    setLoaded(false)
    const q = query(collection(db, 'users', user.uid, 'events'), orderBy('seq'))
    return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      const next = snap.docs.map((d) => d.data() as Event)
      seqRef.current = next.reduce((m, x) => Math.max(m, x.seq), 0)
      setEvents(next)
      setPending(snap.metadata.hasPendingWrites)
      setLoaded(true)
    })
  }, [mode, user])

  const persist = useCallback(
    (batchOfEvents: Event[]) => {
      if (mode === 'demo') {
        setEvents((prev) => [...prev, ...batchOfEvents])
        return
      }
      if (!user) return
      // Optimistic by construction: the SDK applies to the local cache
      // synchronously and the snapshot listener fires before the network does.
      for (const e of batchOfEvents) {
        void setDoc(doc(db, 'users', user.uid, 'events', e.id), e as object).catch(() => {
          /* queued by persistentLocalCache; nothing to do here */
        })
      }
    },
    [mode, user],
  )

  const append = useCallback(
    (draft: NewEvent): Event => {
      const e = {
        ...draft,
        id: newId(),
        at: draft.at ?? new Date().toISOString(),
        seq: ++seqRef.current,
      } as Event
      persist([e])
      return e
    },
    [persist],
  )

  const appendMany = useCallback(
    (drafts: NewEvent[]): Event[] => {
      const now = new Date().toISOString()
      const built = drafts.map(
        (draft) =>
          ({
            ...draft,
            id: newId(),
            at: draft.at ?? now,
            seq: ++seqRef.current,
          }) as Event,
      )
      persist(built)
      return built
    },
    [persist],
  )

  // demo events live in localStorage so a refresh keeps them
  useEffect(() => {
    if (mode !== 'demo' || !loaded) return
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(events))
    } catch {
      /* quota or private mode — the demo is disposable anyway */
    }
  }, [events, loaded, mode])

  const d = useMemo(() => replay(events), [events])

  const loadDemoTrip = useCallback(() => {
    const seeded = seedEvents()
    try {
      localStorage.setItem(DEMO_FLAG, '1')
      localStorage.setItem(DEMO_KEY, JSON.stringify(seeded))
    } catch {
      /* ignore */
    }
    seqRef.current = seeded.reduce((m, x) => Math.max(m, x.seq), 0)
    setDemoState(true)
    setEvents(seeded)
    setLoaded(true)
  }, [])

  const importEvents = useCallback(
    async (incoming: Event[], strategy: 'replace' | 'merge') => {
      const sorted = [...incoming].sort((a, b) => a.seq - b.seq)
      const drafts: NewEvent[] = []

      if (strategy === 'replace') {
        // The log is append-only at the database level, so a replace is a
        // retraction of everything live followed by the imported history.
        for (const x of d.expenses) drafts.push({ type: 'expense_deleted', targetId: x.id })
        for (const s of d.settlements) drafts.push({ type: 'settlement_deleted', targetId: s.id })
      }

      const known = new Set<string>()
      for (const e of events) {
        if (e.type === 'expense_added' || e.type === 'settlement_added') known.add(e.payload.id)
      }

      for (const e of sorted) {
        if (strategy === 'merge') {
          if (e.type === 'expense_added' && known.has(e.payload.id)) continue
          if (e.type === 'settlement_added' && known.has(e.payload.id)) continue
        }
        const { seq: _seq, id: _id, ...rest } = e
        drafts.push(rest as NewEvent)
      }

      if (mode === 'firestore' && user && drafts.length > 20) {
        // one round trip instead of hundreds
        let batch = writeBatch(db)
        let n = 0
        const now = new Date().toISOString()
        for (const draft of drafts) {
          const built = {
            ...draft,
            id: newId(),
            at: draft.at ?? now,
            seq: ++seqRef.current,
          } as Event
          batch.set(doc(db, 'users', user.uid, 'events', built.id), built as object)
          if (++n % 400 === 0) {
            void batch.commit()
            batch = writeBatch(db)
          }
        }
        void batch.commit()
      } else {
        appendMany(drafts)
      }
      return drafts.length
    },
    [appendMany, d.expenses, d.settlements, events, mode, user],
  )

  const setDemo = useCallback((on: boolean) => {
    localStorage.setItem(DEMO_FLAG, on ? '1' : '0')
    if (!on) localStorage.removeItem(DEMO_KEY)
    setDemoState(on)
    setEvents([])
    seqRef.current = 0
  }, [])

  const sync: SyncState =
    mode === 'demo' ? 'local' : !online ? 'offline' : pending ? 'pending' : 'synced'

  const value = useMemo<Store>(
    () => ({
      ready: authReady && (mode === 'demo' ? loaded : !user || loaded),
      user,
      mode,
      configured: firebaseReady,
      events,
      d,
      sync,
      append,
      appendMany,
      importEvents,
      setDemo,
      loadDemoTrip,
      rates,
    }),
    [
      append,
      appendMany,
      authReady,
      d,
      events,
      importEvents,
      loadDemoTrip,
      loaded,
      mode,
      rates,
      setDemo,
      sync,
      user,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
