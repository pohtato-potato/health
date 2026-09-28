import { dayKey } from '../domain/dates';
import type { Clip, Photo } from '../domain/types';
import { zip } from '../export/xlsx';
import { bump, patchSettings } from './actions';
import { exportData, parseBackup, restoreData, shareFile, type BackupFile } from './backup';
import { db } from './db';

type PhotoMeta = Omit<Photo, 'blob'> & { file: string };
type ClipMeta = Omit<Clip, 'blob'> & { file: string };

export interface FullBackupJson extends BackupFile {
  media: { photos: PhotoMeta[]; clips: ClipMeta[] };
}

const ext = (type: string) => (type.includes('mp4') ? 'mp4' : type.includes('webm') ? 'webm' : type.includes('png') ? 'png' : 'jpg');

/** Everything, photos and form clips included, as one .zip. */
export async function buildFullBackup(): Promise<{ bytes: Uint8Array; name: string }> {
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
  return { bytes: zip(files), name: `health-full-backup-${dayKey()}.zip` };
}

export async function saveFullBackup(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const { bytes, name } = await buildFullBackup();
  const result = await shareFile(new File([bytes as BlobPart], name, { type: 'application/zip' }));
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

export async function restoreAll(b: ParsedBackup) {
  await restoreData(b.file);
  if (!b.media) return;
  await db.transaction('rw', db.photos, db.clips, async () => {
    await db.photos.clear();
    await db.clips.clear();
    for (const m of b.media!.photos) {
      const data = b.media!.blobs.get(m.file);
      if (!data) continue;
      const { file: _file, ...meta } = m;
      await db.photos.put({ ...meta, blob: new Blob([data as BlobPart], { type: 'image/jpeg' }) });
    }
    for (const m of b.media!.clips) {
      const data = b.media!.blobs.get(m.file);
      if (!data) continue;
      const { file: _file, ...meta } = m;
      await db.clips.put({ ...meta, blob: new Blob([data as BlobPart], { type: m.type }) });
    }
  });
}
