import { describe, expect, it } from 'vitest';
import { unzip } from '../src/db/fullBackup';
import { zip } from '../src/export/xlsx';

describe('backup zip', () => {
  it('reads back what it writes', async () => {
    const enc = new TextEncoder();
    const photo = new Uint8Array(5000).map((_, i) => i % 251);
    const bytes = zip([
      { name: 'backup.json', data: enc.encode('{"app":"health"}') },
      { name: 'photos/a.jpg', data: photo },
    ]);
    const files = await unzip(bytes);
    expect(new TextDecoder().decode(files.get('backup.json'))).toBe('{"app":"health"}');
    expect(files.get('photos/a.jpg')).toEqual(photo);
  });
  it('rejects files that are not zips', async () => {
    await expect(unzip(new TextEncoder().encode('not a zip at all, clearly not'))).rejects.toThrow();
  });
});
