// Writes the run's own report (report.md in --out): the plan, what the owner's path managed, the flags by kind,
// the routes found and the ones never reached. The fork's reading of the pictures goes in a separate findings file.
import fs from 'node:fs';
import path from 'node:path';
import { KINDS } from './plan.mjs';

const rel = (out, f) => (f ? path.relative(out, f) : '');

export function writeReport(out, { plan, days, result, routes, router, seconds }) {
  const L = [];
  L.push(`# The week played forward: automatic report`, '');
  L.push(`Run took ${Math.round(seconds)} s. ${routes.routes.size} routes found by clicking every control; ${routes.overlays.length} overlays (sheets, “?”, popovers).`, '');
  L.push('## The plan', '');
  for (const p of plan) L.push(`- **${p.date}** ${p.kind}${p.train ? ', training' : ''}${p.onceOff.length ? `, once-off: ${p.onceOff.join(', ')}` : ''}: ${KINDS[p.kind]}`);
  L.push('', '## The owner’s path, step by step', '');
  for (const d of days) {
    L.push(`### ${d.date} (${d.kind})`, '');
    if (!d.opened) L.push('- The app was not opened.');
    for (const s of d.steps) L.push(`- ${s.ok ? '✓' : '✗'} ${s.name}${s.note ? `: ${s.note}` : ''}${s.acks?.length ? ` — said: ${s.acks.map((a) => `“${a.slice(0, 90)}”`).join('; ')}` : ''}${s.moments?.length ? ` — moment: ${s.moments.map((a) => `“${a.slice(0, 90)}”`).join('; ')}` : ''}${s.shot ? ` ([picture](${rel(out, s.shot)}))` : ''}`);
    const f = d.evening?.football;
    if (f) L.push(`- State at night: season ${f.season} day ${f.day}, ${f.division ? `division ${f.division}, ` : ''}place ${f.place ?? '?'}, budget ${f.budget}, staff ${f.staff.length}, sponsors ${f.sponsors.length}, research ${f.research?.earned}, steps ${d.evening.day?.steps ?? '—'}`);
    L.push('');
  }
  const by = {};
  for (const f of result.flags) (by[f.check] ??= []).push(f);
  L.push('## Flags', '', `${result.flags.length} in all.`, '');
  for (const [k, fs_] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
    L.push(`### ${k} (${fs_.length})`, '');
    for (const f of fs_.slice(0, 60)) L.push(`- ${f.days.join(', ')} · \`${f.route}\` · ${f.evidence}${f.shot ? ` ([picture](${rel(out, f.shot)}))` : ''}`);
    if (fs_.length > 60) L.push(`- …and ${fs_.length - 60} more in flags.json`);
    L.push('');
  }
  L.push('## Routes', '');
  L.push(`Router pages never reached by a door: ${result.unreached.pages.join(', ') || 'none'}.`);
  L.push(`Sheets never opened by a door: ${result.unreached.sheets.join(', ') || 'none'}.`, '');
  for (const [key, r] of routes.routes) L.push(`- \`${key}\` ← ${r.from} (“${r.label.slice(0, 50)}”)${r.variants > 1 ? ` · ${r.variants} doors` : ''}`);
  fs.writeFileSync(path.join(out, 'report.md'), L.join('\n'));
}
