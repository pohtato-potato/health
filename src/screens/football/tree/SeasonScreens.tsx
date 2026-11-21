// The season run (round six, pinned; track stars centred in round eight): pick a boon, the season track, bounties.
import type { CSSProperties } from 'react';
import { BOUNTIES, BOUNTIES_PICKED, BOON_DAYS, BOON_DAYS_2 } from '../../../football/content/season';
import { trackOf } from '../../../football/tree/season';
import { seasonLength } from '../../../football/calendar';
import { worldOf } from '../../../football/pyramid/shape';
import { pickBoon, pickBounty } from '../../../football/store/treeActions';
import { boonsThisSeason, bountiesPicked, bountyOffer, bountyProgress, isTrainingBounty } from '../../../football/tree/season';
import { fmtCount } from '../../../football/tree/words';
import { BOONS } from '../../../football/content/season';
import { useModel } from './model';
import { Hero, Panel, Sect, Title } from '../../../ui/kit/Kit';
import { Icon } from '../../../ui/Icon';
import { MarkRow, Note } from '../club/Bits';

const GOLD = '#f2c46d';
const BOON_COLOURS = ['#93c3dc', '#8fdcb6', '#c2b2ff', '#ffd56a'];
const STAR = <svg className="fbt-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" /></svg>;

/** Pick one boon for this season (1 of 3). */
export function BoonPage() {
  const m = useModel();
  if (!m) return null;
  const s = m.t.save;
  const held = boonsThisSeason(m.user, s.season).map((id) => BOONS.find((b) => b.id === id)!);
  return (
    <div className="k-page">
      <Title under={`Season ${s.season} · day ${Math.min(s.day, seasonLength(worldOf(s)))}${m.boonPick ? ` · boon ${m.boonPick > 3 ? 'extra' : `${m.boonPick} of 3`}` : ''}`}>{m.boonPick ? 'Pick one for this season' : 'This season’s boons'}</Title>
      {m.boonPick ? (
        <div className="kb-rows">
          {m.boonOffer.map((b, i) => (
            <Panel key={b.id} ink={BOON_COLOURS[i % BOON_COLOURS.length]} onClick={() => void pickBoon(b.id)} label={`Pick ${b.name}`}>
              <b style={{ color: BOON_COLOURS[i % BOON_COLOURS.length] }}>{b.name}</b><span className="k-q">{b.text}</span>
            </Panel>
          ))}
        </div>
      ) : <Note>The next pick comes on day {(worldOf(s) === 2 ? BOON_DAYS_2 : BOON_DAYS).find((d) => d > s.day) ?? 'one of next season'}.</Note>}
      {held.length > 0 && (
        <>
          <Sect>Held this season</Sect>
          <div className="kb-rows">
            {held.map((b, i) => <Panel key={b.id} ink={BOON_COLOURS[i % BOON_COLOURS.length]}><MarkRow icon="check" c={BOON_COLOURS[i % BOON_COLOURS.length]} name={b.name} line={b.text} /></Panel>)}
          </div>
        </>
      )}
      <Note>Boons last this season only. They're the one thing a new season resets.</Note>
    </div>
  );
}

/** The season track: one step for each day you log anything, big rewards along it (look pass L4: on the kit). */
export function TrackPage() {
  const m = useModel();
  if (!m) return null;
  const n = m.track;
  // The track for this save's world (42 steps, or 28 in world 2); big rewards are anything but the small album cards.
  const TRACK = trackOf(worldOf(m.t.save));
  const big = TRACK.filter((s) => s.reward && s.reward.kind !== 'album-card');
  return (
    <div className="k-page lt-story">
      <Hero value={n} ink={GOLD} label={`of ${TRACK.length} steps`} under="One for every day you log anything." />
      <div className="lt-steps all" role="img" aria-label={`${n} of ${TRACK.length} steps reached`}>
        {TRACK.map((s) => <i key={s.step} className={`${s.step <= n ? 'dn' : ''}${s.step === n + 1 ? ' now' : ''}${s.reward && s.reward.kind !== 'album-card' ? ' rw' : s.reward ? ' sm' : ''}`} />)}
      </div>
      <span className="k-q">Small marks are album cards. A missed day can be caught up with a bounty.</span>
      <Sect>The big rewards</Sect>
      <div className="kb-rows">
        {big.map((s) => (
          <Panel key={s.step} ink={s.step <= n ? GOLD : undefined} className="lt-reward">
            <span className="lt-rw">{s.step <= n ? <Icon name="check" size={20} stroke={2.6} color={GOLD} /> : STAR}<b>{s.label}</b><span className="k-q">Step {s.step}</span></span>
          </Panel>
        ))}
      </div>
    </div>
  );
}

