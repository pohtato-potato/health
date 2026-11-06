// The cups (board 10): the round list, then the bracket from the last 16 in club colours. A winner carries its colour
// into the next round; after the final the whole bracket opens.
import { clubById, tierName } from '../../../football/data/load';
import { bracketFrom16, type Bracket, type Round, type Tie } from '../../../football/cups';
import { clubColour } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { Tier } from '../../../football/types';

const short = (id: string) => (id === OWN ? 'BRA' : clubById(id).short);
const nm = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);

function Slot({ id, tie }: { id: string | null; tie?: Tie }) {
  if (!id) return <span className="fb-slot unknown" aria-label="Not decided yet"><b>?</b></span>;
  const state = tie?.winner ? (tie.winner === id ? ' w' : ' out') : '';
  return (
    <span className={`fb-slot${state}${id === OWN ? ' me' : ''}`} style={{ '--k': clubColour(id) } as React.CSSProperties} aria-label={`${nm(id)}${state === ' w' ? ', through' : state === ' out' ? ', out' : ''}`}>
      <i aria-hidden="true" /><b>{short(id)}</b>{state === ' w' && <span className="fb-thru">through</span>}
    </span>
  );
}

function RoundBlock({ r, prev }: { r: Round; prev?: Round }) {
  // A round not drawn yet shows its slots from the round before: the winners still to come.
  const ties: (Tie | { home: null; away: null })[] = r.ties.length ? r.ties : Array.from({ length: Math.max(1, (prev?.ties.length ?? 2) / 2) }, () => ({ home: null, away: null }));
  return (
    <div className="fb-round" aria-label={r.name}>
      <span className="fb-lb">{r.name} · day {r.day}</span>
      <div className="fb-ties">
        {ties.map((t, i) => (
          <div key={i} className="fb-tie">
            <Slot id={t.home} tie={'winner' in t ? (t as Tie) : undefined} />
            <Slot id={t.away} tie={'winner' in t ? (t as Tie) : undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The bracket part: from the last 16. While the cup runs, this round and the next; after the final, every round. */
export function BracketView({ b }: { b: Bracket }) {
  const rounds = bracketFrom16(b);
  if (!rounds.length || !rounds[0].ties.length) return null;
  let shown = rounds;
  if (!b.winner) {
    const cur = Math.max(0, rounds.findLastIndex((r) => r.ties.length > 0));
    shown = rounds.slice(cur, cur + 2);
  }
  return (
    <div className="fb-bracket">
      {shown.map((r) => <RoundBlock key={r.name} r={r} prev={rounds[rounds.indexOf(r) - 1]} />)}
      {b.winner && <p className="fb-champ"><span className="fb-lb">Winners</span><b>{nm(b.winner)}</b></p>}
    </div>
  );
}

function myTie(r: Round): Tie | undefined {
  return r.ties.find((t) => t.home === OWN || t.away === OWN);
}
function roundLine(r: Round, out: boolean): { text: string; cls: string } {
  const t = myTie(r);
  if (!t) return { text: out ? '' : r.ties.length ? 'Not in this round' : '', cls: '' };
  if (!t.away) return { text: 'A bye: through without playing', cls: 'w' };
  const opp = t.home === OWN ? t.away : t.home;
  if (!t.winner) return { text: `Day ${r.day} · ${t.home === OWN ? 'home to' : 'away at'} ${nm(opp)}`, cls: 'n' };
  const s = t.home === OWN ? t.score! : [t.score![1], t.score![0]];
  const pens = t.pens ? ` (${t.home === OWN ? t.pens[0] : t.pens[1]}–${t.home === OWN ? t.pens[1] : t.pens[0]} pens)` : '';
  return { text: `${t.winner === OWN ? 'Won' : 'Lost'} ${s[0]}–${s[1]}${pens} v ${nm(opp)}`, cls: t.winner === OWN ? 'w' : 'l' };
}

export interface GiantKilling { winner: string; wTier: Tier; loser: string; lTier: Tier; round: string }
/** Giant-killings: a club beating one two or more tiers above it. */
export function giantKillings(b: Bracket, tierOf: Record<string, Tier>): GiantKilling[] {
  const out: GiantKilling[] = [];
  for (const r of b.rounds) for (const t of r.ties) {
    if (!t.away || !t.winner) continue;
    const loser = t.winner === t.home ? t.away : t.home;
    const wTier = tierOf[t.winner], lTier = tierOf[loser];
    if (wTier && lTier && wTier - lTier >= 2) out.push({ winner: t.winner, wTier, loser, lTier, round: r.name });
  }
  return out;
}

export function Cup({ b, tierOf }: { b: Bracket; tierOf: Record<string, Tier> }) {
  let out = false;
  const left = new Set<string>();
  const last = b.rounds.findLast((r) => r.ties.length);
  for (const t of last?.ties ?? []) { if (t.winner) left.add(t.winner); else { left.add(t.home); if (t.away) left.add(t.away); } }
  const gk = giantKillings(b, tierOf);
  return (
    <section className="fb-cup" aria-label={b.name}>
      <div className="fb-row"><span className="fb-t">{b.name}</span><span className="fb-s">{b.winner ? 'Finished' : `${left.size} still in`}</span></div>
      <ol className="fb-rounds">
        {b.rounds.map((r) => {
          const l = roundLine(r, out);
          if (l.cls === 'l') out = true;
          return (
            <li key={r.name} className={`fb-rd ${l.cls}`}>
              <i aria-hidden="true" />
              <span className="fb-col"><b>{r.name}</b><span className="fb-s">{l.text || `Day ${r.day}`}</span></span>
            </li>
          );
        })}
      </ol>
      <BracketView b={b} />
      {gk.length > 0 && (
        <>
          <span className="fb-lb">Giant-killings so far</span>
          <ul className="fb-gks">
            {gk.slice(-6).map((g, i) => (
              <li key={i}><i style={{ '--k': clubColour(g.winner) } as React.CSSProperties} aria-hidden="true" /><span><b>{nm(g.winner)}</b> ({tierName(g.wTier)}) beat <b>{nm(g.loser)}</b> ({tierName(g.lTier)}), {g.round.toLowerCase()}</span></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
