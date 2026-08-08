import { useRef, useState } from 'react'
import { Chip } from '../components/Chip'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { copyToClipboard, download, parseBackup } from '../lib/backup'
import { signOut } from '../lib/firebase'
import { useStore } from '../lib/store'

export function SettingsScreen() {
  const { events, user, mode, configured, importEvents, setDemo, loadDemoTrip, d } = useStore()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseBackup> | null>(null)

  const pickFile = () => fileRef.current?.click()

  const onFile = async (file: File) => {
    try {
      setPendingImport(parseBackup(await file.text()))
    } catch (err) {
      toast({ text: (err as Error).message, tone: 'bad', duration: 5000 })
    }
  }

  return (
    <div className="px-4 pb-10 pt-5">
      <h1 className="disp" style={{ fontSize: 'var(--text-title)', fontWeight: 600 }}>
        Settings
      </h1>
      <p className="mb-5 mt-1" style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-small)' }}>
        {mode === 'demo'
          ? 'Demo data, kept on this device only.'
          : (user?.email ?? 'Signed in')}
        {' · '}
        {events.length} events
        {d.estimatedCount > 0 ? ` · ${d.estimatedCount} on an estimated rate` : ''}
      </p>

      <div className="space-y-2.5">
        <Item label="Export to JSON" hint="The whole event log, as a dated file." onClick={() => download(events)} />
        <Item
          label="Copy to clipboard"
          hint="For when mobile downloads misbehave."
          onClick={async () => {
            const ok = await copyToClipboard(events)
            toast({ text: ok ? 'Log copied' : "Couldn't copy — try the export", tone: ok ? 'normal' : 'bad', duration: 3000 })
          }}
        />
        <Item label="Import from JSON" hint="Replace or merge into what's here." onClick={pickFile} />
        <Item
          label="Load demo trip"
          hint={
            mode === 'demo'
              ? 'Three days in Kraków, so the screens have something in them.'
              : 'Switches to a local demo ledger. Your real one stays untouched.'
          }
          onClick={() => {
            loadDemoTrip()
            toast({ text: 'Demo trip loaded', duration: 3000 })
          }}
        />
        {mode === 'demo' && configured && (
          <Item
            label="Leave demo"
            hint="Clears the demo ledger and goes back to your own."
            onClick={() => setDemo(false)}
          />
        )}
        {user && mode !== 'demo' && (
          <Item label="Sign out" hint={user.email ?? ''} danger onClick={() => void signOut()} />
        )}
      </div>

      <p className="mt-8" style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-micro)' }}>
        Rates are European Central Bank reference rates via Frankfurter, snapshotted onto each
        expense when it is entered. Nothing is ever re-priced afterwards.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onFile(f)
          e.target.value = ''
        }}
      />

      {pendingImport && (
        <Sheet open onClose={() => setPendingImport(null)} title="Import">
          <div className="space-y-4 pb-2">
            <p style={{ color: 'var(--fg-dim)' }}>
              {pendingImport.length} events in that file. Merge keeps what's already here and adds
              anything new. Replace retracts everything current first — the log keeps both, so you
              can still see what happened.
            </p>
            <div className="flex gap-2">
              <Chip
                onClick={async () => {
                  const n = await importEvents(pendingImport, 'merge')
                  setPendingImport(null)
                  toast({ text: `Merged ${n} events`, duration: 4000 })
                }}
              >
                Merge
              </Chip>
              <Chip
                tone="var(--accent-bad)"
                onClick={async () => {
                  const n = await importEvents(pendingImport, 'replace')
                  setPendingImport(null)
                  toast({ text: `Replaced with ${n} events`, duration: 4000 })
                }}
              >
                Replace
              </Chip>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Item({
  label,
  hint,
  onClick,
  danger,
}: {
  label: string
  hint?: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="key w-full px-4 py-3.5 text-left"
      style={{ color: danger ? 'var(--accent-bad)' : undefined }}
    >
      <div style={{ fontWeight: 500 }}>{label}</div>
      {hint && (
        <div style={{ fontSize: 'var(--text-micro)', color: 'var(--fg-dim)' }}>{hint}</div>
      )}
    </button>
  )
}
