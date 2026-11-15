// The congress hall and the cast (desk spec §6–7; Fork 4), on the kit (look pass): one lead, filled panels in each
// thing's colour, one glowing action, one way back and the page's name, rules behind the "?". The hall is a door on
// League; the cast is a door on Club. Taps write only user keys (`save.ballot`, `save.castSeen`).
import type { CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { LOBBY_DAYS, LOBBY_RISK, lobbyOpen, motionById, type Vote } from '../../../football/congress/congress';
import { seasonLength } from '../../../football/calendar';
import { worldOf } from '../../../football/pyramid/shape';
import { askDef, askOpen, asksOf, castById, MAX_RANK, perksAt, RANK_AT } from '../../../football/cast/bonds';
import type { CastId } from '../../../football/content/desk/types';
import { castVote, hallOf, lastCongress } from '../../../football/store/congress';
import { bondsOfSave, scenesWaiting, seeScene } from '../../../football/store/cast';
import { loadDesk } from '../../../football/store/desk';
import { useTonight } from '../../../football/store/hooks';
import type { FbSave } from '../../../football/store/tables';
import { go, useRoute } from '../../../router';
import { Action, Door, Empty, Hero, Panel, Sect, Title, type HowThisWorks } from '../../../ui/kit/Kit';
import { BLUE, CORAL, GOLD, GREEN, LAV, PINK } from '../club/Bits';
import { FootballHome } from '../FootballHome';
import '../../../styles/desk.css';

const VOTE_WORD: Record<Vote, string> = { for: 'For', against: 'Against', abstain: 'Abstain' };

export const CONGRESS_HOW: HowThisWorks = {
  title: 'How the congress works',
  steps: [
    { icon: 'hall', ink: GOLD, head: 'Motions before each season', line: 'Two or three motions are drawn. The congress sits as the new season begins, and what passes is that season’s rule.' },
    { icon: 'people', ink: LAV, head: 'Clubs lean by who owns them', line: 'Owners and home regions pull each club one way. A club with no seat votes neutral.' },
    { icon: 'deal', ink: GREEN, head: 'Friends follow your vote', line: 'Clubs that like Brabo drift toward your vote, rivals away. Clubs that care strongly remember how you voted.' },
    { icon: 'desk', ink: CORAL, head: 'Lobby in the last fortnight', line: 'At the desk, one die wins one club’s vote, at a risk you see first of annoying another club.' },
  ],
  chips: [
    { text: 'Brabo: 1 vote', ink: GOLD },
    { text: 'passes on more for than against', ink: GREEN },
    { text: `lobbying: last ${LOBBY_DAYS} days`, ink: CORAL },
    { text: `risk ${LOBBY_RISK.well}–${LOBBY_RISK.badly}%`, ink: CORAL },
    { text: 'never touches a match', ink: LAV },
  ],
};

export const CAST_HOW: HowThisWorks = {
  title: 'How the cast works',
  steps: [
    { icon: 'people', ink: PINK, head: 'Seven people around the club', line: 'Each one cares about one real habit of yours.' },
    { icon: 'check', ink: GREEN, head: 'Bonds grow, never shrink', line: 'Time at the desk, a day their habit counts, an ask met, or a bond tile after a win. Nothing is ever taken away.' },
    { icon: 'win', ink: GOLD, head: 'Ten ranks each', line: 'Each rank has a short scene. Some leave one small thing changed for good.' },
    { icon: 'moon', ink: BLUE, head: 'A cool tone costs nothing', line: 'Weeks away only cool how they talk to you. Ranks stay.' },
  ],
  chips: [{ text: `${MAX_RANK} ranks each`, ink: PINK }, { text: 'habit day +1', ink: GREEN }, { text: 'ask met +4', ink: GOLD }, { text: 'never touches a match', ink: LAV }],
};

/** A page inside a section: one way back and its name, the "?" with its rules. */
function Page({ title, back, to, params, help, section, children }: { title: string; back: string; to: string; params?: Record<string, string>; help?: HowThisWorks; section: 'league' | 'club'; children: React.ReactNode }) {
  return <FootballHome section={section} inner={{ title, back, to, params, help }}><div className="k-page">{children}</div></FootballHome>;
}
const NoClub = ({ title, section }: { title: string; section: 'league' | 'club' }) => (
  <Page title={title} back={section === 'league' ? 'League' : 'Club'} to={section === 'league' ? '/football/league' : '/football/club'} section={section}>
    <Empty icon={section === 'league' ? 'hall' : 'people'} ink={section === 'league' ? GOLD : PINK} title="Not yet" line="Football starts once you found the club." />
  </Page>
);

// ---------------------------------------------------------------- the congress hall

/** /football/congress */
export function CongressRoute() {
  const t = useTonight();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  const c = m?.view.congress;
  if (!t || !m || !c) return <NoClub title="The congress" section="league" />;
  const hall = hallOf(c);
  const passing = hall.filter((h) => h.passing).length;
  const voted = hall.some((h) => h.brabo !== 'abstain');
  const last = lastCongress(t.save);
  const when = c.open ? (c.daysLeft !== undefined ? `${c.daysLeft} ${c.daysLeft === 1 ? 'day' : 'days'} left to lobby` : 'lobbying until the new season') : `lobbying opens ${LOBBY_DAYS} days before the season ends`;
  return (
    <Page title="Congress" back="League" to="/football/league" help={CONGRESS_HOW} section="league">
      <Hero value={`${passing}/${hall.length}`} ink={GOLD} label="passing as it stands" under={`Before season ${c.season} · ${when}`} />
      {hall.map((h) => {
        const def = motionById(h.id)!;
        const ink = h.passing ? GREEN : CORAL;
        return (
          <Panel key={h.id} ink={ink} className="cg-motion">
            <Title as="h2" under={def.text}>{def.name}</Title>
            <div className="cg-seats" role="img" aria-label={`${h.for} for, ${h.against} against, ${h.abstain} abstaining`}>
              <span className="cg-bar for" style={{ flexGrow: h.for }} />
              <span className="cg-bar abs" style={{ flexGrow: h.abstain }} />
              <span className="cg-bar ag" style={{ flexGrow: h.against }} />
            </div>
            <div className="k-row"><span className="k-q">As it stands</span><b className="cg-count" style={{ color: ink }}>{h.for}–{h.against}{h.abstain ? ` · ${h.abstain} abstain` : ''}</b></div>
            {h.lobbied > 0 && <div className="k-row"><span className="k-q">Won by lobbying</span><b>{h.lobbied}</b></div>}
            <span><b className="k-lb">If it passes</b> <span className="k-q">{def.plays}</span></span>
            <div className="k-pills cg-vote" role="radiogroup" aria-label={`Your vote on ${def.name}`}>
              {(['for', 'against', 'abstain'] as Vote[]).map((v) => (
                <button key={v} type="button" role="radio" className="k-pill" aria-checked={h.brabo === v} onClick={() => void castVote(c.season, h.id, v)}>{VOTE_WORD[v]}</button>
              ))}
            </div>
          </Panel>
        );
      })}
      {c.open && voted && <Action wide onClick={() => go('/football/desk/job', { id: 'lobby' })}>Lobby a club · one die</Action>}
      {last && (
        <>
          <Sect>This season’s rules</Sect>
          {last.motions.map((r) => {
            const def = motionById(r.id)!;
            const ink = r.passed ? GREEN : 'rgba(237, 230, 218, 0.5)';
            return (
              <Panel key={r.id} ink={ink} flat>
                <span className="k-col" style={{ flex: 1 }}><b>{def.name}</b><span className="k-q">{r.passed ? def.passed : def.fell}</span></span>
                <b className="cg-count" style={{ color: r.passed ? GREEN : undefined }}>{r.passed ? 'In force' : 'Fell'}<br /><span className="k-q">{r.for}–{r.against}</span></b>
              </Panel>
            );
          })}
        </>
      )}
    </Page>
  );
}

/** The congress door on League: lobbying while it is open, else the rules in force this season. */
export function CongressDoor({ save }: { save: Pick<FbSave, 'congress' | 'season' | 'phase' | 'day' | 'world'> }) {
  const last = lastCongress(save);
  const n = last?.motions.filter((x) => x.passed).length ?? 0;
  const value = lobbyOpen(save.phase, save.day, seasonLength(worldOf(save))) ? 'Lobbying' : last ? `${n} in force` : 'No rules yet';
  return <Door icon="hall" name="The congress" value={value} ink={GOLD} onClick={() => go('/football/congress')} />;
}

// ---------------------------------------------------------------- the cast

/** The cast door on Club: scenes waiting ("2 new"), or the ranks between you all. */
export function CastDoor({ save }: { save: Pick<FbSave, 'desk' | 'bonds' | 'castSeen'> }) {
  const waiting = scenesWaiting(save).length;
  const ranks = bondsOfSave(save).reduce((n, b) => n + b.rank, 0);
  return <Door icon="people" name="The cast" value={waiting ? `${waiting} new` : ranks} ink={PINK} onClick={() => go('/football/cast')} />;
}

/** /football/cast, /football/cast?member=id, and /football/cast?scene=member:rank for a rank scene (d3-rank). */
export function CastRoute() {
  const t = useTonight();
  const route = useRoute();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  if (!t || !m) return <NoClub title="The cast" section="club" />;
  const scene = route.params.get('scene');
  if (scene) {
    const [member, rank] = scene.split(':');
    return <RankScene member={member as CastId} rank={Number(rank)} />;
  }
  const one = route.params.get('member');
  const members = m.view.cast?.members ?? [];
  const x = one ? members.find((y) => y.id === one) : undefined;
  if (x) return <Member save={t.save} date={t.date} member={x} />;
  const waiting = scenesWaiting(t.save);
  const ranks = members.reduce((n, y) => n + y.rank, 0);
  return (
    <Page title="The cast" back="Club" to="/football/club" help={CAST_HOW} section="club">
      <Hero value={ranks} ink={PINK} label={ranks === 1 ? 'rank between you' : 'ranks between you'} under={`of ${members.length * MAX_RANK} · nothing is ever taken away`} />
      {waiting[0] && (
        <Panel ink={GOLD} onClick={() => go('/football/cast', { scene: `${waiting[0].member}:${waiting[0].rank}` })} label={`A new scene with ${castById(waiting[0].member)!.name}`}>
          <span className="k-col"><b>Rank {waiting[0].rank} with {castById(waiting[0].member)!.name}</b><span className="k-q">{waiting.length > 1 ? `A new scene, and ${waiting.length - 1} more after it` : 'A new scene is waiting'}</span></span>
        </Panel>
      )}
      {members.map((y) => (
        <Panel key={y.id} ink={PINK} onClick={() => go('/football/cast', { member: y.id })} label={`${y.name}, ${y.role}: rank ${y.rank}`} className="cg-member">
          <span className="cg-mrow">
            <i className="cg-sil" aria-hidden="true" />
            <span className="k-col" style={{ flex: 1 }}>
              <b>{y.name}</b>
              <span className="k-q">{y.role}</span>
              <Pips rank={y.rank} />
              <span className="k-q">{y.rank >= MAX_RANK ? `Rank ${MAX_RANK}` : `${y.toNext} to rank ${y.rank + 1}`}{y.askOpen ? ' · an ask is open' : ''}</span>
            </span>
            <span className="cg-rank" aria-hidden="true">{y.rank}</span>
          </span>
        </Panel>
      ))}
      <Action wide onClick={() => go('/football/desk/job', { id: 'cast' })}>Time with the cast · one die</Action>
    </Page>
  );
}

const Pips = ({ rank, ink = PINK }: { rank: number; ink?: string }) => (
  <span className="cg-pips" role="img" aria-label={`Rank ${rank} of ${MAX_RANK}`}>
    {RANK_AT.map((_, i) => <i key={i} style={i < rank ? { background: ink, boxShadow: `0 0 6px ${ink}` } : undefined} />)}
  </span>
);

type MemberRow = NonNullable<Awaited<ReturnType<typeof loadDesk>>>['view']['cast'] extends infer V ? V extends { members: (infer M)[] } ? M : never : never;

/** One person: their rank leading, who they are, what they care about, what stays changed, and their scenes. */
function Member({ save, date, member: x }: { save: FbSave; date: string; member: MemberRow }) {
  const c = castById(x.id)!;
  const perks = perksAt(x.id, x.rank);
  const ask = asksOf(save.desk).find((a) => a.member === x.id && askOpen(a, save.bonds, date));
  const seen = save.castSeen?.[x.id] ?? 0;
  return (
    <Page title={c.name} back="Cast" to="/football/cast" help={CAST_HOW} section="club">
      <div className="cg-lead">
        <i className="cg-sil big" aria-hidden="true" style={{ '--ink': PINK } as CSSProperties} />
        <Hero value={x.rank} ink={PINK} label={`Rank of ${MAX_RANK}`} under={x.rank >= MAX_RANK ? 'The bond is whole' : `${x.toNext} to rank ${x.rank + 1}`} />
      </div>
      <Pips rank={x.rank} />
      <Panel ink={PINK}>
        <b className="k-lb">{c.role}</b>
        <span>{c.who}</span>
      </Panel>
      <Panel ink={GREEN}>
        <b className="k-lb">Cares about</b>
        <span>{c.cares.text}</span>
        <span className="k-q">{x.tone === 'warm' ? 'Warm with you lately.' : 'A little cool lately. It costs nothing.'}</span>
      </Panel>
      {ask && (
        <Panel ink={GOLD}>
          <b className="k-lb">An ask is open</b>
          <span>{askDef(ask)?.text}</span>
        </Panel>
      )}
      {perks.length > 0 && <Sect>Changed for good</Sect>}
      {perks.map((p, i) => <Panel key={`${p.key}-${i}`} ink={BLUE} flat><span>{p.text}</span></Panel>)}
      {seen > 0 && <Sect>Scenes</Sect>}
      {c.ranks.filter((r) => r.rank <= seen).map((r) => (
        <Panel key={r.rank} ink={LAV} onClick={() => go('/football/cast', { scene: `${x.id}:${r.rank}`, from: x.id })} label={`Rank ${r.rank}: ${r.title}`}>
          <span className="k-row" style={{ justifyContent: 'flex-start' }}><b className="cg-rank sm">{r.rank}</b><b>{r.title}</b></span>
        </Panel>
      ))}
      <Action wide onClick={() => go('/football/desk/job', { id: 'cast', target: x.id })}>Time with {c.name} · one die</Action>
    </Page>
  );
}

/** d3-rank: a short scene, the rank landing large, and the one thing it changes for good. */
function RankScene({ member, rank }: { member: CastId; rank: number }) {
  const { params } = useRoute();
  const from = params.get('from');
  const back = from ? { back: castById(from)?.name.split(' ')[0] ?? 'Cast', to: '/football/cast', params: { member: from } } : { back: 'Cast', to: '/football/cast' };
  const c = castById(member);
  const r = c?.ranks.find((x) => x.rank === rank);
  if (!c || !r) return <Page title="The cast" back="Club" to="/football/club" section="club"><Empty icon="people" ink={PINK} title="No such scene" line="It may belong to another save." /></Page>;
  const fresh = perksAt(member, rank).filter((p) => !perksAt(member, rank - 1).includes(p));
  const done = () => { void seeScene(member, rank).then(() => go(back.to, back.params, { replace: true })); };
  return (
    <Page title={`Rank ${rank}`} back={back.back} to={back.to} params={back.params} help={CAST_HOW} section="club">
      <div className="cg-lead">
        <i className="cg-sil big" aria-hidden="true" style={{ '--ink': BLUE } as CSSProperties} />
        <span className="k-col"><span className="cg-big" aria-label={`Rank ${rank}`}>{rank}</span><b>{c.name}</b><span className="k-q">{c.role}</span></span>
      </div>
      <Title as="h2">{r.title}</Title>
      <p className="cg-scene">{r.scene}</p>
      {fresh.map((p, i) => (
        <Panel key={`${p.key}-${i}`} ink={BLUE}>
          <b className="k-lb">New for good</b>
          <span>{p.text}</span>
        </Panel>
      ))}
      <Pips rank={rank} ink={BLUE} />
      <Action wide onClick={done}>Done</Action>
    </Page>
  );
}
