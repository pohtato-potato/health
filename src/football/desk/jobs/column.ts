// Your column or fan mail (spec §3): one die, no clock. Pick a line; it runs in tomorrow's paper. Lines only: no
// points, no morale, no odds. The die only decides where the paper puts it.
import { qualityOf, type JobDef } from '../types';

const PLACE = { well: 'on the back page, in big type', does: 'in the club notes', badly: 'on page nine, under the tide times' } as const;

export const column: JobDef = {
  id: 'column',
  ink: '#f2c46d',
  open: (v) => v.columnLines.length > 0,
  card: (v) => ({ title: 'Your column', line: 'Pick a line for tomorrow’s paper.', chip: v.spentToday.column ? 'Written' : 'New' }),
  blocked: (v) => (v.spentToday.column ? 'One column a day' : undefined),
  targets: (v) => v.columnLines.map((l) => ({ id: l.id, name: l.text })),
  preview(die, v, target) {
    const q = qualityOf(die.value);
    const l = v.columnLines.find((x) => x.id === target) ?? v.columnLines[0];
    return {
      head: q === 'well' ? 'It lands.' : q === 'does' ? 'It runs.' : 'It runs, just.',
      line: `Tomorrow it runs ${PLACE[q]}.`,
      gain: q === 'well' ? 'Back page' : q === 'does' ? 'Notes' : 'Page 9',
      others: 'Words only: it never changes a match.',
      effects: l ? [{ kind: 'column', line: l.id, text: l.text }] : [],
    };
  },
  spend(die, v, target) { return { effects: this.preview(die, v, target).effects }; },
};
