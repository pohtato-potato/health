import { isObject } from './bridgeFile';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS = 'https://accounts.google.com/gsi/client';
/** Public web OAuth ID. It must be in the same Google Cloud project as the iPad client. */
export const bridgeDriveClientId = import.meta.env.VITE_HEALTH_BRIDGE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleOAuth {
  initTokenClient(options: {
    client_id: string; scope: string; state: string; include_granted_scopes: boolean;
    callback: (response: unknown) => void; error_callback: () => void;
  }): { requestAccessToken(options: { prompt: string }): void };
}

const oauth = () => (window as Window & { google?: { accounts?: { oauth2?: GoogleOAuth } } }).google?.accounts?.oauth2;
let loading: Promise<void> | undefined;
let session: { token: string; expiresAt: number } | undefined;
let pending: { state: string; startedAt: number } | undefined;

export function prepareBridgeDriveSignIn() {
  if (oauth()) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS;
    script.async = true;
    const finish = () => {
      clearTimeout(limit);
      if (oauth()) resolve();
      else {
        script.remove();
        loading = undefined;
        reject(new Error('Google sign-in could not load. Try again when you’re online.'));
      }
    };
    const limit = window.setTimeout(finish, 15_000);
    script.onload = finish;
    script.onerror = finish;
    document.head.append(script);
  });
  return loading;
}

export function bridgeDriveToken() {
  return session && session.expiresAt > Date.now() + 60_000 ? session.token : undefined;
}

export function disconnectBridgeDrive() {
  pending = undefined;
  session = undefined;
}

export function connectBridgeDrive(clientId: string): Promise<string> {
  const google = oauth();
  if (!google) return Promise.reject(new Error('Google sign-in is still loading. Try again in a moment.'));
  if (pending) return Promise.reject(new Error('Finish the Google sign-in you already opened.'));
  const request = { state: crypto.randomUUID(), startedAt: Date.now() };
  pending = request;
  return new Promise((resolve, reject) => {
    const finish = (token?: string) => {
      clearTimeout(limit);
      if (pending === request) pending = undefined;
      if (token) resolve(token);
      else reject(new Error('Google Drive sign-in did not finish. Try connecting again.'));
    };
    const limit = window.setTimeout(finish, 3 * 60_000);
    try {
      google.initTokenClient({
        client_id: clientId, scope: SCOPE, state: request.state, include_granted_scopes: false,
        callback: (response) => {
          // GIS returns to this closure. This app has no redirect or URL-token return path.
          if (pending !== request || Date.now() - request.startedAt > 3 * 60_000 ||
            !isObject(response) || response.state !== request.state || response.error ||
            typeof response.access_token !== 'string' || !response.access_token ||
            typeof response.scope !== 'string' || !response.scope.split(/\s+/).includes(SCOPE)) return finish();
          const seconds = Number(response.expires_in);
          if (!Number.isFinite(seconds) || seconds <= 60) return finish();
          session = { token: response.access_token, expiresAt: Date.now() + seconds * 1000 };
          finish(session.token);
        },
        error_callback: () => finish(),
      }).requestAccessToken({ prompt: 'select_account' });
    } catch {
      finish();
    }
  });
}
