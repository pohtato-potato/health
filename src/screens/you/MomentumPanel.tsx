import { useMemo, type CSSProperties } from 'react';
import { momentumChange, momentumNeeds, momentumOn, momentumSeries, trendRows, type MomentumArea, type MomentumInput } from '../../domain/momentum';
import { CountUp } from '../../ui/you/CountUp';
import { HelpButton, Panel, type HowThisWorks } from '../../ui/kit/Kit';
import { MomentumChart, Spark } from './MomentumChart';

/** Metric inks keep one meaning across the app (look pass): steps green, protein lavender, sleep blue, training coral. */
export const AREA: Record<MomentumArea, { name: string; ink: string }> = {
  steps: { name: 'Steps', ink: '#8fdcb6' },
  protein: { name: 'Protein', ink: '#c2b2ff' },
  sleep: { name: 'Sleep', ink: '#93c3dc' },
  training: { name: 'Training', ink: '#ff9a76' },
};
/** Board one's momentum: a peach number over an apricot hill. */
export const MOM_INK = '#ffb48a';
const MOM_FILL = '#e98a5b';
const LAND_MS = 1100;

export const MOMENTUM_HOW: HowThisWorks = {
  title: 'Momentum',
  steps: [
    { icon: 'steps', ink: '#8fdcb6', head: 'Four things feed it', line: 'Steps, protein, sleep and training, over the two weeks before each day.' },
    { icon: 'weight', ink: '#ede6da', head: 'Never your weight', line: 'Weight and calories never enter it, up or down.' },
    { icon: 'trend', ink: MOM_INK, head: 'The line is each day', line: 'Each point is the score on one of the last 28 days.' },
    { icon: 'calendar', ink: '#93c3dc', head: 'It needs a few days', line: 'An area counts after 4 logged days in the fortnight; two areas start it.' },
  ],
  chips: [{ ink: MOM_INK, text: '0 to 100' }, { ink: '#93c3dc', text: '14-day window' }, { ink: '#8fdcb6', text: '28 days drawn' }],
};

/** "13,600 a day" as the number and its words, so the number reads large and the words small. */
const split = (now: string): [string, string] => {
  const m = /^([\d,.]+(?: h \d+| g)?)\s*(.*)$/.exec(now);
  // The tile's name says what it is: "13,600" and "7 h 19" need no "a day"; training keeps "in two weeks".
  return m ? [m[1], m[2].replace(/^sessions /, '').replace(/^a (day|night)$/, '')] : [now, ''];
};

function changeLine(change: number | undefined): string {
  if (change === undefined) return 'from food, steps, sleep and training';
  if (change === 0) return 'level over four weeks';
  return `${change > 0 ? 'up' : 'down'} ${Math.abs(change)} in four weeks`;
}

export function MomentumPanel({ today, input }: { today: string; input: MomentumInput }) {
  const m = useMemo(() => ({
    score: momentumOn(today, input),
    series: momentumSeries(today, input),
    change: momentumChange(today, input),
    needs: momentumNeeds(today, input),
    rows: trendRows(today, input),
  }), [today, input]);

  if (m.score === undefined) {
    return (
      <Panel ink={MOM_INK}>
        <span className="k-row"><span className="k-lb">Momentum</span><HelpButton how={MOMENTUM_HOW} /></span>
        <span><b className="k-num ink">{m.needs}</b> more logged day{m.needs === 1 ? '' : 's'}</span>
        <span className="k-q">and it starts, from food, steps, sleep and training.</span>
      </Panel>
    );
  }
  // Look pass (board one, "You: proposed"): momentum is the page. The number leads over its own chart, edge to edge,
  // then the four trends as tiles read at a glance.
  return (
    <section className="k-mom" aria-label="Momentum">
      <div className="k-hero-row">
        <span className="k-hero" style={{ color: MOM_INK }}><CountUp to={m.score} ms={LAND_MS} /></span>
        <span className="k-col" style={{ paddingBottom: 6, flex: 1 }}><b>Momentum</b><span className="k-q">{changeLine(m.change)}</span></span>
        <HelpButton how={MOMENTUM_HOW} />
      </div>
      <MomentumChart vals={m.series} line={MOM_INK} fill={MOM_FILL} label={`Momentum over the last four weeks, now ${m.score}`} />
      {m.rows.length > 0 && (
        <div className="k-doors two">
          {m.rows.map((r, i) => {
            const [num, words] = split(r.now);
            const ink = AREA[r.area].ink;
            return (
              <div key={r.area} className="k-panel k-trend" style={{ '--ink': ink, '--i': i } as CSSProperties}>
                <span className="k-lb">{AREA[r.area].name}</span>
                <span><b className="k-num ink">{num}</b>{words && <span className="k-q"> {words}</span>}</span>
                <Spark vals={r.series} ink={ink} />
                <span className="k-q">{r.was === undefined ? 'new' : `was ${r.was}`} · <b style={{ color: ink }}>{r.word}</b></span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
