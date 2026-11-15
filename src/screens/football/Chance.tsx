// The chance (ledger O40, letter 1a): win, draw and loss as three labelled parts, from tonight's match played out on
// fixed seeds by the engine. Shown on Tonight and on Today's match panel. Each part carries its word and its number,
// so the colour is never the only sign.
import { useLiveQuery } from 'dexie-react-hooks';
import type { DayKey } from '../../domain/dates';
import { CHANCE_SEEDS, chancePercents, type Chance } from '../../football/chance';
import { chanceShape, oppShape } from '../../football/matchup';
import type { Opponent } from '../../football/opponent';
import { loadChance, type TonightChance } from '../../football/store/chance';
import type { AxisValues } from '../../football/types';

export const WIN_INK = '#f2c46d', DRAW_INK = '#c4c1cf', LOSS_INK = '#93c3dc';

export const useChance = (date: DayKey) => useLiveQuery(() => loadChance(date), [date]);

/** The chance the page leads with: the night as it stands, or a usual night before anything is logged today. */
export function shownChance(c: TonightChance): { c: Chance; usual: boolean } {
  return c.nothingYet && c.usual ? { c: c.usual, usual: true } : { c: c.now, usual: false };
}

/** The opponent on the radar, sized to agree with the chance (their old drawing until the chance is in). */
export function oppDrawing(opp: Opponent | undefined, mine: AxisValues, c: TonightChance | null | undefined): AxisValues | undefined {
  if (!opp) return undefined;
  return c ? chanceShape(opp, mine, shownChance(c).c) : oppShape(opp);
}

export function ChanceBar({ c, oppName }: { c: TonightChance; oppName: string }) {
  const { c: ch, usual } = shownChance(c);
  const [w, d, l] = chancePercents(ch);
  const parts = [
    { k: 'w', word: 'Win', n: w, ink: WIN_INK },
    { k: 'd', word: 'Draw', n: d, ink: DRAW_INK },
    { k: 'l', word: 'Loss', n: l, ink: LOSS_INK },
  ];
  return (
    <div className="fb-chance" role="group" aria-label={`${usual ? 'On a usual night' : 'Tonight’s chance as it stands'} against ${oppName}: win ${w} in 100, draw ${d}, loss ${l}`}>
      <p className="fb-chance-h">{usual ? 'On a usual night' : 'Tonight’s chance, as it stands'}</p>
      <span className="fb-chance-bar" aria-hidden="true">
        {parts.map((p) => p.n > 0 && <i key={p.k} className={p.k} style={{ width: `${p.n}%`, background: p.ink }} />)}
      </span>
      <span className="fb-chance-row" aria-hidden="true">
        {parts.map((p) => (
          <span key={p.k} className={`fb-chance-part ${p.k}`}>
            <i style={{ background: p.ink }} />
            <span><b style={{ color: p.ink }}>{p.n}%</b> {p.word}</span>
          </span>
        ))}
      </span>
      <p className="fb-chance-note">
        {usual
          ? `Nothing of today is logged yet, so this is tonight’s match on your usual night, played out ${CHANCE_SEEDS} times. It turns into tonight’s own chance with your first log.`
          : `Tonight’s match played out ${CHANCE_SEEDS} times on your numbers so far, the plan and everything the match counts. It moves as the day’s logs come in.`}
      </p>
    </div>
  );
}
