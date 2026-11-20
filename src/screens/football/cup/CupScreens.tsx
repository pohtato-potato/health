// Cup runs on Football: the Cups door (it replaces the layer-2 "Try a cup match" card), and the cups page in the
// tactics-board world: the run in progress, "How your deck was dealt" before a new run, the twelve cups with their
// silverware, and the record book (spec §2, §3.5, §9, §11).
import { useEffect, useState, type CSSProperties } from 'react';
import type { CupDef } from '../../../football/cup/ladder';
import { useLiveQuery } from 'dexie-react-hooks';
import { cupsOpen, type CupBook } from '../../../football/cup/book';
import { titleOf } from '../../../football/cup/cards';
import type { Deal } from '../../../football/cup/deck';
import { cupByN, CUPS } from '../../../football/cup/ladder';
import { dealToday, loadBook, loadRun, startCupRun, type CupDone } from '../../../football/cup/store';
import type { Card } from '../../../football/cup/types';
import { clubById } from '../../../football/data/load';
import { db } from '../../../db/db';
import { go, useRoute } from '../../../router';
import { AXIS_INK } from '../../../ui/inks';
import { Panel, Sect } from '../../../ui/kit/Kit';
import { Aurora } from '../FootballHome';
import { Crest, inkOf, Trophy } from './CupArt';
import { CupAct, CupHead, CUPS_HOW } from './CupKit';
import { RunRoute, whereNow } from './CupRun';

/** "One-two ×2, Overlap run". */
const cardList = (cs: Card[]) => [...new Set(cs.map((c) => titleOf(c.kind)))].map((t) => { const k = cs.filter((c) => titleOf(c.kind) === t).length; return k > 1 ? `${t} ×${k}` : t; }).join(', ');
const LEVEL: Record<string, string> = { basic: 'Basic', good: 'Good', great: 'Great', punt: 'Punts' };
const twistLine = (t: string, more = false) => (t === 'None' ? 'No twist: the first cup.' : `Twist: ${t}${more ? ', and every earlier cup\'s' : ''}.`);
/** The value-scale colour of a seven-day number: great green, good blue, basic orange (cv-deal). */
const levelInk = (avg: number | null) => (avg == null ? '#c4c1cf' : avg >= 15 ? '#8fdcb6' : avg >= 11 ? '#93b8f0' : '#ff9a4d');
const wonCups = (b: CupBook | undefined) => CUPS.filter((c) => (b?.cups[c.n]?.won ?? 0) > 0);

/** The Cups door on Tonight: a filled panel in the cup's colour with its trophy and one live line. */
export function CupsDoor() {
  const run = useLiveQuery(async () => (await loadRun()) ?? null, []);
  const book = useLiveQuery(loadBook, []);
  if (run === undefined || !book) return null;
  const live = run && !run.run.over ? run.run : null;
  const on = cupByN(live ? live.cup : cupsOpen(book));
  const won = wonCups(book);
  return (
    <Panel ink={on.colour} onClick={() => go(live ? '/football/cup/run' : '/football/cup')} label={live ? `Cups: a run of ${on.name} in progress` : `Cups: ${on.name}`} className="cup-door">
      <span className="cup-opt-l">
        <Trophy kind={on.silver} colour={on.colour} size={44} />
        <span className="cup-grow">
          <b className="k-lb">Cups</b><br />
          <span className="cup-door-v">{live ? `${on.name}: ${whereNow(live).toLowerCase()}, fitness ${live.fitness}` : on.name}</span><br />
          <span className="k-q">{live ? `${live.path.length} of ${live.map.rows} stops cleared` : won.length ? `${won.length} won · a card-and-map side game` : 'A card-and-map side game'}</span>
        </span>
      </span>
    </Panel>
  );
}

/** "How your deck was dealt" (spec §3.5): one filled row per axis in its ink, the seven-day number in the value-scale colour. */
export function DealView({ deal, title = "How your deck was dealt" }: { deal: Deal; title?: string }) {
  return (
    <section className="cup-deal" aria-label={title}>
      <ul className="cup-dl">
        {deal.rows.map((r) => (
          <li key={r.axis}>
            <Panel ink={AXIS_INK[r.axis]} className="cup-dr">
              <span className="cup-grow"><b className="k-lb">{r.axis}</b><br /><span className="k-q">{LEVEL[r.level]} · {cardList(r.cards)}</span></span>
              <span className="k-q cup-nw">7-day</span>
              <b className="cup-n" style={{ color: levelInk(r.avg) }}>{r.avg != null ? Math.floor(r.avg) : '–'}</b>
            </Panel>
          </li>
        ))}
        {deal.extras.map((e) => (
          <li key={e.card.id}>
            <Panel ink={inkOf(e.card)} className="cup-dr extra">
              <span className="cup-grow"><b className="k-lb">{e.kind === 'empty' ? 'An empty day' : e.kind === 'record' ? 'A record' : e.kind === 'loan' ? 'On loan' : 'Every ring closed'}</b><br /><span className="k-q">{e.why}</span></span>
              <b className="cup-n">+1</b>
            </Panel>
          </li>
        ))}
      </ul>
      <p className="cup-q">{deal.cards.length} cards in all. {deal.rows.filter((r) => r.why && !/^7 days logged/.test(r.why)).map((r) => `${r.axis}: ${r.why}`).join(' ')}</p>
    </section>
  );
}

