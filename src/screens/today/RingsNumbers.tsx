import { useState, type ReactNode } from 'react';
import { Roll } from '../../ui/motion/Roll';
import { fmtInt } from '../../domain/format';

/** The steps box: a whole number of 0 or more; empty or anything else saves nothing. */
export function parseSteps(input: string): number | undefined {
  const t = input.trim();
  if (!/^\d+$/.test(t)) return undefined;
  return Number(t);
}

/**
 * A number that counts up from zero when the page opens and each time the rings are tapped, and rolls past its new
 * value and back when it changes (the shared Roll, O44). The width stays put: the digits are tabular.
 */
export function CountUp({ text, play, id }: { text: string; play: number; id?: string }) {
  const n = /^[\d,]+$/.test(text) ? Number(text.replace(/,/g, '')) : NaN;
  if (!Number.isFinite(n) || n <= 0) return <b className="tn">{text}</b>;
  return (
    <b className="tn">
      <Roll value={n} format={fmtInt} id={id} countIn replay={play} />
    </b>
  );
}

export type RingRow = { key: 'kcal' | 'protein' | 'steps' | 'sleep'; name: string; value: string; unit: string; target: string; ink: string; known: boolean; /** The share of the goal reached, for the row's bar (0 or more; drawn capped at full). */ progress: number; /** The goal is met: the number turns radiant with a soft glow, in its own colour. */ done?: boolean };

/**
 * The rings with a bar for each beside them (Home C, board six): the name, the number in the ring's ink with a small
 * unit, and the bar filled to its share. Tapping a row shows its target and its action in place: Log food, or a
 * number pad for steps. The ring drawing is passed in.
 */
export function RingsNumbers({ rows, rings, closed, of = 4, onLogFood, onLogSleep, onSaveSteps, showCopyHint, play = 0 }: { play?: number; rows: RingRow[]; rings: ReactNode; closed: number; of?: number; onLogFood: () => void; onLogSleep?: () => void; onSaveSteps: (steps: number) => void; showCopyHint: boolean }) {
  const [shown, setShown] = useState<RingRow['key'] | null>(null);
  const [steps, setSteps] = useState('');
  const more = rows.find((r) => r.key === shown);
  return (
    <section className="td-rings" data-section="rings" aria-label={`Rings: ${closed} of ${of} closed`}>
      <div className="td-rings-row">
        {rings}
        <div className="td-nums">
          {rows.map((r) => (
            <button key={r.key} type="button" className={`td-num${r.done ? ' rad' : ''}`} style={{ '--c': r.ink } as React.CSSProperties} aria-expanded={shown === r.key} aria-label={`${r.name} ${r.value}${r.unit ? ` ${r.unit}` : ''}${r.done ? ', goal met' : ''}. Show target`} onClick={() => setShown(shown === r.key ? null : r.key)}>
              <span className="td-num-top">
                <span className="td-num-name">{r.name}</span>
                <CountUp text={r.value} play={play} id={`today:${r.key}`} />
                {r.unit && <span className="td-num-unit">{r.unit}</span>}
              </span>
              <span className="td-bar" aria-hidden="true" style={{ '--p': `${Math.round(Math.min(1, Math.max(0, r.progress)) * 100)}%` } as React.CSSProperties}>
                <i />
              </span>
            </button>
          ))}
        </div>
      </div>
      {more && (
        <div className="td-ringmore">
          <span>{more.target}</span>
          {more.key === 'steps' ? (
            <form
              className="td-stepin"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseSteps(steps);
                if (n !== undefined) {
                  onSaveSteps(n);
                  setShown(null);
                }
              }}
            >
              <input type="number" inputMode="numeric" min={0} aria-label="Steps today" value={steps} placeholder={more.known ? more.value.replace(/,/g, '') : ''} onChange={(e) => setSteps(e.target.value)} />
              <button type="submit" className="k-act sm quiet">
                Save
              </button>
            </form>
          ) : more.key === 'sleep' ? (
            <button type="button" className="k-act sm quiet" onClick={onLogSleep}>
              Morning log
            </button>
          ) : (
            <button type="button" className="k-act sm quiet" onClick={onLogFood}>
              Log food
            </button>
          )}
          {more.key === 'steps' && showCopyHint && <span>Copy today’s total from Samsung Health.</span>}
        </div>
      )}
    </section>
  );
}
