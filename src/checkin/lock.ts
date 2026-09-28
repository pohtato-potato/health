import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { db } from '../db/db';

/**
 * A fingerprint check before photos open, using the phone's own screen lock
 * through WebAuthn. It's a gate for casual eyes, not encryption: the photos
 * themselves never leave this phone either way.
 */
let unlocked = false;
const listeners = new Set<() => void>();
const set = (v: boolean) => {
  unlocked = v;
  listeners.forEach((l) => l());
};

export function usePhotosUnlocked(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => unlocked,
  );
}

// Lock again whenever the app goes to the background.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') set(false);
  });
}

const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function canUseFingerprint(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials;
}

/** Registers the phone's fingerprint for Health. Returns the credential id to keep. */
export async function registerFingerprint(): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: rand(32),
      rp: { name: 'Health' },
      user: { id: rand(16), name: 'health-photos', displayName: 'Health photos' },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error('No fingerprint was set up.');
  set(true);
  return toB64(cred.rawId);
}

export async function unlockWithFingerprint(key: string): Promise<boolean> {
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: rand(32),
        allowCredentials: [{ type: 'public-key', id: fromB64(key) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    set(!!got);
    return !!got;
  } catch {
    return false;
  }
}

export function unlockPhotos() {
  set(true);
}

/** An object URL for a stored photo, released when the component goes away. */
export function usePhotoUrl(id: string | undefined): string | undefined {
  const blob = useLiveQuery(async () => (id ? (await db.photos.get(id))?.blob : undefined), [id]);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