type BountyDef = (typeof BOUNTIES)[number];
const POSTER_INK = ['#8fdcb6', '#ffd36b', '#ff9a76', '#c2b2ff', '#93c3dc', '#f4aedb'];
const POSTER_TILT = [-2, 1.5, -1, 2, -1.5, 1];

/** This week's bounties as wanted posters (board 20, s20-bounty): six offered, pick three, each reward stamped on. */
export function BountyPosters({ offer, picked, done, have, full, onPick }: {
  offer: BountyDef[]; picked: string[]; done: string[]; have: (b: BountyDef) => number; full: boolean; onPick: (id: string) => void;
}) {
  return (
    <div className="wp20-wall">
      <p className="wp20-h"><b className="wp20-n">{picked.length}</b><span>of {BOUNTIES_PICKED} picked this week<small>{full ? 'Each lasts until Sunday. Done ones pay out the morning after.' : `Pick ${BOUNTIES_PICKED - picked.length} more; each lasts until Sunday.`}</small></span></p>
      <div className="wp20">
        {offer.map((b, i) => {
          const on = picked.includes(b.id), dn = done.includes(b.id);
          const n = Math.min(b.target.count, have(b));
          return (
            <button key={b.id} type="button" className={`wp20-p${on ? ' on' : ''}${dn ? ' dn' : ''}`} disabled={on || full} aria-pressed={on} onClick={() => onPick(b.id)}
              style={{ '--c2': POSTER_INK[i % POSTER_INK.length], '--r': `${POSTER_TILT[i % POSTER_TILT.length]}deg`, '--d': `${0.15 + i * 0.12}s` } as CSSProperties}>
              <small>{dn ? <><Icon name="check" size={16} stroke={2.8} color="#1f6a3a" /> Done</> : on ? `Picked · ${fmtCount(n)} of ${b.target.count}` : 'Wanted this week'}</small>
              <b>{b.name}</b>
              {isTrainingBounty(b) && <span className="wp20-tag">Training</span>}
              <p>{b.text}</p>
              {on && !dn && <span className="wp20-bar" role="img" aria-label={`${fmtCount(n)} of ${b.target.count}`}><i style={{ width: `${Math.round((n / b.target.count) * 100)}%` }} /></span>}
              <em>Reward: {rewardWords(b.reward)}</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BountiesPage() {
  const m = useModel();
  if (!m) return null;
  const picked = bountiesPicked(m.user, m.week);
  const offered = bountyOffer(m.week);
  // A pick from before the offer always held a training job stays on the list.
  const offer = [...offered, ...BOUNTIES.filter((b) => picked.includes(b.id) && !offered.some((o) => o.id === b.id))];
  const done = offer.filter((b) => m.eng.bountiesDone.includes(`${m.week}:${b.id}`)).map((b) => b.id);
  return (
    <div className="k-page lt-story">
      <BountyPosters offer={offer} picked={picked} done={done} full={picked.length >= BOUNTIES_PICKED}
        have={(b) => bountyProgress(m.eng, b, m.week, m.t.today)} onPick={(id) => void pickBounty(id)} />
    </div>
  );
}
function rewardWords(r: (typeof import('../../../football/content/season'))['BOUNTIES'][number]['reward']): string {
  switch (r.kind) {
    case 'research': return `${r.n} research`;
    case 'pack': return 'A pack';
    case 'album-card': return 'An album card';
    case 'track-catchup': return 'A track step caught up';
    case 'boon-pick': return 'An extra boon pick';
    default: return 'A reward';
  }
}
