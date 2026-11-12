// Push a building project (spec §3, content/projects.ts): a die adds to the project's own clock, its needs. Like any
// clock: 1 day on the least-finished need, or 2 on a 5 or 6. Never backwards; the money is still paid as before.
import { qualityOf, segmentsFor, type JobDef } from '../types';

export const project: JobDef = {
  id: 'project',
  ink: '#ffd36b',
  open: (v) => v.projects.length > 0,
  card: (v) => {
    const p = v.projects[0];
    return { title: v.projects.length === 1 ? p.name : 'Push a building project', ask: v.projects.length === 1 ? `Push on with ${p.name}?` : 'Which project gets the day?', line: v.projects.length === 1 ? 'A die adds a day to it, two on a 5 or 6.' : `${v.projects.length} being built. A die adds a day, two on a 5 or 6.`, chip: v.projects.length === 1 ? `${fmt(p.worst.have)} of ${fmt(p.worst.count)}` : 'Pick one', ring: v.projects.length === 1 ? { filled: p.worst.have, size: p.worst.count } : undefined };
  },
  targets: (v) => v.projects.map((p) => ({ id: p.id, name: p.name, line: `${fmt(p.worst.have)} of ${fmt(p.worst.count)} ${p.worst.what}` })),
  preview(die, v, target) {
    const n = segmentsFor(die.value), q = qualityOf(die.value);
    const p = v.projects.find((x) => x.id === target) ?? v.projects[0];
    return {
      head: q === 'well' ? 'Great.' : 'Done.',
      line: p ? `${p.name}: ${n === 2 ? 'two days' : 'a day'} added to ${p.worst.what} (${fmt(p.worst.have)} of ${fmt(p.worst.count)}).` : 'Nothing being built.',
      gain: `+${n}`,
      others: n === 2 ? 'A 1 to 4 would add one.' : 'A 5 or 6 would add two.',
      effects: p ? [{ kind: 'project', id: p.id, n }] : [],
    };
  },
  spend(die, v, target) { return { effects: this.preview(die, v, target).effects }; },
};
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
