// Study a loan target (desk spec §3, Fork 3): a die on a clock of 2. The first segment uncovers the player's rating
// and signature move; the second, where their club will give in talks and where it won't. Better knowledge gives
// leverage in talks (market/market.ts `pushOdds`). The study shows at once: no report to wait for.
import { leadTaken, studiedIn } from './leads';
import { STUDY_CLOCK, studyClockId, targetKnown } from '../../market/market';
import { loanById } from '../../globe/loans';
import { segmentsFor, type Clock, type DeskView, type Die, type Effect, type JobDef, type Target } from '../types';

const studyClock = (v: DeskView, key: string) => v.clocks.find((c) => c.id === studyClockId(key));
const open = (v: DeskView) => (v.market?.leads ?? []).filter((l) => !leadTaken(v, l.key) && studiedIn(v, l.key) < STUDY_CLOCK);

const UNCOVERS = ['', 'their rating and signature move', 'where their club will give, and where it won’t'];
function plan(die: Die, v: DeskView, key: string) {
  const lead = v.market!.leads.find((l) => l.key === key)!;
  const had = studiedIn(v, key), n = segmentsFor(die.value), after = Math.min(STUDY_CLOCK, had + n);
  const found = [had < 1 && after >= 1 ? UNCOVERS[1] : '', had < 2 && after >= 2 ? UNCOVERS[2] : ''].filter(Boolean).join(', and ');
  const clock: Omit<Clock, 'opened'> = { id: studyClockId(key), job: 'study', target: key, name: `Study: ${loanById(lead.loan)?.name ?? 'a target'}`, size: STUDY_CLOCK };
  return { lead, had, n, after, found, clock, fresh: !studyClock(v, key) };
}

export const study: JobDef = {
  id: 'study',
  ink: '#c3a6f2',
  open: (v) => open(v).length > 0,
  card: (v) => {
    const going = v.clocks.find((c) => c.job === 'study' && c.filled < c.size);
    const left = open(v).length;
    return {
      title: 'Study a loan target', ask: 'Who do you study?',
      line: going ? `${going.name.replace(/^Study: /, '')}: ${going.filled} of ${going.size}. Knowing more gives you leverage in talks.` : `${left} ${left === 1 ? 'target' : 'targets'} in the market. Knowing more gives you leverage in talks.`,
      chip: going ? `${going.filled} of ${going.size}` : 'New',
      ring: going ? { filled: going.filled, size: going.size } : undefined,
    };
  },
  targets: (v): Target[] => open(v).map((l) => ({ id: l.key, name: `${loanById(l.loan)?.name ?? 'A target'}, ${l.clubName}`, line: `${loanById(l.loan)?.unit ?? ''} · known ${targetKnown(studiedIn(v, l.key))}% · ${studiedIn(v, l.key)} of ${STUDY_CLOCK} studied` })),
  blocked: (v) => (open(v).length ? undefined : 'Every target is studied'),
  preview(die, v, target) {
    const key = target ?? open(v)[0]?.key;
    if (!key || !v.market?.leads.some((l) => l.key === key)) return { head: 'Nothing to study.', line: 'A scout’s 6 can turn up a loan target.', gain: '0', others: '', effects: [] };
    const p = plan(die, v, key);
    const name = loanById(p.lead.loan)?.name ?? 'The target';
    return {
      head: die.value >= 5 ? 'Great.' : 'Done.',
      line: `${name}: you learn ${p.found}. Known ${targetKnown(p.had)}% to ${targetKnown(p.after)}%.`,
      gain: `+${Math.min(p.n, STUDY_CLOCK - p.had)}`,
      others: p.n === 2 ? 'A 1 to 4 would fill one.' : p.had === 0 ? 'A 5 or 6 would study them in one go.' : 'Any die finishes it.',
      effects: effectsOf(p),
    };
  },
  spend(die, v, target) {
    const key = target ?? open(v)[0]?.key;
    if (!key) return { effects: [] };
    const p = plan(die, v, key);
    return { effects: effectsOf(p), ...(p.fresh ? { opens: [p.clock] } : {}) };
  },
};

const effectsOf = (p: ReturnType<typeof plan>): Effect[] => [{ kind: 'clock', clock: p.clock.id, n: Math.min(p.n, STUDY_CLOCK - p.had) }];
