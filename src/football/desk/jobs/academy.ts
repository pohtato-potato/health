// Academy session (spec §3): one die, no clock. One youngster of your choice grows; more on a high die.
// Growth only: promotion still needs the sessions of the youngster's own habit.
import { qualityOf, type JobDef } from '../types';

/** Growth a session adds: 2 on a 5 or 6, 1 on a 3 or 4, half on a 1 or 2. */
export const ACADEMY_GROWTH = { well: 2, does: 1, badly: 0.5 } as const;

export const academy: JobDef = {
  id: 'academy',
  ink: '#c2b2ff',
  open: (v) => v.youth.length > 0,
  card: (v) => ({ title: 'Academy session', line: `One youngster grows. ${v.youth.length} in the academy.`, chip: v.spentToday.academy ? 'Done today' : 'New' }),
  blocked: (v) => (v.spentToday.academy ? 'One session a day' : !v.youth.length ? 'Nobody growing in the academy' : undefined),
  targets: (v) => v.youth.map((y) => ({ id: y.id, name: y.name, line: `${y.axis} · ${y.potential} stars · growth ${y.growth}` })),
  preview(die, v, target) {
    const q = qualityOf(die.value), n = ACADEMY_GROWTH[q];
    const y = v.youth.find((x) => x.id === target) ?? v.youth[0];
    return {
      head: q === 'well' ? 'A great session.' : q === 'does' ? 'A good session.' : 'A scrappy session.',
      line: `${y?.name ?? 'A youngster'} grows by ${n} tonight.`,
      gain: `+${n}`,
      others: q === 'well' ? 'A 3 or 4 would add 1, a 1 or 2 half.' : q === 'does' ? 'A 5 or 6 would add 2, a 1 or 2 half.' : 'A 3 or 4 would add 1, a 5 or 6 would add 2.',
      effects: y ? [{ kind: 'grow', youth: y.id, n }] : [],
    };
  },
  spend(die, v, target) { return { effects: this.preview(die, v, target).effects }; },
};
