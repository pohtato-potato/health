import { afterEach, expect, it, vi } from 'vitest';
import { connectBridgeDrive, bridgeDriveToken, disconnectBridgeDrive } from '../src/sources/bridgeDriveAuth';
import { readBridgeDrive, DriveSessionExpired } from '../src/sources/bridgeDrive';

const scope = 'https://www.googleapis.com/auth/drive.file';
const day = '2026-11-24';
const readAt = `${day}T23:00:00+05:30`;
const client = 'test.apps.googleusercontent.com';

afterEach(() => {
  disconnectBridgeDrive();
  vi.unstubAllGlobals();
});

it('accepts a GIS token only for the current pending request and forgets it on disconnect', async () => {
  let state = '';
  let callback: (data: unknown) => void = () => {};
  vi.stubGlobal('window', {
    setTimeout,
    google: { accounts: { oauth2: { initTokenClient: (options: { state: string; callback: typeof callback }) => {
      state = options.state;
      callback = options.callback;
      return { requestAccessToken: () => {} };
    } } } },
  });
  const first = connectBridgeDrive(client);
  const stale = { state, scope, access_token: 'token', expires_in: 3600 };
  callback({ ...stale, state: 'unrequested' });
  await expect(first).rejects.toThrow();
  expect(bridgeDriveToken()).toBeUndefined();
  const oldCallback = callback;
  const second = connectBridgeDrive(client);
  oldCallback(stale);
  expect(bridgeDriveToken()).toBeUndefined();
  callback({ ...stale, state });
  await expect(second).resolves.toBe('token');
  disconnectBridgeDrive();
  expect(bridgeDriveToken()).toBeUndefined();
});

it('reads only indexed day files and rejects a mismatched date', async () => {
  let servedDate = day;
  const names: string[] = [];
  const list = (id: string, name: string) => Response.json({ files: [{ id, name, createdTime: readAt }] });
  const mock: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    expect(url.origin).toBe('https://www.googleapis.com');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fixture');
    const q = url.searchParams.get('q') ?? '';
    if (q.includes('mimeType')) return list('folder', 'Health bridge');
    if (q.includes("name='index.json'")) return list('index', 'index.json');
    if (q.includes("name='day-")) {
      expect(q).toContain("'folder' in parents");
      expect(q).not.toContain('2026-11-23');
      return list('day', `day-${day}.json`);
    }
    names.push(url.pathname);
    if (url.pathname.endsWith('/index')) return Response.json({ schema: 1, lastSync: readAt, days: [day], failed: ['2026-11-23'] });
    return Response.json({ schema: 1, date: servedDate, readAt, status: { steps: 'none' } });
  };
  expect(await readBridgeDrive('fixture', mock)).toMatchObject({ days: [day], failed: 1 });
  expect(names).toEqual(['/drive/v3/files/index', '/drive/v3/files/day']);
  servedDate = '2026-11-25';
  await expect(readBridgeDrive('fixture', mock)).rejects.toThrow(/wrong date/);
});

it('requires reconnection for an expired Drive token', async () => {
  await expect(readBridgeDrive('fixture', async () => new Response(null, { status: 401 }))).rejects.toBeInstanceOf(DriveSessionExpired);
});
