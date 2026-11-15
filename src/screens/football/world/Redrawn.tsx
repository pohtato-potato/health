// The world redrawn (LG-4, league spec §11): the one screen a world-1 save is moved from. It says why, shows where
// Brabo would be placed and against which clubs, the founding weeks' record, and has one action. Nothing moves until
// the owner taps it. After the move the same route shows the arrival once: what the club was given for its stage.
import { useEffect, useState } from 'react';
import { leagueMatchdays } from '../../../football/calendar';
import { ERAS, TECHS } from '../../../football/content/tree';
import { bundleById } from '../../../football/ground';
import { FOUNDING_NAME } from '../../../football/pyramid/redraw';
import { shapeOf } from '../../../football/pyramid/shape';
import { planRedraw, redrawWorld, type RedrawPlan } from '../../../football/store/redraw';
import { db } from '../../../db/db';
import { dayOfLogging } from '../../../domain/dates';
import { useSave } from '../../../football/store/hooks';
import { go } from '../../../router';
import { Action, Hero, Panel, Sect, Title } from '../../../ui/kit/Kit';
import type { FbSave } from '../../../football/store/tables';

const GOLD = '#f2c46d';
const S2 = shapeOf({ world: 2 });
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** /football/redrawn */
export function Redrawn() {
  const save = useSave();
  if (save === undefined) return null;
  if (!save) return <p className="fb-s">Football starts once you found the club.</p>;
  if (save.world === 2) return <Arrived save={save} />;
  return <Before />;
}

function Before() {
  const [plan, setPlan] = useState<RedrawPlan | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void planRedraw(dayOfLogging(Date.now())).then((p) => { if (live) setPlan(p ?? null); });
    return () => { live = false; };
  }, []);
  if (!plan) return (
    <>
      <Title under="Ninety-six real clubs in eight divisions of twelve">The world redrawn</Title>
      <p className="fb-s" role="status">Playing your recent nights against every division…</p>
    </>
  );
  const md = leagueMatchdays(2);
  const r = plan.rate;
  const [w, d] = [Math.round(r.w * md), Math.round(r.d * md)];
  const f = plan.founding;
  return (
    <>
      <Title under="Ninety-six real clubs in eight divisions of twelve">The world redrawn</Title>
      <p className="fb-s">
        The league is rebuilt around peers. The made-up clubs retire; every club now is a real one, and a division is a
        place where your nights win about half the time. Seasons are 28 days. Your players, cards, the tree, money,
        kits and crest all come with you.
      </p>
      <Sect>Where Brabo start</Sect>
      <Hero value={plan.division} ink={`var(--fb-t${plan.division})`} label={plan.divisionName} under={`of ${S2.divisions.length} divisions`} />
      <Panel ink={`var(--fb-t${plan.division})`}>
        {plan.nights === 0 ? (
          <p className="fb-s" style={{ margin: 0 }}>No nights logged in the last four weeks yet, so Brabo start at the bottom and climb from there.</p>
        ) : <p className="fb-s" style={{ margin: 0 }}>
          Your last {plan.nights} {plan.nights === 1 ? 'night' : 'nights'}{plan.short ? ' (fewer than four weeks, so this is a first guess)' : ''}, played against
          every division, would win {pct(r.w)} here. Over a season of {md} matchdays that is about <b>{w} won, {d} drawn, {md - w - d} lost</b>.
        </p>}
      </Panel>
      <Sect>Who you meet</Sect>
      <ul className="fb-redrawn-vs">
        {plan.vs.map((id) => <li key={id}>{plan.names[id] ?? id}</li>)}
      </ul>
      <p className="fb-s">Your ground is rented: {plan.names.kbs ?? 'Berchem Sport'}’s Het Rooi. The big neighbour, and your rival, is {plan.names.rafc ?? 'Royal Antwerp'}.</p>
      <Sect>{FOUNDING_NAME}</Sect>
      <Panel flat>
        <p className="fb-s" style={{ margin: 0 }}>
          Kept in the record book as season 0: played {f.p}, won {f.w}, drawn {f.d}, lost {f.l}, goals {f.gf}–{f.ga}. Every match stays readable.
        </p>
      </Panel>
      <Action wide disabled={busy} onClick={() => { setBusy(true); void redrawWorld(Date.now()).then(() => go('/football/redrawn', undefined, { replace: true })); }}>
        {busy ? 'Drawing the new world…' : `Start Season ${plan.save.season} in ${plan.divisionName}`}
      </Action>
    </>
  );
}

/** Shown once after the move: what the club was given for the stage it starts at. */
function Arrived({ save }: { save: FbSave }) {
  const r = save.redrawn;
  if (!r) return <p className="fb-s">The club is already in the new world.</p>;
  const g = r.gifts;
  const done = async () => {
    const cur = await db.fbSave.get('save');
    if (cur?.redrawn) await db.fbSave.put({ ...cur, redrawn: { ...cur.redrawn, seen: true } });
    go('/football', undefined, { replace: true });
  };
  return (
    <>
      <Title under={`Season ${save.season} starts in ${S2.name(r.division)}`}>The club has arrived</Title>
      <Hero value={r.division} ink={GOLD} label={S2.name(r.division)} under={`of ${S2.divisions.length} divisions · ${r.vs.length} clubs to meet`} />
      <Sect>Given for the stage</Sect>
      <Panel flat>
        <ul className="fb-redrawn-gifts">
          <li>Eras open: {g.eras.map((e) => ERAS.find((x) => x.id === e)?.name ?? e).join(', ')}</li>
          {g.techs.length > 0 && <li>{g.techs.length} {g.techs.length === 1 ? 'idea' : 'ideas'} researched, free: {g.techs.slice(0, 4).map((t) => TECHS.find((x) => x.id === t)?.name ?? t).join(', ')}{g.techs.length > 4 ? ' and more' : ''}</li>}
          {g.buildings.length > 0 && <li>Built at the ground: {g.buildings.map((b) => bundleById(b).name).join(', ')}</li>}
          {g.crest && <li>A new crest step to choose</li>}
          {!g.techs.length && !g.buildings.length && !g.crest && <li>Nothing more: the club had all of it already.</li>}
        </ul>
      </Panel>
      {r.founding.p > 0 && <Panel flat>
        <p className="fb-s" style={{ margin: 0 }}>{FOUNDING_NAME}: played {r.founding.p}, won {r.founding.w}, drawn {r.founding.d}, lost {r.founding.l}. In the record book as season 0.</p>
      </Panel>}
      <Action wide onClick={() => void done()}>To Tonight</Action>
    </>
  );
}

/** On Tonight: the way in, while the save is in the old world, and the arrival once after the move. */
export function RedrawnDoor() {
  const save = useSave();
  if (!save) return null;
  const before = save.world !== 2;
  if (!before && (!save.redrawn || save.redrawn.seen)) return null;
  return (
    <Panel ink={GOLD} onClick={() => go('/football/redrawn')} label={before ? 'The world redrawn: see where Brabo start' : 'The club has arrived: see what came with it'}>
      <b style={{ font: '600 20px var(--serif)' }}>{before ? 'The world redrawn' : 'The club has arrived'}</b>
      <p className="fb-s" style={{ margin: '4px 0 0' }}>{before ? 'Real clubs, eight divisions of twelve. See where Brabo start.' : 'See what the club was given for its stage.'}</p>
    </Panel>
  );
}
