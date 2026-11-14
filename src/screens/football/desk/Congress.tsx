// The congress hall and the cast (desk spec §6–7; Fork 4). A plain hall in the aurora look until step 5 draws it:
// the motions, a seat count for each, and your vote. The cast: seven people, their ranks, and each rank's scene
// (d3-rank). Taps write only user keys (`save.ballot`, `save.castSeen`).
import { type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motionById, type Vote } from '../../../football/congress/congress';
import { castById, perksAt, RANK_AT } from '../../../football/cast/bonds';
import type { CastId } from '../../../football/content/desk/types';
import { castVote, hallOf, lastCongress } from '../../../football/store/congress';
import { scenesWaiting, seeScene } from '../../../football/store/cast';
import { loadDesk } from '../../../football/store/desk';
import { useTonight } from '../../../football/store/hooks';
import { go, useRoute } from '../../../router';
import '../../../styles/matchday.css';
import '../../../styles/desk.css';

const Page = ({ children, tone }: { children: React.ReactNode; tone?: string }) => <main className={`md-page desk${tone ? ` ${tone}` : ''}`}><div className="md-in">{children}</div></main>;
const Back = ({ to, label }: { to: string; label: string }) => <button type="button" className="md-q dk-back" onClick={() => go(to)}>{label}</button>;
const FOR = '#8fdcb6', AGAINST = '#ff9a8a', PINK = '#f4aedb';
const VOTE_WORD: Record<Vote, string> = { for: 'For', against: 'Against', abstain: 'Abstain' };

/** /football/congress */
export function CongressRoute() {
  const t = useTonight();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  const c = m?.view.congress;
  if (!t || !m || !c) return <Page><p className="fb-s">Football starts once you found the club.</p></Page>;
  const hall = hallOf(c);
  const last = lastCongress(t.save);
  return (
    <Page>
      <div className="md-top"><span className="md-cap">The federation congress</span><Back to="/football/desk" label="The desk" /></div>
      <h1 className="dk-h">Before season {c.season}</h1>
      <p className="md-q" style={{ margin: 0 }}>
        {c.open ? `The clubs are talking. ${c.daysLeft !== undefined ? `${c.daysLeft} ${c.daysLeft === 1 ? 'day' : 'days'} of the season left to lobby, then the event days.` : 'The congress sits when the new season begins.'}`
          : 'The congress sits when the new season begins. Lobbying opens in the last fortnight of the season.'}
      </p>
      <div className="md-row"><span>Your votes</span><b className="num">1</b></div>
      {hall.map((h) => {
        const def = motionById(h.id)!;
        const total = h.for + h.against + h.abstain;
        return (
          <section key={h.id} className="cg-motion" style={{ '--ink': h.passing ? FOR : AGAINST } as CSSProperties} aria-label={def.name}>
            <h2 className="cg-name">{def.name}</h2>
            <p style={{ margin: 0 }}>{def.text}</p>
            <p className="md-q" style={{ margin: 0 }}><b>If it passes:</b> {def.plays}</p>
            <div className="cg-seats" role="img" aria-label={`${h.for} for, ${h.against} against, ${h.abstain} abstaining`}>
              <span className="cg-bar for" style={{ flexGrow: h.for }} />
              <span className="cg-bar abs" style={{ flexGrow: h.abstain }} />
              <span className="cg-bar ag" style={{ flexGrow: h.against }} />
            </div>
            <div className="md-row"><span>As it stands</span><b className="num" style={{ color: h.passing ? FOR : AGAINST }}>{h.for}–{h.against}{h.abstain ? `, ${h.abstain} abstain` : ''} of {total}</b></div>
            <div className="md-row"><span>Lobbied your way</span><b className="num">{h.lobbied}</b></div>
            <fieldset className="cg-vote">
              <legend className="md-cap">Your vote</legend>
              {(['for', 'against', 'abstain'] as Vote[]).map((v) => (
                <button key={v} type="button" className={`md-btn${h.brabo === v ? '' : ' ghost'}`} aria-pressed={h.brabo === v} onClick={() => void castVote(c.season, h.id, v)}>{VOTE_WORD[v]}</button>
              ))}
            </fieldset>
          </section>
        );
      })}
      {c.open && hall.some((h) => h.brabo !== 'abstain') && <button type="button" className="md-btn" onClick={() => go('/football/desk/job', { id: 'lobby' })}>Lobby a club: one die</button>}
      <p className="md-q" style={{ margin: 0 }}>Clubs lean by who owns them and where they are from. Friends of Brabo drift toward your vote, rivals away. Clubs that care strongly remember how you voted.</p>
      {last && (
        <>
          <span className="md-cap">This season’s rules, from the last congress</span>
          {last.motions.map((r) => {
            const def = motionById(r.id)!;
            return <div key={r.id} className="md-row"><span>{def.name}</span><b style={{ color: r.passed ? FOR : AGAINST }}>{r.passed ? 'In force' : 'Fell'} · {r.for}–{r.against}</b></div>;
          })}
        </>
      )}
    </Page>
  );
}

