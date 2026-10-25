import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe('the walk prototype is gone', () => {
  it('nothing imports it and its stylesheet is not loaded', () => {
    for (const f of files('src').filter((f) => /\.(ts|tsx|css)$/.test(f))) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/proto\/[Ww]alk|walk-proto\.css/);
    }
  });
  it('its files are deleted', () => {
    expect(files('src').filter((f) => /proto\/(walk|Walk)|walk-proto\.css/.test(f))).toEqual([]);
  });
});
