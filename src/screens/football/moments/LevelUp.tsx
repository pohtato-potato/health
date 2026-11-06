// The crest level-up: the old crest dims, a line of light traces the new one, then pick from five or keep.
import { useState } from 'react';
import { crestSvg, type CrestOptKey, type CrestStep } from '../../../football/art/crest';
import { CREST_CHANGES, CREST_LINES, levelUpOptions } from '../../../football/kits';
import { Aurora } from '../FootballHome';
import { Art } from '../Tonight';

export function LevelUpView({ from, step, onPick }: { from: { step: CrestStep; opt: CrestOptKey }; step: CrestStep; onPick: (o: CrestOptKey | 'keep') => void }) {
  const opts = levelUpOptions(step);
  const [sel, setSel] = useState<CrestOptKey | 'keep'>('a');
  const shown = sel === 'keep' ? from : { step, opt: sel };
  return (
    <div className="fb-moment" role="dialog" aria-modal="true" aria-labelledby="fb-lvl-t">
      <Aurora c="#7fe0a8">
        <main className="fb-page">
          <span className="fb-lb">Promoted · club level up</span>
          <div className="fb-lvst">
            <span className="fb-oldcrest"><Art svg={crestSvg(from.step, from.opt, 84)} /></span>
            <span aria-hidden="true" className="fb-s">→</span>
            <span className="fb-newcrest"><Art svg={crestSvg(shown.step, shown.opt, 112)} /></span>
          </div>
          <h2 id="fb-lvl-t" className="fb-momtitle">{CREST_LINES[step]}</h2>
          <p className="fb-s">{sel === 'keep' ? 'Keep the crest you have. Old crests come back on the anniversary kit.' : `Step ${step} of 5, option ${sel.toUpperCase()}. ${CREST_CHANGES[step]}`}</p>
          <div className="fb-kitgrid" role="radiogroup" aria-label="Crest options">
            {opts.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={sel === o} className={`fb-kitopt${sel === o ? ' on' : ''}`} onClick={() => setSel(o)}>
                {o === 'keep' ? <span className="fb-keep">Keep</span> : <Art svg={crestSvg(step, o, 52)} />}
                <span className="fb-s">{o === 'keep' ? 'The old one' : `Option ${o.toUpperCase()}`}</span>
              </button>
            ))}
          </div>
          <div className="fb-btns"><button type="button" className="fb-btn pri" onClick={() => onPick(sel)}>Wear it</button></div>
        </main>
      </Aurora>
    </div>
  );
}
