import type { DayKey } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import { LiveFrame, Primary } from './Frame';

interface Props {
  name: string;
  kg: number | null;
  /** The load as words, for gym kit. */
  kgText?: string;
  /** The count, as shown: "19", "1:05". */
  value: string;
  /** The best it beat, and when; none at a first load. */
  was?: { value: string; date: DayKey };
  song?: string;
  onGo: () => void;
}

/** Gold dust rising, slowly. */
function Dust({ n }: { n: number }) {
  return (
    <div className="lv-dust" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ left: `${(i * 53) % 100}%`, animationDuration: `${6 + (i % 5)}s`, animationDelay: `${(i * 0.7) % 5}s` }} />
      ))}
    </div>
  );
}

/** Rays turning slowly behind the number. */
function Rays() {
  return (
    <svg className="lv-rays" viewBox="-100 -100 200 200" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {Array.from({ length: 16 }, (_, i) => (
        <path key={i} d="M0 0 L-7 -140 L7 -140 Z" transform={`rotate(${i * 22.5})`} />
      ))}
    </svg>
  );
}

/** A new record (board five, "A record, brighter"): the whole screen gold, rays and sparks, the count huge, the old best beside it. */
export function RecordScreen(p: Props) {
  return (
    <LiveFrame state="record" className="lv-record lv-record2">
      <Rays />
      <Dust n={22} />
      <div className="lv-record-in">
        <h1 className="lv-name lv-rec-title">A new best</h1>
        <span className="lv-rec-sub">{p.name}</span>
        <div className="lv-rec-num">
          <span className="lv-bloom num tn">{p.value}</span>
          {p.kg !== null && <b>at {p.kgText ?? `${p.kg} kg`}</b>}
        </div>
        <div className="lv-rec-pair">
          <div className="lv-mini gold">
            <span>Old best</span>
            <b className="num tn">{p.was ? p.was.value : '–'}</b>
          </div>
          <div className="lv-mini gold">
            <span>{p.was ? 'Set on' : 'First time'}</span>
            <b>{p.was ? fmtDayMonth(p.was.date) : 'at this load'}</b>
          </div>
        </div>
        {p.song && (
          <p className="lv-rec-song">
            Set to <b>{p.song}</b>.
          </p>
        )}
      </div>
      <Primary tone="gold" onClick={p.onGo}>
        Keep going
      </Primary>
    </LiveFrame>
  );
}
