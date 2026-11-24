import { bridgeDriveToken, disconnectBridgeDrive } from '../sources/bridgeDriveAuth';
import { DriveSessionExpired, readBridgeDrive } from '../sources/bridgeDrive';
import { patchSettings } from './actions';
import { applyBridgeDayFiles } from './bridgeApply';

export async function syncHealthBridgeFromDrive(token: string, request: typeof fetch = fetch, stillConnected = () => true) {
  const index = await readBridgeDrive(token, request);
  if (!stillConnected()) throw new Error('Google Drive was disconnected before import.');
  const result = await applyBridgeDayFiles(index.files);
  await patchSettings((current) => current.bridgeDriveSync && Date.parse(current.bridgeDriveSync.lastSync) > Date.parse(index.lastSync)
    ? {} : { bridgeDriveSync: { lastSync: index.lastSync, importedAt: Date.now(), failed: index.failed } });
  return { ...result, files: index.files.length, failed: index.failed };
}

let active: Promise<Awaited<ReturnType<typeof syncHealthBridgeFromDrive>>> | undefined;
let lastAttempt = 0;
const AUTO_INTERVAL = 10 * 60_000;

export function syncConnectedBridge() {
  const token = bridgeDriveToken();
  if (!token) return Promise.reject(new DriveSessionExpired());
  if (active) return active;
  lastAttempt = Date.now();
  active = syncHealthBridgeFromDrive(token, fetch, () => bridgeDriveToken() === token)
    .catch((error: unknown) => {
      if (error instanceof DriveSessionExpired && bridgeDriveToken() === token) disconnectBridgeDrive();
      throw error;
    })
    .finally(() => { active = undefined; });
  return active;
}

export function syncBridgeWhenVisible() {
  if (document.visibilityState === 'visible' && bridgeDriveToken() && Date.now() - lastAttempt >= AUTO_INTERVAL) {
    void syncConnectedBridge().catch(() => undefined);
  }
}
