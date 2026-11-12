// The loan market (desk spec §5, w-loan A) and loan talks (w3-haggle). Scouted targets sit beside packs; a market
// loan has a slot of its own. Talks are three rounds, a die each, with their mood, what your scout knows and your
// replies with the odds in colour. Every tap is a desk spend (store/desk.ts); deals land at 4 am.
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

const fill = (t: string, x: Record<string, string | number | undefined>) => t.replace(/\{(\w+)\}/g, (_, k) => String(x[k] ?? ''));
const pickOf = <T,>(xs: T[], ...seed: (string | number)[]) => xs[hashSeed('talk-line', ...seed.map(String)) % xs.length];
const MOOD_INK = ['#ff7a76', '#ffad6b', '#f2c46d', '#8fb3f0', '#8fdcb6'];
/** Odds in colour (w3-haggle): sure in gold, better than even in blue, long odds in grey. */
const oddsInk = (pct: number) => (pct >= 100 ? '#f2c46d' : pct >= 50 ? '#8fb3f0' : '#a9b0c4');

const Page = ({ children }: { children: React.ReactNode }) => <main className="md-page desk"><div className="md-in">{children}</div></main>;
const Back = ({ to, label, params }: { to: string; label: string; params?: Record<string, string> }) => (
  <button type="button" className="md-q dk-back" onClick={() => go(to, params)}>{label}</button>
);

/** A target's crest: its club's, once its kit is known. */
const kitKnown = (m: DeskModel, club?: string) => Boolean(club && m.view.world?.clubs.find((c) => c.id === club)?.facts.includes('kit'));

/** /football/market */
export function MarketRoute() {
  const t = useTonight();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  if (!t || !m) return <Page><p className="fb-s">Football starts once you found the club.</p></Page>;
  return <MarketPage m={m} stays={globeOf(t.save).loans} />;
}

