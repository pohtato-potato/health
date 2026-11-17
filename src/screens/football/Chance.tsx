// The chance (ledger O40, letter 1a): win, draw and loss as three labelled parts, from tonight's match played out on
// fixed seeds by the engine. Shown on Tonight and on Today's match panel. Each part carries its word and its number,
// so the colour is never the only sign.
import { useLiveQuery } from 'dexie-react-hooks';
import type { DayKey } from '../../domain/dates';
import { CHANCE_SEEDS, chancePercents, type Chance } from '../../football/chance';
import { chanceShape, oppShape } from '../../football/matchup';
import type { Opponent } from '../../football/opponent';
import { loadChances, type NightChance, type TonightChance } from '../../football/store/chance';
import type { AxisValues } from '../../football/types';
import { clubById } from '../../football/data/load';
import { dayOfLogging } from '../../domain/dates';
import { BRABO_INK, rivalInk } from '../../ui/inks';
import { AXES, type Axis } from '../../football/types';
import { lerp, spring, useChange, useTween } from '../../ui/motion/motion';

/** Win in Brabo's colour, loss in the opponent's, draw neutral (O41): each part also carries its word and number. */
export const DRAW_INK = '#c4c1cf';
export const lossInkOf = (oppId: string | undefined) => (oppId ? rivalInk(clubById(oppId).colours) : '#93c3dc');

/** Every match of tonight with its own chance (a double-header night has two or more). */
export const useChances = (date: DayKey) => useLiveQuery(() => loadChances(date), [date]);
/** Tonight's first match's chance. */
export function useChance(date: DayKey): NightChance | null | undefined {
  const all = useChances(date);
  return all === undefined ? undefined : all[0] ?? null;
}

/** From 6 pm (or on a day already past) the chance always reads "as it stands" (finding 4, O42). */
export function lateFor(date: DayKey, now = Date.now()): boolean {
  return date < dayOfLogging(now) || new Date(now).getHours() >= 18;
}

/** The chance the page leads with: the night as it stands, or a usual night before anything is logged, until 6 pm. */
export function shownChance(c: TonightChance, late = false): { c: Chance; usual: boolean } {
  return c.nothingYet && c.usual && !late ? { c: c.usual, usual: true } : { c: c.now, usual: false };
}

/** The opponent on the radar, sized to agree with the chance (their old drawing until the chance is in). */
export function oppDrawing(opp: Opponent | undefined, mine: AxisValues, c: TonightChance | null | undefined, late = false): AxisValues | undefined {
  if (!opp) return undefined;
  return c ? chanceShape(opp, mine, shownChance(c, late).c) : oppShape(opp);
}

const FOG_WORD: Record<string, string> = { Pace: 'steps', Fuel: 'food', Rest: 'sleep', Routine: 'the checklist' };
const listOf = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** What a log is called once it is in, for the chip that says what moved the chance (O44). */
const LOG_WORD: Record<Axis, string> = { Pace: 'steps', Power: 'a session', Fuel: 'food', Rest: 'sleep', Routine: 'the checklist', Shape: 'a weigh-in' };
interface Seen { p: [number, number, number]; v: AxisValues | null; fog: Axis[]; usual: boolean }
/** The words for what moved the chance since it was last seen: an axis out of fog, else the axis that moved most. */
export function movedBy(from: Seen, to: Seen): string | undefined {
  const freed = from.fog.filter((a) => !to.fog.includes(a));
  if (freed.length) return `${listOf(freed.map((a) => LOG_WORD[a]))} in`;
  if (from.usual && !to.usual) return 'your first log in';
  if (!from.v || !to.v) return undefined;
  const a = [...AXES].sort((x, y) => Math.abs(to.v![y] - from.v![y]) - Math.abs(to.v![x] - from.v![x]))[0];
  const dv = to.v[a] - from.v[a];
  return dv ? `${a} ${dv > 0 ? 'up' : 'down'} ${Math.abs(dv)}` : undefined;
}

