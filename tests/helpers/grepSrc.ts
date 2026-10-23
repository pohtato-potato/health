import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every source file under src/ (.ts and .tsx) whose text matches. Paths are relative to the repo root. */
export function grepSrc(re: RegExp, dir = 'src'): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...grepSrc(re, p));
    else if (/\.tsx?$/.test(name) && re.test(readFileSync(p, 'utf8'))) out.push(p);
  }
  return out;
}
