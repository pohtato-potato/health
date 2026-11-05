import { useMemo, type CSSProperties } from 'react';
import { momentumChange, momentumNeeds, momentumOn, momentumSeries, trendRows, type MomentumArea, type MomentumInput } from '../../domain/momentum';
import { CountUp } from '../../ui/you/CountUp';
import { DrawnLine } from '../../ui/you/DrawnLine';
import { HUE, MOMENTUM } from '../../ui/you/palette';
import { Reveal } from '../../ui/you/Reveal';

const AREA: Record<MomentumArea, { name: string; c: string }> = {
  steps: { name: 'Steps', c: HUE.steps },
  protein: { name: 'Protein', c: HUE.food },
  sleep: { name: 'Sleep', c: HUE.sleep },
  training: { name: 'Training', c: HUE.train },
};
const LAND_MS = 1100;

function headline(change: number | undefined): string {
  if (change === undefined) return 'Momentum';
  if (change === 0) return 'Momentum, level over four weeks';
  return `Momentum, ${change > 0 ? 'up' : 'down'} ${Math.abs(change)} in four weeks`;
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
  return (
    <Reveal className="yu-mom">
      <div className="yu-mom-h">
        <span className="yu-mom-n"><CountUp to={m.score} ms={LAND_MS} /></span>
        <span className="yu-col"><b>{headline(m.change)}</b><span className="yu-q">From food, steps, sleep and training. Never from your weight.</span></span>
      </div>
      {m.series.length > 1 && <DrawnLine vals={m.series} c={MOMENTUM.from} c2={MOMENTUM.to} h={84} tip ms={LAND_MS} />}
      <div className="yu-trs">
        {m.rows.map((r, i) => (
          <div key={r.area} className="yu-tr" style={{ '--c': AREA[r.area].c, '--i': i } as CSSProperties}>
            <b>{AREA[r.area].name}</b>
            <DrawnLine vals={r.series} c={AREA[r.area].c} h={26} area={false} width={2.2} />
            <em>{r.word}</em>
            <small>{r.was === undefined ? r.now : `${r.now}, was ${r.was}`}</small>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
