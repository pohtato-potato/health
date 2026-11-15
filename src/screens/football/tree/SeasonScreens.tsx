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
import { go } from '../../../router';
import { useModel } from './model';
import { Back, TreePage } from './TreeScreens';
import { Panel, Sect, Title } from '../../../ui/kit/Kit';
import { MarkRow, Note } from '../club/Bits';

const col = (c: string) => ({ ['--c' as string]: c }) as CSSProperties;
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

/** The season track: a step for each day of the season (42, or 28 in world 2), one for each day you log anything, a reward each seventh step. */
export function TrackPage() {
  const m = useModel();
  if (!m) return null;
  const n = m.track;
  const world = worldOf(m.t.save);
  const TRACK = trackOf(world);
  // The big rewards: every seventh day of 42; in world 2 the same rewards at their rescaled steps (TRACK_2).
  const isBig = (step: number) => (world === 2 ? trackOf(1).some((o) => o.step % 7 === 0 && Math.round(o.step / 1.5) === step) : step % 7 === 0);
  const big = TRACK.filter((s) => isBig(s.step));
  return (
    <TreePage>
      <Back to="/football/story" label="Story" />
      <div className="fbt-head"><h1 className="fbt-t1">Season track</h1><span className="fbt-cap"><b className="fbt-n">{n}</b> of {TRACK.length}</span></div>
      <div className="fbt-track" role="img" aria-label={`${n} of ${TRACK.length} steps reached`}>
        {TRACK.map((s) => {
          const done = s.step <= n, now = s.step === n + 1, rw = isBig(s.step);
          return <span key={s.step} className={`${done ? 'dn' : ''}${now ? ' now' : ''}${rw ? ' rw' : ''}${s.reward && !rw ? ' sm' : ''}`}>{rw ? STAR : s.reward ? <i aria-hidden="true" /> : null}</span>;
        })}
      </div>
      <div className="fbt-rewards">
        {big.map((s) => (
          <p key={s.step} className={s.step <= n ? 'dn' : ''}><b aria-hidden="true">{s.step <= n ? '✓' : STAR}</b><span>Day {s.step}</span><em>{s.label}</em></p>
        ))}
      </div>
      <p className="fbt-line">One step for every day you log anything at all; good days aren't needed. Small marks are album cards. A missed day can be caught up with a bounty.</p>
    </TreePage>
  );
}

/** This week's bounties: six offered, pick three. Each lasts the week. */
export function BountiesPage() {
  const m = useModel();
  if (!m) return null;
  const picked = bountiesPicked(m.user, m.week);
  const offered = bountyOffer(m.week);
  // A pick from before the offer always held a training job stays on the list.
  const offer = [...offered, ...BOUNTIES.filter((b) => picked.includes(b.id) && !offered.some((o) => o.id === b.id))];
  const full = picked.length >= BOUNTIES_PICKED;
  return (
    <TreePage>
      <Back to="/football/story" label="Story" />
      <div className="fbt-head"><h1 className="fbt-t1">Bounties</h1><span className="fbt-cap"><b className="fbt-n">{picked.length}</b> of {BOUNTIES_PICKED} picked</span></div>
      <p className="fbt-line">Six real-habit jobs this week, training among them. Pick three; each lasts until Sunday. Done ones pay out the morning after.</p>
      <div className="fbt-bounties">
        {offer.map((b) => {
          const on = picked.includes(b.id);
          const done = m.eng.bountiesDone.includes(`${m.week}:${b.id}`);
          const have = Math.min(b.target.count, bountyProgress(m.eng, b, m.week, m.t.today));
          return (
            <button key={b.id} type="button" className={`fbt-bounty${on ? ' on' : ''}${done ? ' dn' : ''}`} disabled={on || full} aria-pressed={on} onClick={() => void pickBounty(b.id)}>
              <b>{done ? '✓ ' : on ? '• ' : ''}{b.name}{isTrainingBounty(b) && <em className="fbt-tag">Training</em>}</b>
              <span>{b.text}</span>
              {on && <span className="fbt-bar" role="img" aria-label={`${fmtCount(have)} of ${b.target.count}`}><i style={{ width: `${Math.round((have / b.target.count) * 100)}%` }} /></span>}
              <small>{done ? 'Done · ' : on ? `${fmtCount(have)} of ${b.target.count} · ` : ''}{rewardWords(b.reward)}</small>
            </button>
          );
        })}
      </div>
    </TreePage>
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

/** The Story page's two doors into this season's run: the track and the week's bounties. */
export function SeasonDoors() {
  const m = useModel();
  if (!m) return null;
  const picked = bountiesPicked(m.user, m.week).length;
  return (
    <nav className="fbt-doors two" aria-label="This season">
      <button type="button" className="fbt-door" style={col('#ffd56a')} onClick={() => go('/football/track')}><b>Season track</b><small>{m.track} of {trackOf(worldOf(m.t.save)).length}</small></button>
      <button type="button" className="fbt-door" style={col('#8fdcb6')} onClick={() => go('/football/bounties')}><b>Bounties</b><small>{picked < BOUNTIES_PICKED ? `Pick ${BOUNTIES_PICKED - picked} this week` : '3 picked'}</small></button>
    </nav>
  );
}
