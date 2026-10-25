import { useState, type ReactNode } from 'react';
import { LiveFrame, Primary, timeOfDay } from './Frame';

const KIT = ['Chair and mat in place', 'Collars on both handles', 'Headphones in', 'Phone above 30%'];
const fmt = (kg: number | null) => (kg === null ? 'body' : `${kg} kg`);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];

interface Props {
  name: string;
  usual: { min: number; fromHistory: boolean };
  startedAt: number;
  blocks: { kg: number | null; items: { name: string; light: boolean }[] }[];
  changes: number;
  /** Tonight has leg work: ask how the legs are. */
  legs: boolean;
  soreness?: number;
  onSoreness: (n: 1 | 2 | 3 | 4 | 5) => void;
  warmup?: string;
  onStart: () => void;
  top?: ReactNode;
}

/** Before the first set: how long, the legs, the kit, the warm-up, and tonight in load blocks. */
export function BeforeScreen(p: Props) {
  const [kit, setKit] = useState<string[]>([]);
  const light = p.soreness !== undefined && p.soreness >= 4;
  return (
    <LiveFrame state="calm" top={p.top} scroll>
      <h1 className="lv-h1">{p.name}</h1>
      <p className="lv-sub">
        {p.usual.fromHistory ? 'usually' : 'about'} <b>{p.usual.min} min</b> · finish about <b>{timeOfDay(p.startedAt + p.usual.min * 60_000)}</b>
        {p.changes > 0 ? ` · ${WORDS[p.changes] ?? p.changes} plate change${p.changes === 1 ? '' : 's'}` : ''}
      </p>

      {p.legs && (
        <div className="lv-card">
          <div className="lv-card-h">Legs sore, 1–5?</div>
          <div className="lv-scale" role="radiogroup" aria-label="Leg soreness, 1 to 5">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={p.soreness === n} className={p.soreness === n ? 'on' : ''} onClick={() => p.onSoreness(n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="lv-small">{p.soreness === undefined ? '1 fresh · 5 very sore' : light ? 'Sore: leg work drops to 1 set each tonight. Never skipped, just the minimum.' : 'Full leg work tonight.'}</div>
        </div>
      )}

      <div className="lv-card">
        <div className="lv-card-h">Kit check</div>
        {KIT.map((k) => {
          const on = kit.includes(k);
          return (
            <button key={k} type="button" className={`lv-tick${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setKit(on ? kit.filter((x) => x !== k) : [...kit, k])}>
              <span className="box" aria-hidden="true">
                {on ? '✓' : ''}
              </span>
              {k}
            </button>
          );
        })}
      </div>

      {p.warmup && (
        <div className="lv-card">
          <div className="lv-card-h">Warm-up</div>
          <div className="lv-small">{p.warmup}</div>
        </div>
      )}

      <div className="lv-card">
        <div className="lv-card-h">Tonight, in load blocks</div>
        <BlockList blocks={p.blocks} />
      </div>
      <div style={{ flex: 'none', paddingBottom: 8 }}>
        <Primary onClick={p.onStart}>Start</Primary>
      </div>
    </LiveFrame>
  );
}

export type Blocks = Props['blocks'];

/** Tonight's exercises in load blocks, with a line where the plates change. */
export function BlockList({ blocks }: { blocks: Blocks }) {
  return (
    <>
      {blocks.map((b, i) => (
        <div key={i}>
          {i > 0 && b.kg !== null && blocks[i - 1].kg !== null && (
            <div className="lv-plates-line">
              Plates change · {blocks[i - 1].kg} → {b.kg} kg
            </div>
          )}
          {b.items.map((it) => (
            <div key={it.name} className="lv-row">
              <span className="grow">
                {it.name}
                {it.light && <span className="lv-tag burn">1 set</span>}
              </span>
              <span className="q">{fmt(b.kg)}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
