import type { DayKey } from '../domain/dates';
import { decodeBridgeStream, isDay, isObject, timestamp } from './bridgeFile';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const FOLDER = 'Health bridge';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

interface DriveFile { id: string; name: string; createdTime: string }

function bridgeIndex(raw: string) {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('The Bridge index is not valid JSON.'); }
  if (!isObject(value) || value.schema !== 1 || !timestamp(value.lastSync) ||
    !Array.isArray(value.days) || !value.days.every(isDay) || value.days.length > 14 ||
    !Array.isArray(value.failed) || !value.failed.every(isDay) || value.failed.length > 14) {
    throw new Error('The Bridge index has an unsupported format.');
  }
  const days = [...new Set<DayKey>(value.days)].sort();
  if (days.some((day) => (value.failed as DayKey[]).includes(day))) throw new Error('The Bridge index contains conflicting dates.');
  return { days, failed: value.failed.length, lastSync: value.lastSync as string };
}

export async function readBridgeDrive(accessToken: string, request: typeof fetch = fetch) {
  async function get(url: string) {
    let response: Response;
    try {
      response = await request(url, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', redirect: 'error' });
    } catch {
      throw new Error('Could not reach Google Drive. Try again when you’re online.');
    }
    if (response.status === 401) throw new DriveSessionExpired();
    if (!response.ok) throw new Error('Google Drive could not read the Bridge files.');
    return response;
  }

  async function list(q: string) {
    const files: DriveFile[] = [];
    const pages = new Set<string>();
    let next: string | undefined;
    do {
      const params = new URLSearchParams({ q, fields: 'nextPageToken,files(id,name,createdTime)', pageSize: '100' });
      if (next) params.set('pageToken', next);
      const data: unknown = await (await get(`${DRIVE_FILES}?${params}`)).json();
      if (!isObject(data) || !Array.isArray(data.files) || !data.files.every((file): file is DriveFile =>
        isObject(file) && typeof file.id === 'string' && /^[\w-]+$/.test(file.id) &&
        typeof file.name === 'string' && typeof file.createdTime === 'string' && !!timestamp(file.createdTime))) {
        throw new Error('Google Drive returned an invalid Bridge file list.');
      }
      files.push(...data.files);
      next = typeof data.nextPageToken === 'string' && data.nextPageToken ? data.nextPageToken : undefined;
      if (next) {
        if (pages.has(next)) throw new Error('Google Drive repeated a Bridge file page.');
        pages.add(next);
      }
    } while (next);
    return files.sort((a, b) => a.createdTime.localeCompare(b.createdTime) || a.id.localeCompare(b.id));
  }

  const download = async (file: DriveFile) => (await get(`${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media`)).text();
  const folders = await list(`name='${FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false`);
  const folder = folders.find((item) => item.name === FOLDER);
  if (!folder) throw new Error('Health bridge was not found in this Google account. Sync from the iPad and check the Drive connection.');
  const inFolder = `'${folder.id}' in parents and trashed=false`;
  const indexFile = (await list(`${inFolder} and name='index.json'`)).find((file) => file.name === 'index.json');
  if (!indexFile) throw new Error('The iPad has not published a Bridge index yet.');
  const index = bridgeIndex(await download(indexFile));
  const names = index.days.map((day) => `day-${day}.json`);
  const children = names.length ? await list(`${inFolder} and (${names.map((name) => `name='${name}'`).join(' or ')})`) : [];
  const files = await Promise.all(index.days.map(async (day, position) => {
    const file = children.find((candidate) => candidate.name === names[position]);
    if (!file) throw new Error(`The Bridge index lists a missing day file (${day}). Try syncing the iPad again.`);
    const raw = await download(file);
    if (decodeBridgeStream(raw, 'steps').date !== day) throw new Error('A Bridge day file has the wrong date.');
    return raw;
  }));
  return { ...index, files };
}

export class DriveSessionExpired extends Error {
  constructor() { super('Google Drive sign-in expired. Connect again to sync.'); }
}
