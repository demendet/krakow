import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

/**
 * These values are public by design — they ship in the client bundle and are
 * meant to. Security lives in firestore.rules, not in hiding the config.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = firebaseReady ? initializeApp(firebaseConfig) : null

/**
 * persistentLocalCache replaces the deprecated enableIndexedDbPersistence call.
 * Reads and writes hit IndexedDB first; queued writes flush when the signal
 * comes back. Multi-tab manager so a laptop with two tabs open doesn't fight.
 */
export const db = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // Event payloads omit optional fields rather than setting them; this makes
      // sure a stray undefined can never reject a write mid-taxi.
      ignoreUndefinedProperties: true,
    })
  : (null as never)

export const auth = app ? getAuth(app) : (null as never)

if (auth) {
  // Indefinite session — sign-in should happen once, ever.
  void setPersistence(auth, browserLocalPersistence)
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (err) {
    const code = (err as { code?: string })?.code
    // Installed PWAs and some in-app browsers block popups outright.
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider)
      return
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
    throw err
  }
}

export function signOut() {
  return fbSignOut(auth)
}
