# Kraków ledger

Who paid for what in Kraków, and who owes who at the end.

Two people spend — Mattis (home currency NOK) and Mikko. One person writes.
Most of the money goes out in złoty; the mental accounting happens in kroner.
The app is built around one number: what Mikko owes Mattis, or the reverse.

The design constraint is 01:40 in a taxi, one hand, not sober. Open → type
`60` → tap **I paid** → done. Three taps, no dialog, and an eight-second Undo.

---

## Run it

```bash
npm install
cp .env.example .env   # then fill in the Firebase values below
npm run dev
```

Without a `.env` the app still runs — it falls back to a local demo ledger so
the UI can be evaluated without a Firebase project. With one configured, tap
**More → Load demo trip** for three days of Kraków spending on this device only;
your real ledger is untouched.

```bash
npm run build     # typecheck + production bundle into dist/
npm run preview   # serve dist/ locally
node scripts/icons.mjs   # regenerate PNG icons from public/icon.svg
```

---

## Firebase setup

The project is `krakow-4e627`. If you are wiring up a fresh one:

1. **Firestore** — create the database (any region; `eur3` or `europe-north1`
   makes sense here).
2. **Authentication → Sign-in method** — enable **Google**. Nothing else.
3. **Authentication → Settings → Authorized domains** — add your Vercel domain
   (`<project>.vercel.app` and any custom domain). `localhost` is there already.
4. **Deploy the rules and indexes**:

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes --project krakow-4e627
   ```

   `firestore.rules` denies `update` and `delete` outright. The log is
   append-only at the database level, not just by convention in the client.

### Environment variables

These six values are **public by design**. They ship inside the client bundle
and anyone can read them out of it. That is expected — security comes from
`firestore.rules`, not from hiding the config. Don't build a proxy to conceal
them.

```
VITE_FIREBASE_API_KEY=AIzaSyBi-H9cbEE4u-pVW_oxp0NCl2vEJwe7Sg0
VITE_FIREBASE_AUTH_DOMAIN=krakow-4e627.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=krakow-4e627
VITE_FIREBASE_STORAGE_BUCKET=krakow-4e627.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=821627960116
VITE_FIREBASE_APP_ID=1:821627960116:web:5c64ec52a7e9b6c2b30361
```

---

## Deploying to Vercel

1. **Add New → Project**, import `demendet/krakow`.
2. Framework preset **Vite** (auto-detected). Build `npm run build`, output
   `dist`. No overrides needed.
3. **Settings → Environment Variables** — paste the six `VITE_FIREBASE_*` keys
   above for Production, Preview and Development.
4. Deploy, then add the resulting domain to Firebase's **Authorized domains**
   or Google sign-in will refuse.

Redeploy after changing env vars — Vite inlines them at build time.

---

## How it works

### The event log is the source of truth

There is no mutable collection of expenses. There is an append-only log, and
every number on screen is a fold over it.

```
users/{uid}/events/{eventId}
```

```ts
type Event =
  | { type: 'expense_added';      id; at; seq; payload: Expense }
  | { type: 'expense_edited';     id; at; seq; targetId; payload: ExpensePatch }
  | { type: 'expense_deleted';    id; at; seq; targetId }
  | { type: 'settlement_added';   id; at; seq; payload: Settlement }
  | { type: 'settlement_deleted'; id; at; seq; targetId }
```

Documents are written once and never touched again. An edit is a new event; a
deletion is a new event; Undo is a new event. So there are no transactions, no
optimistic-concurrency handling and no merge logic — with a single writer, the
hardest parts of using a remote database never come up.

Ordering is by `seq`, a monotonic integer, **not** by server timestamp. Events
queued offline replay in the order they were entered rather than the order they
happened to sync. `at` is an ISO string, for display only.

The whole log replays on load (`src/lib/replay.ts`). At a few hundred events
that is well under a frame.

`null` in an `expense_edited` payload means *erase this field* — Firestore
refuses to store `undefined`, so a deliberate erasure has to travel as a value
rather than as an absence.

### Offline

`initializeFirestore` is configured with `persistentLocalCache` (the modern
replacement for `enableIndexedDbPersistence`). Reads and writes hit IndexedDB
first and queued writes flush when the signal returns — basements and clubs
work without a hand-written queue. The sync state shows as a small dot in the
rate strip: **Synced**, **Saving**, **Offline**, **Demo**.

### Currency

Rates come from [Frankfurter](https://frankfurter.dev) —
`GET /v1/latest?base=EUR&symbols=NOK,PLN`, one request, every cross rate we
need. Free, no key, CORS-enabled, ECB reference rates.

The ECB publishes once per business day around 16:00 CET. Weekends and holidays
correctly return the last published fixing; that is not an error and the app
does not warn about it.

**Rates are snapshotted, never recomputed.** When an expense is entered the
rate is fetched, stored on the event, and `amountInBase` is computed and stored
alongside it. Historical expenses are never re-priced. If they were, every
balance would drift each day and the number agreed on last night would be
different by morning.

If the API is unreachable, the last known rate is used, the event is flagged
`rateEstimated`, and Settings shows a count so it can be corrected later.
Logging never blocks on a network call.

### The balance

```
balance = Σ(Mattis paid × Mikko's share)
        − Σ(Mikko paid × Mattis's share)
        + Σ(settlements Mattis → Mikko)
        − Σ(settlements Mikko → Mattis)
```

Positive means Mikko owes Mattis, so a transfer always moves the balance toward
zero: Mikko paying Mattis shrinks what Mikko owes, and vice versa. Settling in
full lands on exactly nought. Settlements are a separate type from
expenses, not a negative expense — a Vipps transfer is not a purchase, and
conflating them would make "what did this trip cost" meaningless.

### Screens

| | |
|---|---|
| **Add** | The home screen. Keypad, currency, quick amounts, split, two payer buttons. |
| **History** | Reverse chronological, grouped by day. Tap a row to edit, swipe left to delete. |
| **Trip** | The balance at full size, settle up, what it cost, per person, where it went. |
| **Log** | Every event ever, with edits showing from-and-to. The screen you open when a number looks wrong. |
| **More** | Export, clipboard, import, demo data, sign out. |

### Backup

Firebase covers a lost phone and a cleared cache. It does not cover deleting
the project or fat-fingering a rules change. **More → Export to JSON** downloads
the whole log; **Import** offers merge or replace. Replace is itself expressed
as events — everything current is retracted, then the imported history is
appended — so the log still shows exactly what happened.

---

## Layout of the source

```
src/
  lib/
    types.ts     Event, Expense, Settlement, ExpensePatch
    replay.ts    the fold: log → balance, totals, categories
    ledger.ts    the fold again, keeping intermediate states for the log screen
    fx.ts        Frankfurter, caching, rate snapshotting
    store.tsx    auth, Firestore subscription, append, demo backend
    money.ts     formatting, currency glyphs, split arithmetic
    backup.ts    export / import / clipboard
    seed.ts      the demo trip
  components/    Balance, RollingNumber, Keypad, RateStrip, Sheet, Toast, …
  screens/       Log, History, Trip, Categories, Ledger, Settings, SignIn
firestore.rules
firestore.indexes.json
```
