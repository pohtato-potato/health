// The cups (board 10): the round list, then the bracket from the last 16 in club colours. A winner carries its colour
// into the next round; after the final the whole bracket opens.
import { clubById, tierName } from '../../../football/data/load';
import { bracketFrom16, type Bracket, type Round, type Tie } from '../../../football/cups';
import { clubColour } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { Tier } from '../../../football/types';
import { CONT, CONT2, CONT_NAME, phaseTable, type Continental } from '../../../football/continental';
import { ordinal } from '../../../football/habitLines';
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { Art } from '../world/Fog';

const short = (id: string) => (id === OWN ? 'BRA' : clubById(id).short);
const nm = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);
// Your crest where the save is not to hand: the founding step, as on the first night.
const crestOf = (id: string, n: number) => (id === OWN ? crestSvg(1, 'a', n) : clubCrest(clubById(id), n));

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

const TROPHY: Record<'cup' | 'pair', string> = {
  cup: 'M50 20h50v28c0 22-12 36-25 36S50 70 50 48zM50 30H34c0 16 8 22 18 22M100 30h16c0 16-8 22-18 22M68 84h14v18H68zM54 102h42v12H54z',
  pair: 'M36 26h32v22c0 16-7 26-16 26s-16-10-16-26zM82 26h32v22c0 16-7 26-16 26s-16-10-16-26zM46 74h12v22H46zM92 74h12v22H92zM38 96h74v12H38z',
};
/** Each cup's own colour and silverware. */
export const cupLook = (_id: string): { ink: string; shape: 'cup' | 'pair' } => ({ ink: '#ffd36b', shape: 'cup' });

/** One cup (board 23, u23-big and u23-pair): the trophy turning in its glow, tonight's tie, then the road of rounds
 *  with the one you are on marked in words, the bracket and the giant-killings. */
export function Cup({ b, tierOf, own }: { b: Bracket; tierOf: Record<string, Tier>; /** Your crest. */ own?: string }) {
  let out = false;
  const left = new Set<string>();
  const last = b.rounds.findLast((r) => r.ties.length);
  for (const t of last?.ties ?? []) { if (t.winner) left.add(t.winner); else { left.add(t.home); if (t.away) left.add(t.away); } }
  const gk = giantKillings(b, tierOf);
  const look = cupLook(b.id);
  const live = b.rounds.find((r) => { const t = myTie(r); return t && t.away && !t.winner; });
  const tie = live && myTie(live);
  return (
    <section className="fb-cup cup23" aria-label={b.name} style={{ '--c': look.ink } as React.CSSProperties}>
      <div className="tro-23" aria-hidden="true"><span className="gl-23" /><svg viewBox="0 0 150 130"><path d={TROPHY[look.shape]} fill={`color-mix(in srgb, ${look.ink} 70%, #fff)`} stroke="#140f22" strokeWidth="3" strokeLinejoin="round" /></svg></div>
      <h2 className="cn-23">{b.name}</h2>
      <span className="sub-23">{b.winner ? `Finished · won by ${nm(b.winner)}` : `${left.size} still in`}</span>
      {tie && live && (
        <>
          <div className="tie-23">
            <span><Art svg={tie.home === OWN && own ? own : crestOf(tie.home, 56)} />{nm(tie.home)}</span>
            <span className="v" aria-hidden="true">v</span>
            <span><Art svg={tie.away === OWN && own ? own : crestOf(tie.away!, 56)} />{nm(tie.away!)}</span>
          </div>
          <p className="lead23">{live.name}, {tie.home === OWN ? 'at home' : 'away'} · day {live.day}.</p>
        </>
      )}
      <div className="hd23"><b>The road</b><span>{b.rounds.length} rounds</span></div>
      <ol className="rd-23">
        {b.rounds.map((r, k) => {
          const l = roundLine(r, out);
          if (l.cls === 'l') out = true;
          const now = r === live;
          const cls = now ? 'now' : l.cls === 'w' ? 'w' : l.cls === 'l' ? 'x' : '';
          return (
            <li key={r.name} className={`rd-r${cls ? ` ${cls}` : ''}`} aria-current={now ? 'step' : undefined}>
              <i aria-hidden="true">{r.name === 'Final' ? 'F' : k + 1}</i>
              <span><b>{r.name}{now && <em> · This round</em>}</b><small>{l.text || `Day ${r.day}`}</small></span>
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

/** The Continental Cup: Brabo's eight phase nights and the phase table while it runs, then the knockout bracket. */
export function ContinentalView({ c, tierOf, world = 1 }: { c: Continental; tierOf: Record<string, Tier>; world?: 1 | 2 }) {
  const phase = world === 2 ? CONT2.phase : CONT.phase;
  const mine = c.field.includes(OWN);
  const table = phaseTable(c);
  const played = c.results.length;
  const pos = table.findIndex((r) => r.id === OWN);
  const status = c.ko ? (pos >= 0 ? `Finished ${ordinal(pos + 1)}` : 'Finished') : played ? `League phase, ${played} of 8 played` : 'Starts on day 2';
  const rows = table.slice(0, 8).concat(mine && pos >= 8 ? [table[pos]] : []);
  return (
    <>
      {c.ko && <Cup b={c.ko} tierOf={tierOf} />}
      <section className="fb-cup" aria-label={c.ko ? `${CONT_NAME}, league phase` : CONT_NAME}>
        <div className="fb-row"><span className="fb-t">{c.ko ? 'League phase' : CONT_NAME}</span><span className="fb-s">{status}</span></div>
        {!mine && <p className="fb-s">Last season’s Crown League top four play it, with twelve clubs from abroad. Reach the top four to get in.</p>}
        {mine && !c.ko && (
          <ol className="fb-rounds">
            {c.rounds.map((r, i) => {
              const p = r.find(([h, a]) => h === OWN || a === OWN)!;
              const opp = p[0] === OWN ? p[1] : p[0];
              const res = c.results[i]?.find((x) => x.home === OWN || x.away === OWN);
              const s = res && (res.home === OWN ? res.score : [res.score[1], res.score[0]]);
              const word = s ? (s[0] > s[1] ? 'Won' : s[0] < s[1] ? 'Lost' : 'Drew') : '';
              return (
                <li key={i} className={`fb-rd ${s ? (s[0] > s[1] ? 'w' : s[0] < s[1] ? 'l' : '') : i === played ? 'n' : ''}`}>
                  <i aria-hidden="true" />
                  <span className="fb-col"><b>Night {i + 1} · day {phase[i]}</b><span className="fb-s">{s ? `${word} ${s[0]}–${s[1]} v ${nm(opp)}` : `${p[0] === OWN ? 'Home to' : 'Away at'} ${nm(opp)}`}</span></span>
                </li>
              );
            })}
          </ol>
        )}
        {played > 0 && (
          <>
            <span className="fb-lb">League phase table · top 8 go through</span>
            <ol className="fb-ctab" aria-label="League phase table">
              {rows.map((r) => {
                const n = table.indexOf(r) + 1;
                return (
                  <li key={r.id} className={`${r.id === OWN ? 'me' : ''}${n === 8 ? ' cut' : ''}`} style={{ '--k': clubColour(r.id) } as React.CSSProperties}>
                    <b className="fb-num">{n}</b>
                    <span className="fb-ctn">{nm(r.id)}{r.id === OWN && <span className="fb-tag">You</span>}</span>
                    <span className="fb-s fb-num">{r.p} pl</span>
                    <b className="fb-num">{r.pts} pts</b>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>
    </>
  );
}
