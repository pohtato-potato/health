import type { DayKey } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import { LiveFrame, Primary } from './Frame';

interface Props {
  name: string;
  kg: number | null;
  /** The count, as shown: "19", "1:05". */
  value: string;
  /** The best it beat, and when; none at a first load. */
  was?: { value: number; date: DayKey };
  song?: string;
  onGo: () => void;
  saver: boolean;
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

/** A new record: the count in gold with a bloom, the old best, and the song that was playing. */
export function RecordScreen(p: Props) {
  return (
    <LiveFrame state="record" saver={p.saver} className="lv-record">
      {!p.saver && <Dust n={18} />}
      <div className="lv-record-in">
        <div className="lv-kicker gold">New record</div>
        <div className="lv-bloom num tn">{p.value}</div>
        <div className="lv-bloom-sub">
          {p.name}
          {p.kg !== null ? ` · ${p.kg} kg` : ''}
        </div>
        <div className="lv-small" style={{ textAlign: 'center' }}>
          {p.was ? `Your best was ${p.was.value}, on ${fmtDayMonth(p.was.date)}.` : 'Your first time at this load.'}
          {p.song && (
            <>
              <br />
              Set to <b>{p.song}</b>.
            </>
          )}
        </div>
      </div>
      <Primary tone="gold" onClick={p.onGo}>
        Keep going
      </Primary>
    </LiveFrame>
  );
}