/**
 * The chance bar (motion board two, take two, without the shine; O44): when it moved since it was last seen it springs
 * from where it was, past the new mark and back like something with weight, and a chip says what moved it.
 * `values`: tonight's shape, so the chip can name the axis that moved.
 */
export function ChanceBar({ c, oppName, oppId, date, values, now = Date.now() }: { c: TonightChance; oppName: string; oppId?: string; date: DayKey; values?: AxisValues; now?: number }) {
  const late = lateFor(date, now);
  const { c: ch, usual } = shownChance(c, late);
  const [w, d, l] = chancePercents(ch);
  const seen = useChange<Seen>(`chance:${date}:${oppId ?? ''}`, { p: [w, d, l], v: values ?? null, fog: c.fog ?? [], usual });
  const k = spring(useTween(seen.n, 1400));
  const from = seen.n ? seen.from?.p : undefined;
  const at = (i: number, n: number) => (from ? Math.max(0, lerp(from[i], n, k)) : n);
  const dw = from ? w - from[0] : 0;
  const why = seen.n && seen.from ? movedBy(seen.from, seen.to) : undefined;
  const lossInk = lossInkOf(oppId);
  const parts = [
    { k: 'w', word: 'Win', n: w, at: at(0, w), ink: BRABO_INK },
    { k: 'd', word: 'Draw', n: d, at: at(1, d), ink: DRAW_INK },
    { k: 'l', word: 'Loss', n: l, at: at(2, l), ink: lossInk },
  ];
  const fog = (c.fog ?? []).map((a) => FOG_WORD[a] ?? a);
  return (
    <div className="fb-chance" role="group" aria-label={`${usual ? 'On a usual night' : 'Tonight’s chance as it stands'} against ${oppName}: win ${w} in 100, draw ${d}, loss ${l}`}>
      <p className="fb-chance-h">{usual ? 'On a usual night' : 'Tonight’s chance, as it stands'}</p>
      {dw !== 0 && <span key={seen.n} className="mo-chip" style={{ color: dw > 0 ? BRABO_INK : lossInk }}>{dw > 0 ? `+${dw}` : `−${-dw}`} win{why ? ` · ${why}` : ''}</span>}
      <span className="fb-chance-bar" aria-hidden="true">
        {parts.map((p) => (p.n > 0 || p.at > 0.5) && <i key={p.k} className={p.k} style={{ width: `${p.at}%`, background: p.ink }} />)}
      </span>
      <span className="fb-chance-row" aria-hidden="true">
        {parts.map((p) => (
          <span key={p.k} className={`fb-chance-part ${p.k}`}>
            <i style={{ background: p.ink }} />
            <span><b className="mo-roll" style={{ color: p.ink }}>{Math.round(p.at)}%</b> {p.word}</span>
          </span>
        ))}
      </span>
      {!usual && c.nothingYet && (
        <p className="fb-chance-fog"><b>Nothing logged today.</b> {listOf(fog).replace(/^./, (x) => x.toUpperCase())} are in fog, so the team plays far below itself. Log any of them and this moves.</p>
      )}
      {!usual && !c.nothingYet && late && fog.length > 0 && (
        <p className="fb-chance-fog"><b>{listOf(fog).replace(/^./, (x) => x.toUpperCase())} {fog.length === 1 && fog[0] !== 'steps' ? 'is' : 'are'} still in fog.</b> Logging {fog.length === 1 ? 'it' : 'them'} moves this.</p>
      )}
      <p className="fb-chance-note">
        {usual
          ? `Nothing of today is logged yet, so this is tonight’s match on your usual night, played out ${CHANCE_SEEDS} times. It turns into tonight’s own chance with your first log.`
          : `Tonight’s match played out ${CHANCE_SEEDS} times on your numbers so far, the plan and everything the match counts. It moves as the day’s logs come in.`}
      </p>
    </div>
  );
}
