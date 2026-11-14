import { useMemo, type CSSProperties } from 'react';
import { momentumChange, momentumNeeds, momentumOn, momentumSeries, trendRows, type MomentumArea, type MomentumInput } from '../../domain/momentum';
import { CountUp } from '../../ui/you/CountUp';
import { DrawnLine } from '../../ui/you/DrawnLine';
import { MOMENTUM } from '../../ui/you/palette';
import { Reveal } from '../../ui/you/Reveal';

/** Metric inks keep one meaning across the app (look pass): steps green, protein lavender, sleep blue. */
const AREA: Record<MomentumArea, { name: string; c: string }> = {
  steps: { name: 'Steps', c: 'var(--steps)' },
  protein: { name: 'Protein', c: 'var(--protein)' },
  sleep: { name: 'Sleep', c: 'var(--sleep)' },
  training: { name: 'Training', c: '#ff9a76' },
};
const INK_HEX: Record<MomentumArea, string> = { steps: '#8fdcb6', protein: '#c2b2ff', sleep: '#93c3dc', training: '#ff9a76' };
const LAND_MS = 1100;

/** "13,600 a day" as the number and its words, so the number reads large and the words small. */
const split = (now: string): [string, string] => {
  const m = /^([\d,.]+(?: h \d+| g)?)\s*(.*)$/.exec(now);
  // The tile's name says what it is: "13,600" and "7 h 19" need no "a day"; training keeps "in two weeks".
  return m ? [m[1], m[2].replace(/^sessions /, '').replace(/^a (day|night)$/, '')] : [now, ''];
};

function changeLine(change: number | undefined): string {
  if (change === undefined) return 'From food, steps, sleep and training';
  if (change === 0) return 'level over four weeks';
  return `${change > 0 ? 'up' : 'down'} ${Math.abs(change)} in four weeks`;
}

export function MomentumPanel({ today, input }: { today: string; input: MomentumInput }) {
  const m = useMemo(() => ({
    score: momentumOn(today, input),
    series: momentumSeries(today, input).filter((v): v is number => v !== null),
    change: momentumChange(today, input),
    needs: momentumNeeds(today, input),
    rows: trendRows(today, input),
  }), [today, input]);

  if (m.score === undefined) {
    return (
      <div className="yu-mom">
        <b>Momentum</b>
        <span className="yu-q">{m.needs} more logged day{m.needs === 1 ? '' : 's'} and this starts. It comes from food, steps, sleep and training. Never from your weight.</span>
      </div>
    );
  }
  // Look pass (board one, "You: proposed"): momentum is the page. The number leads over its own chart, edge to edge,
  // then the four trends as tiles read at a glance.
  return (
    <Reveal className="yu-mom k-mom">
      <div className="k-hero-row">
        <span className="k-hero" style={{ color: MOMENTUM.number }}><CountUp to={m.score} ms={LAND_MS} /></span>
        <span className="k-col" style={{ paddingBottom: 6 }}><b>Momentum</b><span className="k-q">{changeLine(m.change)}</span></span>
      </div>
      {m.series.length > 1 && <div className="k-mom-chart"><DrawnLine vals={m.series} c={MOMENTUM.from} c2={MOMENTUM.to} h={110} tip ms={LAND_MS} /></div>}
      <p className="k-q k-mom-note">From food, steps, sleep and training. Never from your weight.</p>
      <div className="k-doors two">
        {m.rows.map((r, i) => (
          <div key={r.area} className="k-panel k-trend" style={{ '--ink': INK_HEX[r.area], '--i': i } as CSSProperties}>
            <span className="k-lb">{AREA[r.area].name}</span>
            <span><b className="k-num">{split(r.now)[0]}</b> <span className="k-q">{split(r.now)[1]}</span></span>
            <DrawnLine vals={r.series} c={INK_HEX[r.area]} h={28} area={false} width={2.6} />
            <span className="k-q">{r.was === undefined ? 'new' : `was ${r.was}`} · <b style={{ color: INK_HEX[r.area] }}>{r.word}</b></span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
