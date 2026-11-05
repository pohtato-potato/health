import { dayKey } from '../domain/dates';
import type { Clip, Photo } from '../domain/types';
import { zip } from '../export/xlsx';
import { bump, patchSettings } from './actions';
import { checkBackup, confirmReadBack, exportData, parseBackup, restoreData, shareFile, type BackupFile, type FileCheck, type ReadBack } from './backup';
import { db } from './db';
import { safetyCopy } from './snapshots';

type PhotoMeta = Omit<Photo, 'blob'> & { file: string };
type ClipMeta = Omit<Clip, 'blob'> & { file: string };

export interface FullBackupJson extends BackupFile {
  media: { photos: PhotoMeta[]; clips: ClipMeta[] };
}

const ext = (type: string) => (type.includes('mp4') ? 'mp4' : type.includes('webm') ? 'webm' : type.includes('png') ? 'png' : 'jpg');

/** Everything, photos and form clips included, as one .zip. */
export async function buildFullBackup(): Promise<{ bytes: Uint8Array; name: string; data: BackupFile; media: Map<string, number> }> {
  const data = await exportData();
  const photos = await db.photos.toArray();
  const clips = await db.clips.toArray();
  const files: { name: string; data: Uint8Array }[] = [];
  const photoMeta: PhotoMeta[] = [];
  for (const p of photos) {
    const file = `photos/${p.id}.${ext(p.blob.type)}`;
    const { blob, ...meta } = p;
    photoMeta.push({ ...meta, file });
    files.push({ name: file, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  const clipMeta: ClipMeta[] = [];
  for (const c of clips) {
    const file = `clips/${c.id}.${ext(c.type)}`;
    const { blob, ...meta } = c;
    clipMeta.push({ ...meta, file });
    files.push({ name: file, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  const json: FullBackupJson = { ...data, media: { photos: photoMeta, clips: clipMeta } };
  files.unshift({ name: 'backup.json', data: new TextEncoder().encode(JSON.stringify(json)) });
  const media = new Map(files.filter((f) => f.name !== 'backup.json').map((f) => [f.name, f.data.length]));
  return { bytes: zip(files), name: `health-full-backup-${dayKey()}.zip`, data, media };
}

/** Reads the finished zip back: every table counted, every photo and clip there at its full size. */
export async function confirmFullReadBack(file: File, expected: { data: BackupFile; media: Map<string, number> }): Promise<ReadBack> {
  try {
    const back = await readBackupFile(file);
    const tables = await confirmReadBack(new File([JSON.stringify(back.file)], 'backup.json'), expected.data);
    if (!tables.ok) return tables;
    for (const [name, size] of expected.media) {
      if (back.media?.blobs.get(name)?.length !== size) return { ok: false, why: `The backup came back short: ${name} didn't match, so it wasn't saved.` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, why: `The backup couldn't be read back, so it wasn't saved. ${(e as Error).message}` };
  }
}

export async function saveFullBackup(deps: { share?: typeof shareFile; readBack?: typeof confirmFullReadBack } = {}): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const { bytes, name, data, media } = await buildFullBackup();
  const file = new File([bytes as BlobPart], name, { type: 'application/zip' });
  const check = await (deps.readBack ?? confirmFullReadBack)(file, { data, media });
  if (!check.ok) throw new Error(check.why);
  const result = await (deps.share ?? shareFile)(file);
  if (result !== 'cancelled') {
    await patchSettings((s) => ({ backup: { ...s.backup, lastQuick: Date.now(), lastFull: Date.now(), lastFullBytes: bytes.length } }));
    await bump('backup', { day: dayKey() });
  }
  return result;
}

/** Reads a .zip, stored or deflated, without any library. */
export async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This file isn't a Health backup: it isn't a zip.");
  const n = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const out = new Map<string, Uint8Array>();
  const dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('The backup zip is damaged.');
    const method = view.getUint16(p + 10, true);
    const size = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + size);
    if (method === 0) out.set(name, raw);
    else if (method === 8) {
      const stream = new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      out.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    } else throw new Error('The backup zip uses a compression Health can’t read.');
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

export interface ParsedBackup {
  file: BackupFile;
  media?: { photos: PhotoMeta[]; clips: ClipMeta[]; blobs: Map<string, Uint8Array> };
}

/** Reads a quick backup (.json) or a full one (.zip). */
export async function readBackupFile(f: File): Promise<ParsedBackup> {
  const bytes = new Uint8Array(await f.arrayBuffer());
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (!isZip) return { file: parseBackup(new TextDecoder().decode(bytes)) };
  const files = await unzip(bytes);
  const json = files.get('backup.json');
  if (!json) throw new Error("This zip isn't a Health backup.");
  const file = parseBackup(new TextDecoder().decode(json)) as FullBackupJson;
  return { file, media: { photos: file.media?.photos ?? [], clips: file.media?.clips ?? [], blobs: files } };
}

const missingMedia = (b: ParsedBackup) => (b.media ? [...b.media.photos, ...b.media.clips].filter((m) => !b.media!.blobs.has(m.file)).length : 0);
const missingWords = (n: number) => `${n} photo${n === 1 ? ' or clip is' : 's or clips are'} missing from this file`;

/** Reads a quick or full backup file back, without restoring it. */
export async function checkFullBackupFile(f: File): Promise<FileCheck> {
  try {
    const b = await readBackupFile(f);
    const missing = missingMedia(b);
    if (missing) return { ok: false, why: `${missingWords(missing)}.` };
    const check = checkBackup(b.file);
    if (!check.ok || !b.media) return check;
    const [photos, clips] = [b.media.photos.length, b.media.clips.length];
    return { ...check, summary: `${check.summary}, ${photos} photo${photos === 1 ? '' : 's'}, ${clips} clip${clips === 1 ? '' : 's'}` };
  } catch (e) {
    return { ok: false, why: (e as Error).message };
  }
}

export async function restoreAll(b: ParsedBackup) {
  const missing = missingMedia(b);
  if (missing) throw new Error(`${missingWords(missing)}, so nothing was changed.`);
  await safetyCopy('Before restoring a backup');
  await restoreData(b.file);
  if (!b.media) return;
  await db.transaction('rw', db.photos, db.clips, async () => {
    await db.photos.clear();
    await db.clips.clear();
    for (const m of b.media!.photos) {
      const data = b.media!.blobs.get(m.file)!;
      const { file: _file, ...meta } = m;
      await db.photos.put({ ...meta, blob: new Blob([data as BlobPart], { type: 'image/jpeg' }) });
    }
    for (const m of b.media!.clips) {
      const data = b.media!.blobs.get(m.file)!;
      const { file: _file, ...meta } = m;
      await db.clips.put({ ...meta, blob: new Blob([data as BlobPart], { type: m.type }) });
    }
  });
}
