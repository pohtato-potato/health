// The repo is public: football code must never carry the owner's personal values (spec: privacy).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = ['src/football', 'src/screens/football'];
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = ROOTS.flatMap(walk).filter((f) => /\.(ts|tsx|json|css)$/.test(f));
const read = (f: string) => readFileSync(f, 'utf8');
const PRIVATE = 'private/football-youth.json';

describe('privacy guard', () => {
  it('finds the football files', () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.skipIf(!existsSync(PRIVATE))('no football file holds a value from the private youth file', () => {
    const rows = JSON.parse(read(PRIVATE)) as Record<string, unknown>[];
    // Single generic words ("Rows") say nothing personal; names and notes of two words or more do.
    const values = rows.flatMap((r) => [r.name, r.what]).filter((v): v is string => typeof v === 'string' && v.trim().split(/\s+/).length >= 2);
    const hits = files.flatMap((f) => values.filter((v) => read(f).includes(v)).map(() => f));
    expect(hits).toEqual([]);
  });

  it('no football file names body loads, knees, doses or medicines', () => {
    const bad = [/kg"/, /\bknees?\b/i, /\d\s*mg\b/i, /\bmg\b/, /\b[a-z]{3,}(prazole|olol|statin|cillin|mycin|sartan|tidine|profen|pril)\b/i];
    const hits = files.flatMap((f) => bad.filter((re) => re.test(read(f))).map((re) => `${f} ${re}`));
    expect(hits).toEqual([]);
  });

  it('the public league data has no exercise youth entries', () => {
    const league = JSON.parse(read('src/football/data/league.json')) as { youth: { kind?: string }[] };
    expect(league.youth.filter((y) => y.kind === 'exercise')).toEqual([]);
  });
});