type Stay = ReturnType<typeof globeOf>['loans'][number];
function MarketPage({ m, stays }: { m: DeskModel; stays: Stay[] }) {
  const v = m.view, mk = v.market;
  const leads = mk?.leads ?? [];
  const here = stays.filter((s) => s.market && s.until >= m.date);
  const live = liveTalk(v);
  return (
    <Page>
      <div className="md-top"><span className="md-cap">The loan market</span><Back to="/football/packs" label="Packs" /></div>
      <h1 className="dk-h">{leads.length ? `${leads.length} ${leads.length === 1 ? 'player' : 'players'} your scouts found` : 'Nobody on the list yet'}</h1>
      <p className="md-q" style={{ margin: 0 }}>A market loan has a slot of its own: packs keep theirs, and their Icon loans. Your own players are your habits, never bought or sold.</p>
      <div className="md-row"><span>Market slot</span><b>{mk?.slot ? `${mk.slot.name}, till ${untilWords(mk.slot.until)}` : 'Free'}</b></div>
      <div className="md-row"><span>Club money</span><b className="num">{euros(mk?.budget ?? 0)}</b></div>
      {live && <button type="button" className="md-btn" onClick={() => go('/football/desk/talk', { talk: live.talk })}>Back to talks with {live.who}: round {live.state.round} of {ROUNDS}</button>}
      {!leads.length && (
        <>
          <p style={{ margin: 0 }}>A scout’s 6 can turn up a player worth a loan. They show here the morning after.</p>
          <button type="button" className="md-btn ghost" onClick={() => go('/football/desk/job', { id: 'scout' })}>Send a scout</button>
        </>
      )}
      <div className="mk-list">
        {leads.map((l) => {
          const def = loanById(l.loan)!;
          const st = studiedIn(v, l.key);
          const r = ratingShown(l.key, def.tier, st);
          const c = talkCtx(v, l.key);
          const mine = stays.find((s) => s.key.startsWith(`market:${l.key}:`));
          const status = leadTaken(v, l.key)
            ? (mine ? (mine.from > m.date ? `Arrives ${untilWords(mine.from)}` : mine.until >= m.date ? `Here till ${untilWords(mine.until)}` : 'Gone home') : 'Signed: arrives after tonight')
            : c?.state.live ? `Talks: round ${c.state.round} of ${ROUNDS}`
            : c && coolingUntil(c.state) && m.date < coolingUntil(c.state)! ? `No calls till ${untilWords(coolingUntil(c.state)!)}`
            : `Known ${targetKnown(st)}%`;
          const block = c ? talkBlocked(v, c) : 'Gone';
          return (
            <section key={l.key} className="mk-card" style={{ '--ink': AXIS_INK[def.unit] } as CSSProperties}>
              <div className="mk-head">
                <CrestOrFog id={l.club} known={kitKnown(m, l.club)} size={40} />
                <span style={{ flex: 1 }}><b>{def.name}</b><br /><span className="md-q">{def.unit} · {LOAN_TIER_NAME[def.tier]} · {l.clubName}</span></span>
              </div>
              <div className="md-row"><span>Now</span><b style={{ color: AXIS_INK[def.unit] }}>{status}</b></div>
              <div className="md-row"><span>Rated</span><b className="num">{r.lo === r.hi ? r.lo : `${r.lo} to ${r.hi}`}</b></div>
              <div className="md-row"><span>Signature move</span><b>{st >= 1 ? `${def.trait.name}: ${def.trait.text}` : '?'}</b></div>
              <p className="md-q" style={{ margin: 0 }}>{def.style}.</p>
              {!leadTaken(v, l.key) && (
                <div className="md-btns">
                  {st < STUDY_CLOCK && <button type="button" className="md-btn ghost" onClick={() => go('/football/desk/job', { id: 'study', target: l.key })}>Study: {st} of {STUDY_CLOCK}</button>}
                  <button type="button" className="md-btn" aria-disabled={Boolean(block)} onClick={() => go('/football/desk/talk', { talk: l.key })}>{c?.state.live ? 'Back to talks' : 'Open talks'}</button>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {(mk?.offers.length ?? 0) > 0 && (
        <>
          <span className="md-cap">Sponsors waiting</span>
          {mk!.offers.map((o) => (
            <button key={`${o.slot}:${o.brand}`} type="button" className="dk-target" onClick={() => go('/football/desk/talk', { talk: `sp:${o.slot}:${o.brand}` })}>
              <span><b>{o.brand}</b> · {o.slot}</span><span className="md-q">{euros(o.perSeason)} a season for {o.seasons} · talk it up, a die a round</span>
            </button>
          ))}
        </>
      )}
      {here.length > 0 && <p className="md-q" style={{ margin: 0 }}>A market loan plays on days its unit’s habit is logged, taking the lowest starter’s place, and the unit’s youngsters grow half as fast again.</p>}
    </Page>
  );
}
const untilWords = (d: string) => untilFor(d, 0);

/** /football/desk/talk?talk= : one round of talks (w3-haggle). */
export function TalkPage({ m, talk }: { m: DeskModel; talk: string }) {
  const c = talk ? talkCtx(m.view, talk) : liveTalk(m.view);
  if (!c) {
    return (
      <Page>
        <div className="md-top"><span className="md-cap">Talks</span><Back to="/football/desk" label="The desk" /></div>
        <h1 className="dk-h">Who do you talk to?</h1>
        <div className="dk-targets">
          {talkList(m.view).map((x) => (
            <button key={x.talk} type="button" className="dk-target" onClick={() => go('/football/desk/talk', { talk: x.talk }, { replace: true })}>
              <span>{x.name}, {x.who}</span><span className="md-q">{talkBlocked(m.view, x) ?? (x.state.live ? `Round ${x.state.round} of ${ROUNDS}` : 'Open talks')}</span>
            </button>
          ))}
        </div>
        {!talkList(m.view).length && <p className="md-q">No one yet. A scout’s 6 can turn up a loan target.</p>}
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
  return (
    <Page>
      <div className="md-top"><span className="md-cap">{c.kind === 'loan' ? 'Loan talks' : 'Sponsor talks'} · round {s.round} of {ROUNDS}</span><Back to="/football/market" label="Market" /></div>
      <div className="mk-head">
        {c.kind === 'loan' ? <CrestOrFog id={c.club!} known={kitKnown(m, c.club)} size={44} /> : <span className="mk-sil" aria-hidden="true" />}
        <span><b className="mk-name">{c.name}{c.kind === 'loan' ? `, from ${c.who}` : ''}</b><br /><span className="md-q">{facts.join(' · ')}</span></span>
      </div>
      {said && <p className="mk-out" style={{ '--ink': said.round.hit ? '#8fdcb6' : '#ffad6b' } as CSSProperties}>{said.round.hit ? 'It came off' : 'No luck'} ({said.round.pct}%).</p>}
      <div className="mk-say"><span className="mk-sil" aria-hidden="true" /><span>{reaction}</span></div>
      <div className="md-row" style={{ borderBottom: 0 }}><span>Their mood</span><b style={{ color: MOOD_INK[s.mood] }}>{MOOD_NAME[s.mood]}</b></div>
      <div className="mk-seg" role="img" aria-label={`Mood ${s.mood} of ${MOOD_MAX}`}>{Array.from({ length: MOOD_MAX }, (_, i) => <i key={i} className={i < s.mood ? 'on' : ''} style={{ '--ink': MOOD_INK[s.mood] } as CSSProperties} />)}</div>
      <p className="mk-table"><span className="md-q">On the table:</span> {termsText(s.terms, c.name)}</p>
      {blocked && <p className="mk-out" style={{ '--ink': '#ffad6b' } as CSSProperties}>{blocked}.</p>}
      <span className="md-cap">Your reply{s.round === ROUNDS ? ' · last round' : ''}</span>
      {!held && <p className="md-q" style={{ margin: 0 }}>{m.left.length ? 'Pick up a die: each round takes one.' : 'Every die is spent today. Talks wait; they never expire.'}</p>}
      <div className="dk-targets" role="group" aria-label="Your reply">
        {opts.map((o) => (
          <button key={o.reply} type="button" className="mk-opt" disabled={!o.ok || Boolean(blocked)} aria-pressed={reply === o.reply} onClick={() => setReply(o.reply)} style={{ '--ink': oddsInk(o.pct) } as CSSProperties}>
            <span><b>{label(o.reply, c, words, o)}</b><br /><span className="md-q">{optionLine(o, c, unit)}{scoutHint(o.reply, c, words)}</span></span>
            <b className="n" style={{ color: oddsInk(o.pct) }}>{o.reply === 'agree' ? 'Sure' : `${o.pct}%`}</b>
          </button>
        ))}
      </div>
      {s.round === ROUNDS && <p className="md-q" style={{ margin: 0 }}>Last round: whatever happens, the deal is done on what’s agreed (if the club’s money covers it).</p>}
      {c.kind === 'loan' && c.studied < STUDY_CLOCK && (
        <button type="button" className="md-btn ghost" onClick={() => go('/football/desk/job', { id: 'study', target: c.talk })}>{c.studied ? 'Finish studying them: where they’ll give' : 'Study them first: better odds'} · {c.studied} of {STUDY_CLOCK}</button>
      )}
      {chosen && chosen.edges.length > 0 && <p className="md-q" style={{ margin: 0 }}>{chosen.edges.map((e) => `${e.why} ${e.d > 0 ? '+' : '−'}${Math.abs(e.d)}`).join(' · ')}. The odds shown are the odds used.</p>}
      {voices.map(({ d, line }) => line && <p key={d.axis} className="dk-say"><b style={{ color: AXIS_INK[d.axis] }}>{d.axis.toUpperCase()}</b> — {line}</p>)}
      {err && <p className="md-q" style={{ margin: 0 }}>{err}</p>}
      <div className="md-fill" />
      <div className="dk-foot flow">
        <TalkTray dice={m.dice} left={m.left} held={held} onPick={setHeld} />
        <button type="button" className="md-btn" disabled={!held || !reply || busy || Boolean(blocked)} onClick={() => void spend()}>
          {held ? (reply ? `Spend the ${held.value}: ${reply === 'agree' ? 'shake on it' : 'push'}` : 'Pick a reply') : 'Pick up a die'}
        </button>
      </div>
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
  if (!dice.length) return <div className="dk-tray empty">No dice today.</div>;
  return (
    <div className="dk-tray" role="group" aria-label="Your dice">
      {dice.map((d) => {
        const free = left.some((x) => x.axis === d.axis);
        return <button key={d.axis} type="button" className={`dk-die${free ? '' : ' spent'}`} style={{ '--ink': AXIS_INK[d.axis] } as CSSProperties} disabled={!free} aria-pressed={held?.axis === d.axis} aria-label={`${d.axis} ${d.value}${free ? '' : ', spent'}: ${d.reason}`} onClick={() => onPick(d)}>{d.value}</button>;
      })}
    </div>
  );
}

function TalkEnd({ m, c, round, line }: { m: DeskModel; c: TalkCtx; round: TalkRound; line: string }) {
  const t = round.terms;
  const head = round.end === 'deal' ? (c.kind === 'loan' ? `${c.name} signs` : `${c.who} signs`) : round.end === 'walked' ? 'They walked out' : 'No deal';
  return (
    <Page>
      <div className="md-top"><span className="md-cap">{c.kind === 'loan' ? 'Loan talks' : 'Sponsor talks'} · over</span><Back to="/football/desk" label="The desk" /></div>
      <h1 className="dk-h">{head}</h1>
      <div className="mk-say"><span className="mk-sil" aria-hidden="true" /><span>{line}</span></div>
      {round.end === 'deal' && <div className="md-row"><span>Agreed</span><b>{termsText(t, c.name)}</b></div>}
      <p className="md-q" style={{ margin: 0 }}>
        {round.end === 'deal' ? (c.kind === 'loan' ? 'The fee leaves the club’s money when tonight plays; the loan arrives the next morning.' : 'Signed when tonight plays.')
          : round.end === 'walked' ? `They won’t take a call for a week. ${c.kind === 'loan' ? 'Their opinion of Brabo dips a little.' : ''}` : TALK_SHORT}
      </p>
      <button type="button" className="md-btn" onClick={() => go('/football/market', undefined, { replace: true })}>The market</button>
      <button type="button" className="md-btn ghost" onClick={() => go('/football/desk', undefined, { replace: true })}>Back to the desk{m.left.length ? ` · ${m.left.length} left` : ''}</button>
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
  const n = useLiveQuery(async () => { const s = await db.fbSave.get('save'); return leadsFrom(loanLeads(s?.desk)).length; }, []);
  if (n === undefined) return null;
  return (
    <button type="button" className="fbt-btn wide" onClick={() => go('/football/market')}>
      The loan market · {n ? `${n} scouted ${n === 1 ? 'player' : 'players'}` : 'scouts find players here'}
    </button>
  );
}