/** The congress door on the desk and the football home: the ballot ahead, or the rules in force. */
export function CongressDoor() {
  const t = useTonight();
  if (!t) return null;
  const last = lastCongress(t.save);
  const n = last?.motions.filter((x) => x.passed).length ?? 0;
  return (
    <button type="button" className="fbt-btn wide" onClick={() => go('/football/congress')}>
      The congress · {last ? `${n} ${n === 1 ? 'rule' : 'rules'} in force this season` : `votes before season ${t.save.season + 1}`}
    </button>
  );
}

/** /football/cast, and /football/cast?scene=member:rank for a rank scene (d3-rank). */
export function CastRoute() {
  const t = useTonight();
  const route = useRoute();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  if (!t || !m) return <Page><p className="fb-s">Football starts once you found the club.</p></Page>;
  const scene = route.params.get('scene');
  if (scene) {
    const [member, rank] = scene.split(':');
    return <RankScene member={member as CastId} rank={Number(rank)} />;
  }
  const members = m.view.cast?.members ?? [];
  const waiting = scenesWaiting(t.save);
  return (
    <Page>
      <div className="md-top"><span className="md-cap">The people around the club</span><Back to="/football/desk" label="The desk" /></div>
      <h1 className="dk-h">The cast</h1>
      {waiting[0] && <button type="button" className="md-btn" onClick={() => go('/football/cast', { scene: `${waiting[0].member}:${waiting[0].rank}` })}>A new scene with {castById(waiting[0].member)!.name}</button>}
      {members.map((x) => (
        <section key={x.id} className="cg-member" style={{ '--ink': PINK } as CSSProperties}>
          <i className="cg-sil" aria-hidden="true" />
          <span style={{ flex: 1 }}>
            <b>{x.name}</b><br /><span className="md-q">{x.role}</span>
            <Pips rank={x.rank} />
            <span className="md-q">{x.rank >= 10 ? 'Rank 10' : `${x.toNext} to rank ${x.rank + 1}`}{x.askOpen ? ' · an ask is open' : ''}</span>
          </span>
          <span className="cg-rank num" aria-label={`Rank ${x.rank}`}>{x.rank}</span>
        </section>
      ))}
      <p className="md-q" style={{ margin: 0 }}>Bonds grow with time at the desk and with the habits each one cares about. Nothing is ever taken away.</p>
      <button type="button" className="md-btn ghost" onClick={() => go('/football/desk/job', { id: 'cast' })}>Time with the cast: one die</button>
    </Page>
  );
}

const Pips = ({ rank, ink = PINK }: { rank: number; ink?: string }) => (
  <span className="cg-pips" role="img" aria-label={`Rank ${rank} of 10`}>
    {RANK_AT.map((_, i) => <i key={i} style={{ background: i < rank ? ink : undefined }} />)}
  </span>
);

/** d3-rank: a short scene, the rank landing large, and the one thing it changes for good. */
function RankScene({ member, rank }: { member: CastId; rank: number }) {
  const c = castById(member);
  const r = c?.ranks.find((x) => x.rank === rank);
  if (!c || !r) return <Page><Back to="/football/cast" label="The cast" /></Page>;
  const fresh = perksAt(member, rank).filter((p) => !perksAt(member, rank - 1).includes(p));
  const done = () => { void seeScene(member, rank).then(() => go('/football/desk')); };
  return (
    <Page tone="rank">
      <div className="md-top"><span className="md-cap">{c.role}</span><span className="md-q">Bond</span></div>
      <div className="cg-rankhead">
        <i className="cg-sil big" aria-hidden="true" />
        <span><span className="md-cap">Rank</span><br /><span className="cg-big num">{rank}</span></span>
      </div>
      <h1 className="dk-h" style={{ margin: 0 }}>{r.title}</h1>
      <p className="cg-scene">{r.scene}</p>
      {fresh.map((p) => (
        <div key={p.key + (p.job ?? '') + (p.item ?? '')} className="md-tile" style={{ '--ink': '#93c3dc' } as CSSProperties}>
          <span style={{ flex: 1 }}><b style={{ color: '#93c3dc' }}>New for good</b><br />{p.text}</span>
        </div>
      ))}
      <Pips rank={rank} ink="#93c3dc" />
      <div className="md-fill" />
      <button type="button" className="md-btn" onClick={done}>Back to the desk</button>
    </Page>
  );
}

