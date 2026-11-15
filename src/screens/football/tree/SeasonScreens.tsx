// The season run (round six, pinned; track stars centred in round eight): pick a boon, the season track, bounties.
import type { CSSProperties } from 'react';
import { BOUNTIES, BOUNTIES_PICKED, TRACK } from '../../../football/content/season';
import { pickBoon, pickBounty } from '../../../football/store/treeActions';
import { boonsThisSeason, bountiesPicked, bountyOffer, bountyProgress, isTrainingBounty } from '../../../football/tree/season';
import { fmtCount } from '../../../football/tree/words';
import { BOONS } from '../../../football/content/season';
import { useModel } from './model';
import { Hero, Panel, Sect, Title } from '../../../ui/kit/Kit';
import { Icon } from '../../../ui/Icon';
import { MarkRow, Note } from '../club/Bits';

const col = (c: string) => ({ ['--ink' as string]: c }) as CSSProperties;
const GOLD = '#f2c46d', GREEN = '#8fdcb6';
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
      <Title under={`Season ${s.season} · day ${s.day}${m.boonPick ? ` · boon ${m.boonPick > 3 ? 'extra' : `${m.boonPick} of 3`}` : ''}`}>{m.boonPick ? 'Pick one for this season' : 'This season’s boons'}</Title>
      {m.boonPick ? (
        <div className="kb-rows">
          {m.boonOffer.map((b, i) => (
            <Panel key={b.id} ink={BOON_COLOURS[i % BOON_COLOURS.length]} onClick={() => void pickBoon(b.id)} label={`Pick ${b.name}`}>
              <b style={{ color: BOON_COLOURS[i % BOON_COLOURS.length] }}>{b.name}</b><span className="k-q">{b.text}</span>
            </Panel>
          ))}
        </div>
      ) : <Note>The next pick comes on day {[1, 15, 29].find((d) => d > s.day) ?? 'one of next season'}.</Note>}
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

/** This week's bounties: six offered, pick three. Each lasts the week (look pass L4: filled panels, drawn marks). */
export function BountiesPage() {
  const m = useModel();
  if (!m) return null;
  const picked = bountiesPicked(m.user, m.week);
  const offered = bountyOffer(m.week);
  // A pick from before the offer always held a training job stays on the list.
  const offer = [...offered, ...BOUNTIES.filter((b) => picked.includes(b.id) && !offered.some((o) => o.id === b.id))];
  const full = picked.length >= BOUNTIES_PICKED;
  return (
    <div className="k-page lt-story">
      <Hero value={picked.length} ink={GREEN} label={`of ${BOUNTIES_PICKED} picked`} under={full ? 'Each lasts until Sunday. Done ones pay out the morning after.' : `Pick ${BOUNTIES_PICKED - picked.length} more; each lasts until Sunday.`} />
      <div className="kb-rows">
        {offer.map((b) => {
          const on = picked.includes(b.id);
          const done = m.eng.bountiesDone.includes(`${m.week}:${b.id}`);
          const have = Math.min(b.target.count, bountyProgress(m.eng, b, m.week, m.t.today));
          return (
            <button key={b.id} type="button" className={`k-panel lt-bounty${on ? ' on' : ''}${done ? ' dn' : ''}`} style={col(on ? GREEN : '#93c3dc')} disabled={on || full} aria-pressed={on} onClick={() => void pickBounty(b.id)}>
              <b className="lt-bh">{done ? <Icon name="check" size={18} stroke={2.6} color={GREEN} /> : on ? <i className="lt-on" aria-hidden="true" /> : null}{b.name}{isTrainingBounty(b) && <em className="fbt-tag">Training</em>}</b>
              <span className="k-q">{b.text}</span>
              {on && <span className="lt-bar" role="img" aria-label={`${fmtCount(have)} of ${b.target.count}`}><i style={{ width: `${Math.round((have / b.target.count) * 100)}%` }} /></span>}
              <small>{done ? 'Done · ' : on ? `${fmtCount(have)} of ${b.target.count} · ` : ''}{rewardWords(b.reward)}</small>
            </button>
          );
        })}
      </div>
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