const recLine = (c: CupDef, b: CupBook) => {
  const rec = b.cups[c.n];
  if (!rec) return '';
  return `${rec.won ? `Won ${rec.won}×` : `Furthest: ${rec.furthest} stops`}${rec.fastest != null ? ` · fastest win ${rec.fastest} cards` : ''} · ${rec.runs} run${rec.runs === 1 ? '' : 's'}`;
};

const dayShort = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The cups won (board 20, c20-cups): their trophies rise, then the record across every winning run, then each run
 *  won with its wins of played, score, best win and day. Nothing won: nothing shown. */
export function CupsWon({ done }: { done: CupDone[] }) {
  const won = done.filter((d) => d.result === 'won');
  if (!won.length) return null;
  const cups = [...new Set(won.map((d) => d.cup))].map(cupByN);
  const sum = (f: (d: CupDone) => number) => won.reduce((a, d) => a + f(d), 0);
  const beaten = new Set(won.flatMap((d) => d.stats.beaten)).size;
  return (
    <section className="cw20" aria-label="Cups won">
      <div className="tc20" role="img" aria-label={`${cups.length} ${cups.length === 1 ? 'cup' : 'cups'} won: ${cups.map((c) => c.name).join(', ')}`}>
        {cups.slice(0, 5).map((c, i) => <span key={c.n} className="tc20-t" style={{ '--d': `${0.2 + i * 0.2}s`, color: c.colour } as CSSProperties}><Trophy kind={c.silver} colour={c.colour} size={i === 1 ? 72 : 60} /></span>)}
      </div>
      <div className="cu20"><b>{cups.length} {cups.length === 1 ? 'cup' : 'cups'}, {sum((d) => d.stats.won)} from {sum((d) => d.stats.played)}</b><span>{sum((d) => d.stats.goalsFor)} scored, {sum((d) => d.stats.goalsAgainst)} let in, {beaten} {beaten === 1 ? 'club' : 'clubs'} beaten</span></div>
      <h3 className="cup-h3">Cup runs won</h3>
      <div className="cr20">
        {won.map((d, i) => {
          const c = cupByN(d.cup);
          const big = d.stats.biggest;
          return (
            <div key={`${d.cup}-${d.date}-${i}`} style={{ '--c': c.colour, '--d': `${0.6 + Math.min(i, 8) * 0.12}s` } as CSSProperties}>
              <Trophy kind={c.silver} colour={c.colour} size={44} />
              <b>{c.name}</b>
              <em className="fb-num">{d.stats.won}/{d.stats.played}</em>
              <small>{d.stats.goalsFor}–{d.stats.goalsAgainst}{big ? ` · best ${big.for}–${big.against} v ${big.club}` : ''} · {dayShort(d.date)}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** /football/cup: the cabinet. The cup you are on leads; then the twelve cups, then the record book. */
export function CupsPage() {
  const run = useLiveQuery(async () => (await loadRun()) ?? null, []);
  const book = useLiveQuery(loadBook, []);
  const done = useLiveQuery(() => db.cupDone.orderBy('date').toArray(), []);
  if (run === undefined || !book) return null;
  const open = cupsOpen(book);
  const live = run && !run.run.over ? run.run : null;
  const lead = cupByN(live ? live.cup : open);
  const combos = Object.entries(book.combos).sort((a, b) => b[1] - a[1]);
  const won = wonCups(book);
  return (
    <div className="cup-board cup-cups" style={{ '--cup': lead.colour } as CSSProperties}>
      <CupHead back="Football" onBack={() => go('/football')} title="THE CUPS" help={CUPS_HOW} />
      <div className="cup-lead">
        <Trophy kind={lead.silver} colour={lead.colour} size={132} label={lead.name} />
        <h2 className="cup-h1" style={{ color: lead.colour }}>{lead.name}</h2>
        <p className="cup-under">{live ? `A run in progress: ${whereNow(live).toLowerCase()} · fitness ${live.fitness} · ${live.coins} coins` : run?.run.over ? 'Your last run has ended.' : `The cup you are on. ${twistLine(lead.twist, lead.n > 1)}`}</p>
      </div>
      {live ? <CupAct onClick={() => go('/football/cup/run')}>Carry on the run</CupAct>
        : run?.run.over ? <CupAct onClick={() => go('/football/cup/run')}>See how it ended</CupAct>
          : <CupAct onClick={() => go('/football/cup', { n: String(open) })}>Start a run</CupAct>}

      {done && <CupsWon done={done} />}

      <Sect>The twelve cups</Sect>
      <ol className="cup-ladder">
        {CUPS.map((c) => {
          const isOpen = c.n <= open;
          const r = recLine(c, book);
          const inner = (
            <span className="cup-opt-l">
              <Trophy kind={c.silver} colour={c.colour} size={36} />
              <span className="cup-grow">
                <b className="k-lb">{c.name}</b><br />
                <span className="k-q">{isOpen ? (r || (c.n === open ? 'Playing now' : 'Open')) : 'Locked: win the cup before it'}</span>
              </span>
            </span>
          );
          return (
            <li key={c.n}>
              {isOpen ? <Panel ink={c.colour} onClick={() => go('/football/cup', { n: String(c.n) })} label={`${c.name}: ${r || 'open'}`}>{inner}</Panel>
                : <Panel ink={c.colour} className="cup-shut">{inner}</Panel>}
            </li>
          );
        })}
      </ol>

      <Sect>The record book</Sect>
      {book.runs === 0 ? <p className="cup-q">Every run counts here, paid or not.</p> : (
        <>
          <div className="cup-recs">
            <Panel ink="#ede6da"><b className="cup-n">{book.runs}</b><span className="k-q">runs</span></Panel>
            <Panel ink="#f2c46d"><b className="cup-n">{won.length}</b><span className="k-q">cups won</span></Panel>
            <Panel ink={AXIS_INK.Power}><b className="cup-n">{book.biggest ? `${book.biggest.for}–${book.biggest.against}` : '–'}</b><span className="k-q">{book.biggest ? `biggest, v ${book.biggest.club}` : 'biggest scoreline'}</span></Panel>
            <Panel ink={AXIS_INK.Pace}><b className="cup-n">{book.beaten.length}</b><span className="k-q">clubs beaten</span></Panel>
          </div>
          {book.beaten.length > 0 && <div className="cup-beaten" aria-label="Clubs beaten">{book.beaten.slice(-24).map((id) => <span key={id} title={safeName(id)}><Crest id={id} size={30} /></span>)}</div>}
          {combos.length > 0 && <Panel ink={AXIS_INK.Routine}><b className="k-lb">Combinations landed</b><ul className="cup-rows">{combos.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul></Panel>}
        </>
      )}
    </div>
  );
}
const safeName = (id: string) => { try { return clubById(id).name; } catch { return id; } };

/** /football/cup?n=…: one cup's page. Its trophy leads; its twist, your record there, and the deck your week deals. */
export function CupPage({ n }: { n: number }) {
  const run = useLiveQuery(async () => (await loadRun()) ?? null, []);
  const book = useLiveQuery(loadBook, []);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { void dealToday().then(setDeal).catch(() => setErr('Could not read your last seven days.')); }, []);
  if (run === undefined || !book) return null;
  const c = cupByN(n);
  const open = cupsOpen(book);
  const live = run && !run.run.over ? run.run : null;
  const ended = !!run?.run.over;
  const back = () => go('/football/cup', undefined, { replace: true });
  if (n > open) { back(); return null; }
  const start = async () => {
    setBusy(true);
    try { await startCupRun(n); go('/football/cup/run'); } catch { setErr('Could not start a run.'); setBusy(false); }
  };
  const r = recLine(c, book);
  return (
    <div className="cup-board cup-one" style={{ '--cup': c.colour } as CSSProperties}>
      <CupHead back="Cups" onBack={back} title={c.name.toUpperCase()} help={CUPS_HOW} />
      <div className="cup-lead">
        <Trophy kind={c.silver} colour={c.colour} size={120} label={c.name} />
        <p className="cup-under cup-centre">{c.n} of {CUPS.length} · {twistLine(c.twist, c.n > 1)}</p>
      </div>
      {(r || c.note) && (
        <Panel ink={c.colour}>
          {r && <><b className="k-lb">Your record here</b><span>{r}</span></>}
          {c.note && <span className="k-q">{c.note}</span>}
        </Panel>
      )}
      {live || ended ? (
        <>
          <p className="cup-q">One run at a time. {live ? `${cupByN(live.cup).name} is in progress.` : 'Your last run has ended; see it first.'}</p>
          <CupAct onClick={() => go('/football/cup/run')}>{live ? 'Carry on the run' : 'See how it ended'}</CupAct>
        </>
      ) : (
        <>
          <Sect>How your deck was dealt</Sect>
          {deal ? <DealView deal={deal} /> : <p className="cup-q">Dealing from your last seven days…</p>}
          {err && <p role="alert">{err}</p>}
          <CupAct disabled={busy || !deal} onClick={() => void start()}>Start the run</CupAct>
        </>
      )}
    </div>
  );
}

/** The route shell: the tactics board behind every cup screen. */
export function CupRoute({ path }: { path: string }) {
  const { params } = useRoute();
  const n = Number(params.get('n') ?? 0);
  return (
    <Aurora className="cup-world">
      <main className="fb-page cup-page">{path === '/football/cup' ? (n ? <CupPage key={n} n={n} /> : <CupsPage />) : <RunRoute />}</main>
    </Aurora>
  );
}
