import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The steps box: a whole number of 0 or more; empty or anything else saves nothing. */
export function parseSteps(input: string): number | undefined {
  const t = input.trim();
  if (!/^\d+$/.test(t)) return undefined;
  return Number(t);
}

/** A number that counts up from zero when the page opens and each time the rings are tapped. The width stays put: the digits are tabular. */
export function CountUp({ text, play }: { text: string; play: number }) {
  const ref = useRef<HTMLElement>(null);
  const latest = useRef(text);
  latest.current = text;
  useLayoutEffect(() => {
    const el = ref.current;
    const target = Number(latest.current.replace(/,/g, ''));
    if (!el || !Number.isFinite(target) || target <= 0) return;
    const fmt = new Intl.NumberFormat('en-IN');
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 1100);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = t >= 1 ? latest.current : fmt.format(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    el.textContent = '0';
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = latest.current;
    };
  }, [play]);
  return (
    <b ref={ref} className="tn">
      {text}
    </b>
  );
}

export type RingRow = { key: 'kcal' | 'protein' | 'steps'; name: string; value: string; unit: string; target: string; ink: string; known: boolean };

/**
 * The rings with only their numbers beside them, each in its ring's ink with a tiny unit. Tapping a number shows
 * its target and its action in place: Log food, or a number pad for steps. The ring drawing is passed in.
 */
export function RingsNumbers({ rows, rings, closed, onLogFood, onSaveSteps, showCopyHint, play = 0 }: { play?: number; rows: RingRow[]; rings: ReactNode; closed: number; onLogFood: () => void; onSaveSteps: (steps: number) => void; showCopyHint: boolean }) {
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
              <CountUp text={r.value} play={play} />
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
