import { useSyncExternalStore } from 'react';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  needRefresh: boolean;
  offlineReady: boolean;
  canInstall: boolean;
  installed: boolean;
  persisted: boolean | null;
}

let state: PwaState = {
  needRefresh: false,
  offlineReady: false,
  canInstall: false,
  installed: window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  persisted: null,
};
let updateSW: ((reload?: boolean) => Promise<void>) | undefined;
let installEvent: InstallPrompt | undefined;
const listeners = new Set<() => void>();

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export async function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as InstallPrompt;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    installEvent = undefined;
    set({ canInstall: false, installed: true });
  });
  if (navigator.storage?.persisted) {
    navigator.storage.persisted().then((p) => set({ persisted: p })).catch(() => {});
  }
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const { registerSW } = await import('virtual:pwa-register');
    updateSW = registerSW({
      onNeedRefresh: () => set({ needRefresh: true }),
      onOfflineReady: () => set({ offlineReady: true }),
      onRegisteredSW: (_url, reg) => {
        // Look for a new version whenever the app comes back to the front.
        if (!reg) return;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      },
    });
  }
}

export async function applyUpdate() {
  await updateSW?.(true);
}

export async function promptInstall(): Promise<boolean> {
  if (!installEvent) return false;
  await installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = undefined;
  set({ canInstall: false, installed: outcome === 'accepted' || state.installed });
  return outcome === 'accepted';
}

/** Asks Chrome to keep this app's data even when the phone runs low on space. */
export async function askPersist(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    const ok = await navigator.storage.persist();
    set({ persisted: ok });
    return ok;
  } catch {
    return false;
  }
}
