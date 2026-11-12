// Watch tonight's opponent (spec §3): one die, no clock. Marks tonight's league opponent scouted for the tactics
// board through Fork A's read (`matchday.ts` readOf): style and weak side on a 3 or more, style only on a 1 or 2.
import { qualityOf, type JobDef } from '../types';

export const watch: JobDef = {
  id: 'watch',
  ink: '#ff9a4d',
  open: (v) => Boolean(v.opp),
  card: (v) => ({
    title: `Watch ${v.opp ? v.opp.name : "tonight's opponent"}`,
    line: v.oppKnown === 'full' ? 'Already scouted: their style and weak side.' : 'One die. Shows their plan.',
    chip: v.oppKnown === 'full' ? 'Scouted' : v.oppKnown === 'style' ? 'Style known' : 'New',
  }),
  blocked: (v) => (!v.opp ? 'No league match tonight' : v.oppKnown === 'full' ? 'Already scouted' : undefined),
  preview(die, v) {
    const full = qualityOf(die.value) !== 'badly';
    const name = v.opp?.name ?? 'Tonight’s opponent';
    return {
      head: full ? 'Done.' : 'Half a look.',
      line: full ? `${name}: their style and their weak side, on the tactics board tonight.` : `${name}: their style only. The weak side stays a guess.`,
      gain: full ? 'Style + side' : 'Style',
      others: full ? 'A 1 or 2 would show their style only.' : 'A 3 or more would show their weak side too.',
      effects: v.opp ? [{ kind: 'watch', club: v.opp.id, level: full ? 'full' : 'style' }] : [],
    };
  },
  spend(die, v) { return { effects: this.preview(die, v).effects }; },
};
