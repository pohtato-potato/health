import { useState, type ReactNode } from 'react';

/** The steps box: a whole number of 0 or more; empty or anything else saves nothing. */
export function parseSteps(input: string): number | undefined {
  const t = input.trim();
  if (!/^\d+$/.test(t)) return undefined;
  return Number(t);
}

export type RingRow = { key: 'kcal' | 'protein' | 'steps'; name: string; value: string; unit: string; target: string; ink: string; known: boolean };

/**
 * The rings with only their numbers beside them, each in its ring's ink with a tiny unit. Tapping a number shows
 * its target and its action in place: Log food, or a number pad for steps. The ring drawing is passed in.
 */
export function RingsNumbers({ rows, rings, closed, onLogFood, onSaveSteps, showCopyHint }: { rows: RingRow[]; rings: ReactNode; closed: number; onLogFood: () => void; onSaveSteps: (steps: number) => void; showCopyHint: boolean }) {
  const [shown, setShown] = useState<RingRow['key'] | null>(null);
  const [steps, setSteps] = useState('');
  const more = rows.find((r) => r.key === shown);
  return (
    <section className="td-rings" data-section="rings" aria-label={`Rings: ${closed} of 3 closed`}>
      <div className="td-rings-row">
        {rings}
        <div className="td-nums">
          {rows.map((r) => (
            <button key={r.key} type="button" className="td-num" style={{ color: r.ink }} aria-expanded={shown === r.key} aria-label={`${r.name} ${r.value} ${r.unit}. Show target`} onClick={() => setShown(shown === r.key ? null : r.key)}>
              <b className="tn">{r.value}</b>
              <span>{r.unit}</span>
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
              <button type="submit" className="btn sm">
                Save
              </button>
            </form>
          ) : (
            <button type="button" className="btn sm" onClick={onLogFood}>
              Log food
            </button>
          )}
          {more.key === 'steps' && showCopyHint && <span>Copy today’s total from Samsung Health.</span>}
        </div>
      )}
    </section>
  );
}
