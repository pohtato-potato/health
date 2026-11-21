// Club level up (board 23, m23-level): the crest in a gold orb; keep the old one or wear the new step. The new step
// still comes in five options, picked under it.
import { useState } from 'react';
import { crestSvg, type CrestOptKey, type CrestStep } from '../../../football/art/crest';
import { CREST_CHANGES, CREST_LINES } from '../../../football/kits';
import { Art } from '../Tonight';
import { MomentLayer } from './Layer';
import { MomentPage, Orb } from './Orb';

const OPTS: CrestOptKey[] = ['a', 'b', 'c', 'd', 'e'];
const GOLD = '#ffd36b';

/** The page itself, without the layer it sits in. */
export function LevelUp({ from, step, onPick, start = 'a' }: { from: { step: CrestStep; opt: CrestOptKey }; step: CrestStep; onPick: (o: CrestOptKey | 'keep') => void; start?: CrestOptKey | 'keep' }) {
  const [sel, setSel] = useState<CrestOptKey | 'keep'>(start);
  const [opt, setOpt] = useState<CrestOptKey>(start === 'keep' ? 'a' : start);
  const keep = sel === 'keep';
  const shown = keep ? from : { step, opt };
  return (
    <MomentPage colour={GOLD} titleId="fb-lvl-t" title="Club level up" sub={`Step ${step} of 5`} action={keep ? 'Keep it' : 'Wear it'} onAction={() => onPick(sel)}
      hero={<Orb colour={GOLD} rays={16}><Art svg={crestSvg(shown.step, shown.opt, 104)} /></Orb>}>
      <p className="mo-lead">{keep ? 'Keep the crest you have. Old crests come back on the anniversary kit.' : `${CREST_LINES[step]}. ${CREST_CHANGES[step]}`}</p>
      <div className="mo-opt" role="radiogroup" aria-label="Your crest">
        <button type="button" role="radio" aria-checked={keep} className={keep ? 'on' : undefined} onClick={() => setSel('keep')}><Art svg={crestSvg(from.step, from.opt, 56)} />Keep</button>
        <button type="button" role="radio" aria-checked={!keep} className={keep ? undefined : 'on'} onClick={() => setSel(opt)}><Art svg={crestSvg(step, opt, 56)} />The new step</button>
      </div>
      {!keep && (
        <div className="mo-pick" role="radiogroup" aria-label="Options for the new step">
          {OPTS.map((o) => <button key={o} type="button" role="radio" aria-checked={opt === o} aria-label={`Option ${o.toUpperCase()}`} className={opt === o ? 'on' : undefined} onClick={() => { setOpt(o); setSel(o); }}><Art svg={crestSvg(step, o, 36)} /></button>)}
        </div>
      )}
    </MomentPage>
  );
}

export function LevelUpView(p: { from: { step: CrestStep; opt: CrestOptKey }; step: CrestStep; onPick: (o: CrestOptKey | 'keep') => void }) {
  return (
    <MomentLayer role="dialog" aria-modal="true" aria-labelledby="fb-lvl-t">
      <LevelUp {...p} />
    </MomentLayer>
  );
}
