// The loan market (desk spec §5, w-loan A) and loan talks (w3-haggle). Scouted targets sit beside packs; a market
// loan has a slot of its own. Talks are three rounds, a die each, with their mood, what your scout knows and your
// replies with the odds in colour. Every tap is a desk spend (store/desk.ts); deals land at 4 am.
import { Action, Empty, Panel, Sect, type HowThisWorks } from '../../../ui/kit/Kit';
import { FootballHome } from '../FootballHome';
import { Bar, CORAL, GOLD, GREEN, MARKET_HOW, Note, PanelTop, Stat, TALK_HOW } from '../club/Bits';
import { opinionWord, OPINION_INK } from '../../../football/market/relations';
import { useMemo, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import {
  PUSH_HIT, PUSH_MISS, REPLY_LABEL, SCOUT_SOFT, SCOUT_SORE, SPONSOR_HIT, SPONSOR_LABEL, SPONSOR_MISS, SPONSOR_OPEN,
  TALK_DEAL, TALK_OPEN, TALK_SHORT, TALK_WALKED,
} from '../../../football/content/desk';
import { tierName } from '../../../football/data/load';
import { leadTaken, studiedIn } from '../../../football/desk/jobs/leads';
import { liveTalk, optionsFor, talkBlocked, talkCtx, talkList, untilFor, type TalkCtx } from '../../../football/desk/jobs/negotiate';
import type { Die, Effect } from '../../../football/desk/types';
import { speakers, voiceLine } from '../../../football/desk/words';
import { loanById, LOAN_TIER_NAME } from '../../../football/globe/loans';
import { leadsFrom, coolingUntil, MOOD_MAX, MOOD_NAME, OPEN_DAYS, ratingShown, ROUNDS, STUDY_CLOCK, targetKnown, type Push, type Reply, type ReplyOption, type TalkRound } from '../../../football/market/market';
import { euros } from '../../../football/money';
import { loanLeads } from '../../../football/fog/fog';
import { hashSeed } from '../../../football/rng';
import { loadDesk, spendAt, type DeskModel } from '../../../football/store/desk';
import { globeOf } from '../../../football/store/globe';
import { useTonight } from '../../../football/store/hooks';
import type { Tier } from '../../../football/types';
import { go } from '../../../router';
import { AXIS_INK } from '../../../ui/inks';
import { CrestOrFog } from '../world/Fog';
import '../../../styles/matchday.css';
import '../../../styles/desk.css';
import '../../../styles/club.css';

const fill = (t: string, x: Record<string, string | number | undefined>) => t.replace(/\{(\w+)\}/g, (_, k) => String(x[k] ?? ''));
const pickOf = <T,>(xs: T[], ...seed: (string | number)[]) => xs[hashSeed('talk-line', ...seed.map(String)) % xs.length];
const MOOD_INK = ['#ff7a76', '#ffad6b', '#f2c46d', '#8fb3f0', '#8fdcb6'];
/** Odds in colour (w3-haggle): sure in gold, better than even in blue, long odds in grey. */
const oddsInk = (pct: number) => (pct >= 100 ? '#f2c46d' : pct >= 50 ? '#8fb3f0' : '#a9b0c4');

/** Every market page: one way back and the page's name in the header, the "?" with its rules. */
function Page({ title, back, to, params, help, children }: { title: string; back: string; to: string; params?: Record<string, string>; help?: HowThisWorks; children: React.ReactNode }) {
  return <FootballHome section="club" inner={{ title, back, to, params, help }}><div className="k-page">{children}</div></FootballHome>;
}
/** A market loan has one slot of its own. */
const MARKET_SLOTS = 1;
const MARKET = { title: 'The loan market', back: 'Deals', to: '/football/club', params: { view: 'deals' }, help: MARKET_HOW(MARKET_SLOTS, OPEN_DAYS, ROUNDS) };

/** A target's crest: its club's, once its kit is known. */
const kitKnown = (m: DeskModel, club?: string) => Boolean(club && m.view.world?.clubs.find((c) => c.id === club)?.facts.includes('kit'));

/** /football/market */
export function MarketRoute() {
  const t = useTonight();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  if (!t || !m) return <Page {...MARKET}><Empty icon="deal" ink={GOLD} title="No market yet" line="Football starts once you found the club." /></Page>;
  return <MarketPage m={m} stays={globeOf(t.save).loans} />;
}

type Stay = ReturnType<typeof globeOf>['loans'][number];
function MarketPage({ m, stays }: { m: DeskModel; stays: Stay[] }) {
  const v = m.view, mk = v.market;
  const leads = mk?.leads ?? [];
  const here = stays.filter((s) => s.market && s.until >= m.date);
  const live = liveTalk(v);
  const tiles = (
    <div className="kb-g2">
      <Stat label="Market slot" value={mk?.slot ? mk.slot.name : 'Free'} c={GREEN} under={mk?.slot ? `till ${untilWords(mk.slot.until)}` : undefined} />
      <Stat label="Club money" value={euros(mk?.budget ?? 0)} c={GOLD} />
    </div>
  );
  // How clubs feel about you: each club on the list once, warmest first.
  const clubs = [...new Map(leads.map((l) => [l.club, l])).values()].sort((a, b) => b.opinion - a.opinion);
  if (!leads.length && !live && !(mk?.offers.length)) {
    return (
      <Page {...MARKET}>
        <Empty icon="scope" ink={GREEN} title="Nobody on the list yet" line="A scout who rolls a 6 can bring a name back by morning.">
          <Action wide onClick={() => go('/football/desk/job', { id: 'scout' })}>Send a scout</Action>
        </Empty>
        {tiles}
      </Page>
    );
  }
  return (
    <Page {...MARKET}>
      {live && <Action wide onClick={() => go('/football/desk/talk', { talk: live.talk })}>Back to talks with {live.who}: round {live.state.round} of {ROUNDS}</Action>}
      <div className="kb-rows">
        {leads.map((l, i) => {
          const def = loanById(l.loan)!;
          const st = studiedIn(v, l.key);
          const r = ratingShown(l.key, def.tier, st);
          const c = talkCtx(v, l.key);
          const mine = stays.find((s) => s.key.startsWith(`market:${l.key}:`));
          const taken = leadTaken(v, l.key);
          const status = taken
            ? (mine ? (mine.from > m.date ? `Arrives ${untilWords(mine.from)}` : mine.until >= m.date ? `Here till ${untilWords(mine.until)}` : 'Gone home') : 'Signed: arrives after tonight')
            : c?.state.live ? `Talks: round ${c.state.round} of ${ROUNDS}`
            : c && coolingUntil(c.state) && m.date < coolingUntil(c.state)! ? `No calls till ${untilWords(coolingUntil(c.state)!)}`
            : undefined;
          const block = c ? talkBlocked(v, c) : 'Gone';
          const u = AXIS_INK[def.unit];
          const fee = c?.state.terms.kind === 'loan' ? c.state.terms.fee : undefined;
          return (
            <Panel key={l.key} ink={u}>
              <div className="km-who">
                <CrestOrFog id={l.club} known={kitKnown(m, l.club)} size={44} />
                <span style={{ flex: 1, minWidth: 0 }}><b className="nm">{def.name}</b><br /><span className="k-q">{def.unit} · from {l.clubName}{c?.state.terms.kind === 'loan' ? ` · ${c.state.terms.days} days` : ''}</span></span>
              </div>
              <div className="k-row"><span className="k-q">Rated</span><b className="k-num" style={{ fontSize: 18 }}>{r.lo === r.hi ? r.lo : `${r.lo} to ${r.hi}`}</b></div>
              <Bar pct={targetKnown(st)} c={u} label={`You know ${targetKnown(st)}% of him`} />
              <div className="k-row"><span className="k-q">You know {targetKnown(st)}% of him</span>{fee !== undefined && <span className="k-q">Fee about {euros(fee)}</span>}</div>
              {status && <b style={{ color: u }}>{status}</b>}
              <span className="k-q">{st >= 1 ? `${def.trait.name}: ${def.trait.text} ` : ''}{LOAN_TIER_NAME[def.tier]}. {def.style}.</span>
              {!taken && (
                <div className="kb-btns">
                  {st < STUDY_CLOCK ? <Action quiet onClick={() => go('/football/desk/job', { id: 'study', target: l.key })}>Study him</Action> : <span />}
                  <Action quiet={Boolean(live) || i !== leads.findIndex((x) => !leadTaken(v, x.key))} disabled={Boolean(block) && !c?.state.live} onClick={() => go('/football/desk/talk', { talk: l.key })}>{c?.state.live ? 'Back to talks' : 'Open talks'}</Action>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
      {tiles}
      {clubs.length > 0 && (
        <>
          <Sect>How clubs feel about you</Sect>
          <div className="kb-rows" style={{ gap: 0 }}>
            {clubs.map((l) => {
              const w = opinionWord(l.opinion);
              return (
                <div key={l.club} className="km-club">
                  <CrestOrFog id={l.club} known={kitKnown(m, l.club)} size={32} />
                  <span>{l.clubName}</span>
                  <b style={{ color: OPINION_INK[w] }}>{w}</b>
                </div>
              );
            })}
          </div>
        </>
      )}
      {(mk?.offers.length ?? 0) > 0 && (
        <>
          <Sect>Sponsors waiting</Sect>
          <div className="kb-rows">
            {mk!.offers.map((o) => (
              <Panel key={`${o.slot}:${o.brand}`} ink={GOLD} onClick={() => go('/football/desk/talk', { talk: `sp:${o.slot}:${o.brand}` })}>
                <PanelTop name={o.brand} c={GOLD} right={o.slot} />
                <span className="k-q">{euros(o.perSeason)} a season for {o.seasons} · talk it up, a die a round</span>
              </Panel>
            ))}
          </div>
        </>
      )}
      <Note>A market loan has a slot of its own: packs keep theirs, and their Icon loans. Your own players are your habits, never bought or sold.</Note>
      {here.length > 0 && <Note>A market loan plays on days its unit’s habit is logged, taking the lowest starter’s place, and the unit’s youngsters grow half as fast again.</Note>}
    </Page>
  );
}
const untilWords = (d: string) => untilFor(d, 0);

/** /football/desk/talk?talk= : one round of talks (w3-haggle). */
export function TalkPage({ m, talk }: { m: DeskModel; talk: string }) {
  const c = talk ? talkCtx(m.view, talk) : liveTalk(m.view);
  if (!c) {
    const list = talkList(m.view);
    return (
      <Page title="Talks" back="The desk" to="/football/desk" help={TALK_HOW(ROUNDS)}>
        {list.length ? (
          <>
            <h2 className="kd-q">Who do you talk to?</h2>
            <div className="kb-rows">
              {list.map((x) => (
                <Panel key={x.talk} ink={GOLD} onClick={() => go('/football/desk/talk', { talk: x.talk }, { replace: true })}>
                  <b>{x.name}, {x.who}</b>
                  <span className="k-q">{talkBlocked(m.view, x) ?? (x.state.live ? `Round ${x.state.round} of ${ROUNDS}` : 'Open talks')}</span>
                </Panel>
              ))}
            </div>
          </>
        ) : (
          <Empty icon="deal" ink={GOLD} title="No one to talk to yet" line="A scout’s 6 can turn up a loan target.">
            <Action wide onClick={() => go('/football/desk/job', { id: 'scout' })}>Send a scout</Action>
          </Empty>
        )}
      </Page>
    );
  }
  return <Talk key={c.talk} m={m} c={c} />;
}

interface Said { round: TalkRound; die: Die }
function Talk({ m, c }: { m: DeskModel; c: TalkCtx }) {
  const best = useMemo(() => [...m.left].sort((a, b) => b.value - a.value)[0], [m.left]);
  const [pick, setHeld] = useState<Die | undefined>(best);
  // A die spent on the last round leaves the tray: hold the best one left instead.
  const held = m.left.find((d) => d.axis === pick?.axis) ?? best;
  const [reply, setReply] = useState<Reply | undefined>();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said | undefined>();
  const [err, setErr] = useState<string | undefined>();
  const v = m.view, s = c.state, loan = c.loan ? loanById(c.loan) : undefined;
  const unit = loan?.unit ?? 'Pace';
  const words = { player: c.name, club: c.who, brand: c.who, unit, division: tierName((v.market?.ownTier ?? 6) as Tier), days: s.terms.kind === 'loan' ? s.terms.days : '', until: untilFor(m.date, OPEN_DAYS + 3) };
  const blocked = m.shut ? 'The desk is closed for the night' : talkBlocked(v, c);
  const opts: ReplyOption[] = held ? optionsFor(v, c, held) : [];
  const chosen = opts.find((o) => o.reply === reply);
  const voices = held ? speakers(held, m.dice).map((a) => m.dice.find((d) => d.axis === a)!).map((d, i) => ({ d, line: voiceLine('negotiate', d, i) })) : [];

  const spend = async () => {
    if (!held || !reply) return;
    setBusy(true);
    try {
      const e = await spendAt(m.date, held, 'negotiate', `${c.talk}|${reply}`);
      if (e) { setErr(e === 'shut' ? 'The day is closed: the dice became research.' : 'That reply can’t be made now.'); return; }
      const save = await db.fbSave.get('save');
      const sp = save?.desk?.spends.find((x) => x.id === `${m.date}:${held.axis}`);
      const round = sp?.effects.find((x: Effect): x is TalkRound => x.kind === 'talk');
      if (round) setSaid({ round, die: held });
      setReply(undefined);
    } finally { setBusy(false); }
  };

  // Their line: the reaction to your last reply, or their opening.
  const reaction = said ? lineAfter(said.round, c, words) : c.kind === 'sponsor' ? fill(SPONSOR_OPEN, words) : fill(pickOf(TALK_OPEN, c.talk, s.n), words);
  if (said?.round.end) return <TalkEnd m={m} c={c} round={said.round} line={reaction} />;
  const facts = c.kind === 'loan' && loan ? [`${loan.unit}`, (() => { const r = ratingShown(c.talk, loan.tier, c.studied); return r.lo === r.hi ? `rated ${r.lo}` : `rated ${r.lo} to ${r.hi}`; })(), `known ${targetKnown(c.studied)}%`] : [`a ${v.market?.offers.find((o) => `sp:${o.slot}:${o.brand}` === c.talk)?.slot ?? ''} deal`];
  const mood = MOOD_INK[s.mood];
  return (
    <Page title={`Round ${s.round} of ${ROUNDS}`} back="Market" to="/football/market" help={TALK_HOW(ROUNDS)}>
      <div className="km-who">
        {c.kind === 'loan' ? <CrestOrFog id={c.club!} known={kitKnown(m, c.club)} size={44} /> : <span className="mk-sil" aria-hidden="true" />}
        <span style={{ flex: 1, minWidth: 0 }}><b className="nm">{c.name}</b><br /><span className="k-q">{c.kind === 'loan' ? `from ${c.who} · ` : 'Sponsor talks · '}{facts.join(' · ')}</span></span>
      </div>
      {said && <Panel ink={said.round.hit ? GREEN : CORAL} flat><b style={{ color: said.round.hit ? GREEN : CORAL }}>{said.round.hit ? 'It came off' : 'No luck'} ({said.round.pct}%).</b></Panel>}
      <Panel ink={mood}>
        <p className="km-say">{reaction}</p>
        <div className="k-row"><span className="k-q">Their mood</span><b style={{ color: mood }}>{MOOD_NAME[s.mood]}</b></div>
        <div className="km-mood" style={{ ['--n' as string]: MOOD_MAX }} role="img" aria-label={`Mood ${s.mood} of ${MOOD_MAX}`}>{Array.from({ length: MOOD_MAX }, (_, i) => <i key={i} className={i < s.mood ? 'on' : ''} style={{ '--ink': mood } as CSSProperties} />)}</div>
        <span><span className="k-q">On the table:</span> {termsText(s.terms, c.name)}</span>
      </Panel>
      {blocked && <Panel ink={CORAL} flat><span>{blocked}.</span></Panel>}
      <Sect>Your dice</Sect>
      <TalkTray dice={m.dice} left={m.left} held={held} onPick={setHeld} />
      {voices.map(({ d, line }) => line && <p key={d.axis} className="kd-say"><b style={{ color: AXIS_INK[d.axis] }}>{d.axis.toUpperCase()}</b> — {line}</p>)}
      <Sect>{s.round === ROUNDS ? 'Your reply · last round' : 'Your reply'}</Sect>
      {!held && <Note>{m.left.length ? 'Pick up a die: each round takes one.' : 'Every die is spent today. Talks wait; they never expire.'}</Note>}
      <div className="kb-rows" role="group" aria-label="Your reply">
        {opts.map((o) => (
          <button key={o.reply} type="button" className="k-panel k-tap kd-target km-opt" disabled={!o.ok || Boolean(blocked)} aria-pressed={reply === o.reply} onClick={() => setReply(o.reply)} style={{ '--ink': oddsInk(o.pct) } as CSSProperties}>
            <span className="k-row" style={{ alignItems: 'flex-start', gap: 10 }}>
              <span style={{ flex: 1, minWidth: 0 }}><b>{label(o.reply, c, words, o)}</b><br /><span className="k-q">{optionLine(o, c, unit)}{scoutHint(o.reply, c, words)}</span></span>
              <b className="k-num" style={{ color: oddsInk(o.pct) }}>{o.reply === 'agree' ? 'Sure' : `${o.pct}%`}</b>
            </span>
          </button>
        ))}
      </div>
      {s.round === ROUNDS && <Note>Last round: whatever happens, the deal is done on what’s agreed (if the club’s money covers it).</Note>}
      {chosen && chosen.edges.length > 0 && <Note>{chosen.edges.map((e) => `${e.why} ${e.d > 0 ? '+' : '−'}${Math.abs(e.d)}`).join(' · ')}. The odds shown are the odds used.</Note>}
      {err && <Note>{err}</Note>}
      <Action wide disabled={!held || !reply || busy || Boolean(blocked)} onClick={() => void spend()}>
        {held ? (reply ? `Spend the ${held.value}: ${reply === 'agree' ? 'shake on it' : 'push'}` : 'Pick a reply') : 'Pick up a die'}
      </Action>
      {c.kind === 'loan' && c.studied < STUDY_CLOCK && (
        <Action quiet onClick={() => go('/football/desk/job', { id: 'study', target: c.talk })}>{c.studied ? 'Finish studying them: where they’ll give' : 'Study them first: better odds'} · {c.studied} of {STUDY_CLOCK}</Action>
      )}
    </Page>
  );
}

/** What the scout's study found, under the reply it bears on (w3-haggle: "Your scout says they need him gone till the 22nd"). */
function scoutHint(r: Reply, c: TalkCtx, words: Record<string, string | number>): string {
  if (c.kind !== 'loan' || !c.secrets || c.studied < STUDY_CLOCK || r === 'agree') return '';
  if (c.secrets.soft === r) return ` ${fill(SCOUT_SOFT[r], words)}`;
  if (c.secrets.sore === r) return ` ${fill(SCOUT_SORE[r], words)}`;
  return '';
}

function TalkTray({ dice, left, held, onPick }: { dice: Die[]; left: Die[]; held?: Die; onPick: (d: Die) => void }) {
  if (!dice.length) return <Note>No dice today.</Note>;
  return (
    <div className="kd-tray" role="group" aria-label="Your dice">
      {dice.map((d) => {
        const free = left.some((x) => x.axis === d.axis);
        return <button key={d.axis} type="button" className={`kd-die${free ? '' : ' spent'}`} style={{ '--ink': AXIS_INK[d.axis] } as CSSProperties} disabled={!free} aria-pressed={held?.axis === d.axis} aria-label={`${d.axis} ${d.value}${free ? '' : ', spent'}: ${d.reason}`} onClick={() => onPick(d)}>{d.value}</button>;
      })}
    </div>
  );
}

function TalkEnd({ m, c, round, line }: { m: DeskModel; c: TalkCtx; round: TalkRound; line: string }) {
  const t = round.terms;
  const head = round.end === 'deal' ? (c.kind === 'loan' ? `${c.name} signs` : `${c.who} signs`) : round.end === 'walked' ? 'They walked out' : 'No deal';
  const ok = round.end === 'deal';
  return (
    <Page title="Talks over" back="Market" to="/football/market" help={TALK_HOW(ROUNDS)}>
      <h2 className="k-title" style={{ color: ok ? GREEN : CORAL }}>{head}</h2>
      {line && <Panel ink={ok ? GREEN : CORAL}><p className="km-say">{line}</p></Panel>}
      {ok && <Panel ink={GOLD}><PanelTop name="Agreed" c={GOLD} /><span>{termsText(t, c.name)}</span></Panel>}
      <Note>
        {ok ? (c.kind === 'loan' ? 'The fee leaves the club’s money when tonight plays; the loan arrives the next morning.' : 'Signed when tonight plays.')
          : round.end === 'walked' ? `They won’t take a call for a week. ${c.kind === 'loan' ? 'Their opinion of Brabo dips a little.' : ''}` : TALK_SHORT}
      </Note>
      <Action wide onClick={() => go('/football/market', undefined, { replace: true })}>The market</Action>
      <Action quiet onClick={() => go('/football/desk', undefined, { replace: true })}>Back to the desk{m.left.length ? ` · ${m.left.length} left` : ''}</Action>
    </Page>
  );
}

function termsText(t: TalkRound['terms'], name: string): string {
  if (t.kind === 'loan') return `${t.days} days · ${euros(t.fee)} · ${t.promise ? `${name} starts every match` : 'no promise of minutes'}`;
  return `${euros(t.perSeason)} a season · ${t.seasons} ${t.seasons === 1 ? 'season' : 'seasons'}${t.bonus ? ` · ${euros(t.bonus)} on signing` : ''}`;
}
function label(r: Reply, c: TalkCtx, words: Record<string, string | number>, o: ReplyOption): string {
  if (c.kind === 'sponsor') return SPONSOR_LABEL[r as keyof typeof SPONSOR_LABEL];
  const days = o.terms.kind === 'loan' ? o.terms.days : '';
  const text = r === 'agree' && o.terms.kind === 'loan' && !o.terms.promise ? 'Agree to their terms' : REPLY_LABEL[r as keyof typeof REPLY_LABEL];
  return fill(text, { ...words, days });
}
function optionLine(o: ReplyOption, c: TalkCtx, unit: string): string {
  const t = c.state.terms, n = o.terms, refused = o.reply !== 'agree' && (c.state.fails[o.reply as Push] ?? 0) > 0 ? ' They refused this before.' : '';
  if (o.reply === 'agree') {
    if (!o.ok) return 'The club’s money doesn’t cover the fee yet.';
    if (n.kind === 'loan') return `Deal done: ${n.days} days, ${euros(n.fee)}. ${n.promise ? `A day without ${unit} logged breaks the promise.` : `Plays when your ${unit} is logged.`}`;
    return `Signed: ${euros(n.perSeason)} a season for ${n.seasons}.`;
  }
  if (t.kind === 'loan' && n.kind === 'loan') {
    if (o.reply === 'fee') return `${euros(n.fee)} instead of ${euros(t.fee)}.${refused}`;
    if (o.reply === 'days') return `${n.days} days instead of ${t.days}.${refused}`;
    return `Plays when your ${unit} is logged, with no promise to keep.${refused}`;
  }
  if (t.kind === 'sponsor' && n.kind === 'sponsor') {
    if (o.reply === 'more') return `${euros(n.perSeason)} a season instead of ${euros(t.perSeason)}.${refused}`;
    if (o.reply === 'longer') return `${n.seasons} seasons instead of ${t.seasons}.${refused}`;
    return `${euros(n.bonus)} on signing.${refused}`;
  }
  return '';
}
function lineAfter(r: TalkRound, c: TalkCtx, words: Record<string, string | number>): string {
  if (r.end === 'walked') return pickOf(TALK_WALKED, c.talk, r.n);
  if (r.end === 'deal' && r.reply === 'agree') return fill(pickOf(TALK_DEAL, c.talk, r.n), words);
  if (r.reply === 'agree') return '';
  const days = r.terms.kind === 'loan' ? r.terms.days : '';
  if (c.kind === 'sponsor') return (r.hit ? SPONSOR_HIT : SPONSOR_MISS)[r.reply as keyof typeof SPONSOR_HIT];
  const pool = (r.hit ? PUSH_HIT : PUSH_MISS)[r.reply as keyof typeof PUSH_HIT];
  const said = fill(pickOf(pool, c.talk, r.n, r.round), { ...words, days });
  return r.end === 'deal' ? `${said} ${fill(pickOf(TALK_DEAL, c.talk, r.n), words)}` : r.end === 'short' ? `${said} ${TALK_SHORT}` : said;
}

/** The market's door, beside packs (w-loan A): it never takes from a pack. */
export function MarketDoor() {
  const n = useLiveQuery(async () => { const s = await db.fbSave.get('save'); return leadsFrom(loanLeads(s?.desk, s?.redrawn?.on)).length; }, []);
  if (n === undefined) return null;
  return (
    <button type="button" className="fbt-btn wide" onClick={() => go('/football/market')}>
      The loan market · {n ? `${n} scouted ${n === 1 ? 'player' : 'players'}` : 'scouts find players here'}
    </button>
  );
}
