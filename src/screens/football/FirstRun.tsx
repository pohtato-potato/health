// The first run (spec §5.8): six short steps, every one skippable except the shirt. Finishing founds the club.
import { useState } from 'react';
import { dayOfLogging } from '../../domain/dates';
import { crestSvg } from '../../football/art/crest';
import { BRABO_KITS, kitSvg } from '../../football/art/kit';
import { foundClub } from '../../football/store/save';
import type { CrestOpt } from '../../football/store/tables';
import { AXES, type Axis } from '../../football/types';
import { Art } from './Tonight';

const CRESTS: CrestOpt[] = ['a', 'b', 'c', 'd', 'e'];
export const FIRST_SHIRTS = BRABO_KITS.A.map((k, i) => ({ id: `A${i + 1}`, kit: k }));
export const HABIT: Record<Axis, string> = {
  Pace: 'your steps',
  Power: 'your training sessions',
  Fuel: 'calories and protein in range',
  Rest: 'your sleep',
  Routine: 'your daily checklist',
  Shape: 'weigh-ins and the waist',
};
export const STEPS = ['Arrival', 'The crest', 'The shirt', 'Your squad', 'Old Selves', 'Tonight'] as const;
const SHIRT = 2;

export function FirstRun({ now = Date.now(), start = 0, onDone }: { now?: number; start?: number; onDone?: () => void }) {
  const [i, setI] = useState(start);
  const [crest, setCrest] = useState<CrestOpt>('a');
  const [shirt, setShirt] = useState<string | undefined>();
  const [captain, setCaptain] = useState<Axis | undefined>();
  const [busy, setBusy] = useState(false);
  const last = i === STEPS.length - 1;
  const finish = async () => {
    if (busy) return;
    setBusy(true);
    await foundClub(dayOfLogging(now), { shirt: shirt ?? FIRST_SHIRTS[0].id, crest, captain });
    onDone?.();
  };
  // Skipping never jumps the shirt: before it, Skip lands on the shirt.
  const next = () => (last ? void finish() : setI((x) => x + 1));
  const skip = () => (last ? void finish() : setI((x) => (x < SHIRT ? SHIRT : x + 1)));
  const canGo = i !== SHIRT || !!shirt;

  let body: React.ReactNode;
  switch (i) {
    case 0:
      body = (
        <>
          <p className="fb-story">Antwerp. A new club with no ground, no fans and one bag of balls. The landlords at the Kaai lend you their pitch on weeknights, as long as you lock up.</p>
          <p className="fb-story">Your days in Health are the squad. Every night they play.</p>
        </>
      );
      break;
    case 1:
      body = (
        <>
          <p className="fb-s">The landlords lend you their crest for now. Step 1 of 5: it grows as the club does.</p>
          <div className="fb-pick" role="radiogroup" aria-label="Crest">
            {CRESTS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={crest === c} className={`fb-pickone${crest === c ? ' on' : ''}`} onClick={() => setCrest(c)}>
                <Art svg={crestSvg(1, c, 56, `Crest option ${c.toUpperCase()}`)} />
                <span>{crest === c ? 'Picked' : c.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </>
      );
      break;
    case 2:
      body = (
        <>
          <p className="fb-s">The kit maker offers three shirts. Pick one; it can change each season.</p>
          <div className="fb-pick three" role="radiogroup" aria-label="Shirt">
            {FIRST_SHIRTS.map((s, k) => (
              <button key={s.id} type="button" role="radio" aria-checked={shirt === s.id} className={`fb-pickone${shirt === s.id ? ' on' : ''}`} onClick={() => setShirt(s.id)}>
                <Art svg={kitSvg(s.kit, 'front', 88, { label: `Shirt ${k + 1}` })} />
                <span>{shirt === s.id ? 'Picked' : `Shirt ${k + 1}`}</span>
              </button>
            ))}
          </div>
        </>
      );
      break;
    case 3:
      body = (
        <>
          <p className="fb-s">Each habit plays one axis, 1 to 20. Pick a captain if you like: that axis gets the armband.</p>
          <ul className="fb-map">
            {AXES.map((a) => (
              <li key={a}>
                <button type="button" aria-pressed={captain === a} className={`fb-maprow${captain === a ? ' on' : ''}`} onClick={() => setCaptain(captain === a ? undefined : a)}>
                  <b>{a}{captain === a ? ' [C]' : ''}</b><span>{HABIT[a]}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      );
      break;
    case 4:
      body = <p className="fb-story">Your past months in Health become clubs in the league, from day one. Beat the old you, or don’t.</p>;
      break;
    default:
      body = <p className="fb-story">Your first fixture is tonight, against the bottom club. Close the day to kick off, or it plays itself at 4 am.</p>;
  }

  return (
    <section className="fb-first" aria-label="First run">
      <div className="fb-row"><span className="fb-lb">{STEPS[i]}</span><span className="fb-s">{i + 1} of {STEPS.length}</span></div>
      <ol className="fb-dots" aria-hidden="true">{STEPS.map((_, k) => <li key={k} className={k <= i ? 'on' : ''} />)}</ol>
      {body}
      {!canGo && <p className="fb-s">Pick a shirt to go on.</p>}
      <div className="fb-btns">
        {i !== SHIRT && <button type="button" className="fb-btn" onClick={skip}>Skip</button>}
        <button type="button" className="fb-btn pri" disabled={!canGo || busy} onClick={next}>{last ? 'Found the club' : 'Next'}</button>
      </div>
    </section>
  );
}
