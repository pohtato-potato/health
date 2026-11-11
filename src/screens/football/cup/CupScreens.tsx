// Cup runs on Football: the Cups door (it replaces the layer-2 "Try a cup match" card), and the cups page in the
// tactics-board world: the run in progress, "How your deck was dealt" before a new run, the twelve cups with their
// silverware, and the record book (spec §2, §3.5, §9, §11).
import { useEffect, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { cupsOpen, type CupBook } from '../../../football/cup/book';
import { titleOf } from '../../../football/cup/cards';
import type { Deal } from '../../../football/cup/deck';
import { cupByN, CUPS } from '../../../football/cup/ladder';
import { dealToday, loadBook, loadRun, startCupRun } from '../../../football/cup/store';
import type { Card } from '../../../football/cup/types';
import { clubById } from '../../../football/data/load';
import { go } from '../../../router';
import { AXIS_INK } from '../../../ui/inks';
import { Aurora } from '../FootballHome';
import { Crest, inkOf, Slab, Trophy } from './CupArt';
import { RunRoute, whereNow } from './CupRun';

/** "One-two ×2, Overlap run". */
const cardList = (cs: Card[]) => [...new Set(cs.map((c) => titleOf(c.kind)))].map((t) => { const k = cs.filter((c) => titleOf(c.kind) === t).length; return k > 1 ? `${t} ×${k}` : t; }).join(', ');
const LEVEL: Record<string, string> = { basic: 'Basic', good: 'Good', great: 'Great', punt: 'Punts' };
const twistLine = (t: string, more = false) => (t === 'None' ? 'No twist: the first cup.' : `Twist: ${t}${more ? ', and every earlier cup\'s' : ''}.`);
const wonCups = (b: CupBook | undefined) => CUPS.filter((c) => (b?.cups[c.n]?.won ?? 0) > 0);

/** The Cups door on Football: the cup you are on, a run in progress, the cups won. */
export function CupsDoor() {
  const run = useLiveQuery(async () => (await loadRun()) ?? null, []);
  const book = useLiveQuery(loadBook, []);
  if (run === undefined || !book) return null;
  const live = run && !run.run.over ? run.run : null;
  const on = cupByN(live ? live.cup : cupsOpen(book));
  const won = wonCups(book);
  return (
    <section className="fb-card cup-door" style={{ '--cup': on.colour } as CSSProperties} aria-labelledby="cup-door-h">
      <div className="cup-door-top">
        <Trophy kind={on.silver} colour={on.colour} size={52} />
        <div>
          <h2 id="cup-door-h" className="cup-h">Cups</h2>
          <p className="fb-s">{live ? `A run of ${on.name} in progress.` : `The cup you are on: ${on.name}.`}</p>
        </div>
      </div>
      {live ? (
        <p className="fb-s">{whereNow(live)} · fitness {live.fitness} · {live.coins} coins · {live.path.length} of {live.map.rows} stops cleared.</p>
      ) : (
        <p className="fb-s">A run is a path of matches, rests and stops with a deck dealt from your last seven days. It never touches the league.</p>
      )}
      {won.length > 0 && (
        <div className="cup-door-won" aria-label={`Cups won: ${won.map((c) => c.name).join(', ')}`}>
          <span className="fb-s">Won</span>
          {won.map((c) => <Trophy key={c.n} kind={c.silver} colour={c.colour} size={32} />)}
        </div>
      )}
      <div className="cup-row">
        <button type="button" className="fb-btn pri" onClick={() => go(live || (run && run.run.over) ? '/football/cup/run' : '/football/cup')}>
          {live ? 'Carry on the run' : run?.run.over ? 'See how the run ended' : 'Start a run'}
        </button>
        <button type="button" className="fb-btn" onClick={() => go('/football/cup')}>{book.runs ? 'Cups and record book' : 'The twelve cups'}</button>
      </div>
    </section>
  );
}

/** "How your deck was dealt" (spec §3.5). */
export function DealView({ deal, title }: { deal: Deal; title: string }) {
  return (
    <section className="cup-deal" aria-label={title}>
      <h2 className="cup-h">{title}</h2>
      <p className="cup-q">Your last seven nights, as the league match scored them. Fifteen or more is great, 11 to 14 good, under 11 basic.</p>
      <ul className="cup-dl">
        {deal.rows.map((r) => (
          <li key={r.axis} className="cup-dr" style={{ '--ink': AXIS_INK[r.axis] } as CSSProperties}>
            <span><b className="cup-ax">{r.axis}</b><br /><span className="cup-q">{LEVEL[r.level]} · {cardList(r.cards)}</span></span>
            <span className="cup-q">7-day</span>
            <b className={`cup-n lv-${r.level}`}>{r.avg != null ? Math.floor(r.avg) : '–'}</b>
            <span className="cup-why">{r.why}</span>
          </li>
        ))}
        {deal.extras.map((e) => (
          <li key={e.card.id} className="cup-dr extra" style={{ '--ink': inkOf(e.card) } as CSSProperties}>
            <span><b className="cup-ax">{e.kind === 'empty' ? 'An empty day' : e.kind === 'record' ? 'A record' : e.kind === 'loan' ? 'On loan' : 'Every ring closed'}</b><br /><span className="cup-q">{e.why}</span></span>
            <span />
            <b className="cup-n">+1</b>
          </li>
        ))}
      </ul>
      <p className="cup-q">{deal.cards.length} cards in all.</p>
    </section>
  );
}

/** /football/cup: the run in progress, or a new run; the twelve cups; the record book. */
export function CupsPage() {
  const run = useLiveQuery(async () => (await loadRun()) ?? null, []);
  const book = useLiveQuery(loadBook, []);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [cup, setCup] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { void dealToday().then(setDeal).catch(() => setErr('Could not read your last seven days.')); }, []);
  if (run === undefined || !book) return null;
  const open = cupsOpen(book);
  const chosen = cup ?? open;
  const live = run && !run.run.over ? run.run : null;
  const start = async () => {
    setBusy(true);
    try { await startCupRun(chosen); go('/football/cup/run'); } catch { setErr('Could not start a run.'); setBusy(false); }
  };
  const combos = Object.entries(book.combos).sort((a, b) => b[1] - a[1]);
  return (
    <div className="cup-board cup-cups">
      <div className="cup-top">
        <button type="button" className="cup-btn ghost sm" onClick={() => go('/football')}><span>Back</span></button>
        <Slab>THE CUPS</Slab>
      </div>
      {live ? (
        <section className="cup-sig" style={{ '--cup': cupByN(live.cup).colour } as CSSProperties}>
          <p className="cup-cap">A run in progress</p>
          <p className="cup-h">{cupByN(live.cup).name}</p>
          <p className="cup-q">{whereNow(live)} · fitness {live.fitness} · {live.coins} coins · {live.path.length} of {live.map.rows} stops cleared. One run at a time.</p>
          <button type="button" className="cup-btn" onClick={() => go('/football/cup/run')}><span>Carry on</span></button>
        </section>
      ) : run?.run.over ? (
        <section className="cup-sig">
          <p className="cup-cap">Your last run has ended</p>
          <button type="button" className="cup-btn" onClick={() => go('/football/cup/run')}><span>See how it ended</span></button>
        </section>
      ) : (
        <>
          {deal && <DealView deal={deal} title="How your deck was dealt" />}
          <div className="cup-sig" style={{ '--cup': cupByN(chosen).colour } as CSSProperties}>
            <p className="cup-cap">Your run</p>
            <p className="cup-h">{cupByN(chosen).name}</p>
            <p className="cup-q">{twistLine(cupByN(chosen).twist, chosen > 1)}</p>
            <button type="button" className="cup-btn" disabled={busy || !deal} onClick={() => void start()}><span>Start the run</span></button>
          </div>
        </>
      )}
      {err && <p role="alert">{err}</p>}

      <h2 className="cup-h">The twelve cups</h2>
      <p className="cup-q">Win a cup to open the next. Each adds a twist and keeps the earlier ones.</p>
      <ol className="cup-ladder">
        {CUPS.map((c) => {
          const rec = book.cups[c.n];
          const isOpen = c.n <= open;
          const pickable = isOpen && !live && !run?.run.over;
          return (
            <li key={c.n} className={`cup-lad ${isOpen ? '' : 'shut'} ${chosen === c.n && pickable ? 'sel' : ''}`} style={{ '--cup': c.colour } as CSSProperties}>
              <button type="button" disabled={!pickable} aria-pressed={chosen === c.n} onClick={() => setCup(c.n)}>
                <Trophy kind={c.silver} colour={isOpen ? c.colour : '#5d6170'} size={40} />
                <span>
                  <b>{c.n}. {c.name}</b><br />
                  <span className="cup-q">{isOpen ? twistLine(c.twist) : 'Opens when you win the cup before it.'}</span>
                  {rec && <><br /><span className="cup-q">{rec.won ? `Won ${rec.won}×` : `Furthest: ${rec.furthest} stops`}{rec.fastest != null ? ` · fastest win ${rec.fastest} cards` : ''} · {rec.runs} run{rec.runs === 1 ? '' : 's'}</span></>}
                  {isOpen && c.note && <><br /><span className="cup-q">{c.note}</span></>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <h2 className="cup-h">The record book</h2>
      {book.runs === 0 ? <p className="cup-q">Every run counts here, paid or not: furthest stop in each cup, fastest win, biggest scoreline, clubs beaten and combinations landed.</p> : (
        <>
          <ul className="cup-rows">
            <li><span>Runs</span><b>{book.runs}</b></li>
            <li><span>Cups won</span><b>{wonCups(book).length}</b></li>
            <li><span>Biggest scoreline</span><b>{book.biggest ? `${book.biggest.for}–${book.biggest.against} v ${book.biggest.club}` : '–'}</b></li>
            <li><span>Clubs beaten</span><b>{book.beaten.length}</b></li>
          </ul>
          {book.beaten.length > 0 && <div className="cup-beaten" aria-label="Clubs beaten">{book.beaten.slice(-24).map((id) => <span key={id} title={safeName(id)}><Crest id={id} size={30} /></span>)}</div>}
          {combos.length > 0 && <><p className="cup-cap">Combinations landed</p><ul className="cup-rows">{combos.map(([k, v]) => <li key={k}><span>{k}</span><b>{v}</b></li>)}</ul></>}
        </>
      )}
    </div>
  );
}
const safeName = (id: string) => { try { return clubById(id).name; } catch { return id; } };

/** The route shell: the tactics board behind every cup screen. */
export function CupRoute({ path }: { path: string }) {
  return (
    <Aurora className="cup-world">
      <main className="fb-page cup-page">{path === '/football/cup' ? <CupsPage /> : <RunRoute />}</main>
    </Aurora>
  );
}
