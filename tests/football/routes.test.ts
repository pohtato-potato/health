import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

describe('Football routes', () => {
  it('every Football path a screen links to is a route in App (no secret 404s)', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const files = [...walk('src/screens/football'), 'src/screens/today/FootballCard.tsx'].filter((f) => /\.tsx?$/.test(f));
    const used = new Set<string>();
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/(?:go\(\s*'|#)(\/football(?:\/[a-z-]+)?)/g)) used.add(m[1]);
    expect(used.size).toBeGreaterThan(5);
    for (const p of used) expect(app, p).toContain(`'${p}':`);
  });
});
