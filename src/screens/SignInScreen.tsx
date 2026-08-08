import { useState } from 'react'
import { signInWithGoogle } from '../lib/firebase'
import { useStore } from '../lib/store'

export function SignInScreen() {
  const { setDemo, configured } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <div className="flex min-h-full flex-col px-6 pb-10">
      <div className="flex flex-1 flex-col justify-end pb-10">
        <div className="mosaic mb-6 w-24" aria-hidden />
        <h1
          className="disp"
          style={{ fontSize: 'var(--text-display)', fontWeight: 700, lineHeight: 0.95 }}
        >
          Kraków
        </h1>
        <p className="mt-3 max-w-[20rem]" style={{ color: 'var(--fg-dim)' }}>
          What you spent, what Mikko spent, and who ends up owing who.
        </p>
        <p className="disp mt-6" style={{ fontSize: 'var(--text-title)', letterSpacing: '.06em' }}>
          <span style={{ color: 'var(--pln)' }}>zł</span>{' '}
          <span style={{ color: 'var(--fg-dim)' }}>→</span>{' '}
          <span style={{ color: 'var(--nok)' }}>kr</span>
        </p>
      </div>

      {err && (
        <p className="mb-3" style={{ color: 'var(--accent-bad)', fontSize: 'var(--text-small)' }}>
          {err}
        </p>
      )}

      <button
        type="button"
        disabled={busy || !configured}
        onClick={async () => {
          setBusy(true)
          setErr(null)
          try {
            await signInWithGoogle()
          } catch {
            setErr("Sign-in didn't go through. Try again.")
          } finally {
            setBusy(false)
          }
        }}
        className="key disp flex w-full items-center justify-center gap-3"
        style={{
          height: 68,
          fontSize: 'var(--text-lead)',
          fontWeight: 700,
          color: 'var(--bg)',
          background: 'var(--accent-owed)',
          borderColor: 'var(--accent-owed)',
          opacity: configured ? 1 : 0.5,
        }}
      >
        <GoogleMark />
        {busy ? 'One moment…' : 'Continue with Google'}
      </button>

      <button
        type="button"
        onClick={() => setDemo(true)}
        className="mt-4 py-2"
        style={{ color: 'var(--fg-dim)', fontSize: 'var(--text-small)' }}
      >
        {configured ? 'Just show me the app' : 'Firebase not configured — open the demo'}
      </button>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="currentColor"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.7l7.8 6.1C12.3 14 17.6 9.5 24 9.5Z"
      />
      <path
        fill="currentColor"
        opacity=".72"
        d="M46.5 24.5c0-1.6-.15-3.2-.42-4.7H24v9h12.7c-.55 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.2 6.9-17.4Z"
      />
      <path
        fill="currentColor"
        opacity=".55"
        d="M10.4 28.4a14.6 14.6 0 0 1 0-8.6l-7.8-6.1a24 24 0 0 0 0 20.8l7.8-6.1Z"
      />
      <path
        fill="currentColor"
        opacity=".85"
        d="M24 47.5c6.2 0 11.4-2 15.2-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.6 2.3-6.4 0-11.7-4.5-13.6-10.4l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5Z"
      />
    </svg>
  )
}
