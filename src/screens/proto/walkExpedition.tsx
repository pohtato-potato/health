import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import { along, byId, fmt, inkOf } from './walkArt';
import { HeroLook, type Look } from './walkLooks';
import { REGIONS, ROUTE_ART } from './walkRoutes';
import { EXPEDITIONS, KM_A_DAY, RECORD_NAMES, XUANZANG } from './walkSample';

/**
 * Design prototype: an expedition, grand and long. The whole round trip on its map, the odometer, his sixteen
 * years against yours, the 24 letters of introduction the king of Turfan sent ahead (one seal per kingdom),
 * and a chronicle of what has happened on the road.
 */

/** The labelled stops on the map: index into the route line, and the name. */
const PLACES: [number, string][] = [
  [0, "Chang'an"],
  [2, 'Dunhuang'],
  [4, 'Turfan'],
  [8, 'Samarkand'],
  [9, 'Bamiyan'],
  [14, 'Nalanda'],
  [18, 'Khotan'],
];

/** The outward road ends at Nalanda (the 15th point); the rest is the road home. */
const TURN = 14;

const CHRONICLE = [
  { day: 'Day 261', place: 'Turfan', text: "The king of Turfan hears a scholar is crossing his desert and sends for him." },
  { day: 'Day 238', place: 'The desert road', text: 'Five beacon towers, then sand. The water bag spills, and for days there is nothing to drink.' },
  { day: 'Day 196', place: 'The Jade Gate', text: 'The frontier is closed to travellers. He slips past the last watchtowers at night.' },
];

function useCount(to: number, ms = 1600) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

/** How far along the drawn line a given point is, as a fraction of the whole line. */
function fracAt(line: [number, number][], index: number) {
  const seg = line.slice(1).map((p, i) => Math.hypot(p[0] - line[i][0], p[1] - line[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  return seg.slice(0, index).reduce((a, b) => a + b, 0) / total;
}

/** The map shows you at a named place (the drawing's distances are not the road's), here Turfan. */
function ExpeditionMap({ at }: { at: number }) {
  const region = REGIONS.asia;
  const line = ROUTE_ART.xuanzang.line;
  const frac = fracAt(line, at);
  const out = 'M' + line.slice(0, TURN + 1).map((p) => p.join(' ')).join(' L');
  const home = 'M' + line.slice(TURN).map((p) => p.join(' ')).join(' L');
  const all = 'M' + line.map((p) => p.join(' ')).join(' L');
  const [ux, uy] = along(line, frac);
  const [, , w, h] = region.box;
  return (
    <svg className="wp-xm" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Xuanzang's round trip: west from Chang'an across the deserts and mountains of Central Asia, south to Nalanda, and home by the southern road">
      <path className="wp-ra-land" d={region.outline} vectorEffect="non-scaling-stroke" />
      <path className="wp-xm-out" d={out} vectorEffect="non-scaling-stroke" />
      <path className="wp-xm-home" d={home} vectorEffect="non-scaling-stroke" />
      <path className="wp-ra-walked" d={all} pathLength={1} style={{ strokeDasharray: `${frac} 1`, ['--f' as string]: frac }} vectorEffect="non-scaling-stroke" />
      {PLACES.map(([i, name]) => {
        const [x, y] = line[i];
        const right = x < w * 0.72;
        return (
          <g key={name}>
            <circle className="wp-xm-place" cx={x} cy={y} r="2.2" />
            <text className="wp-xm-name" x={right ? x + 4 : x - 4} y={y - 3.5} textAnchor={right ? 'start' : 'end'}>
              {name}
            </text>
          </g>
        );
      })}
      <circle className="wp-ra-halo" cx={ux} cy={uy} r="6" />
      <circle className="wp-ra-you" cx={ux} cy={uy} r="3.4" />
    </svg>
  );
}

export function ExpeditionPage({ look, onBack }: { look: Look; onBack: () => void }) {
  const e = EXPEDITIONS[0];
  const r = byId('xuanzang');
  const frac = e.km / r.km;
  const km = useCount(e.km);
  const yearsLeft = (r.km - e.km) / KM_A_DAY / 365;
  const sealed = 1;
  const [open, setOpen] = useState<number | null>(null);
  return (
    <main className="wp-page wp-exp-page" style={inkOf('xuanzang')}>
      <div className="wp-col">
        <button type="button" className="wp-back" onClick={onBack}>
          <Icon name="left" size={20} stroke={1.8} />
          Walk
        </button>
      </div>
      <HeroLook look={look} c={{ id: 'xuanzang', km: e.km, day: 261, stretch: XUANZANG.stretch, line: XUANZANG.line }} title={r.name} sub={`Chang'an to Nalanda and home · 629–645 · ${RECORD_NAMES[r.record]}`} />

      <section className="wp-xm-wrap rise" aria-label="The whole road">
        <ExpeditionMap at={4} />
        <div className="wp-xm-key wp-col">
          <span>
            <i className="out" /> The road out
          </span>
          <span>
            <i className="home" /> The road home
          </span>
        </div>
      </section>

      <div className="wp-col">
        <p className="wp-odo rise" aria-label={`${fmt(e.km)} of about ${fmt(r.km)} km`}>
          {fmt(km)
            .split('')
            .map((c, i) => (
              <span key={i} className={c === ',' ? 'sep' : 'digit'}>
                {c}
              </span>
            ))}
          <small>of about {fmt(r.km)} km · {Math.round(frac * 100)}% of the way</small>
        </p>

        <Years left={yearsLeft} />

        <section className="wp-dispatch rise">
          <span className="wp-label">On the road · {XUANZANG.stretch}</span>
          <p className="wp-voice">{XUANZANG.line}</p>
          {XUANZANG.page.map((p) => (
            <p key={p} className="wp-para">
              {p}
            </p>
          ))}
          <div className="wp-actions">
            <button type="button" className="wp-ghost">Go deeper</button>
          </div>
        </section>

        <section className="wp-seals rise" aria-label={`Letters of introduction: ${sealed} of 24 sealed`}>
          <div>
            <h2 className="wp-h2">Letters of introduction</h2>
            <p className="wp-quiet">The king of Turfan sent letters ahead to 24 kingdoms. Each one you reach seals its letter.</p>
          </div>
          <div className="wp-seal-grid">
            {Array.from({ length: 24 }, (_, i) => (
              <button key={i} type="button" className={`wp-seal ${i < sealed ? 'on' : ''}`} aria-label={i < sealed ? 'Turfan: sealed' : `Kingdom ${i + 1}: not reached yet`} onClick={() => setOpen(i)}>
                {i < sealed ? <SealMark /> : <span aria-hidden="true">{i + 1}</span>}
              </button>
            ))}
          </div>
          {open !== null && <p className="wp-para">{open < sealed ? 'Turfan · sealed on day 261 · its king held the scholar for a month.' : 'Not reached yet. The kingdoms are revealed as you arrive.'}</p>}
        </section>

        <section className="wp-chron rise">
          <h2 className="wp-h2">The chronicle</h2>
          <ol>
            {CHRONICLE.map((c) => (
              <li key={c.day}>
                <span className="when">
                  {c.day} · {c.place}
                </span>
                <span className="what">{c.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="wp-dispatch quiet rise">
          <span className="wp-label">Story layer</span>
          <p className="wp-para">Journey to the West, the novel that turned this road into legend, can run beside the history. It's off.</p>
          <button type="button" className="wp-ghost">Turn it on</button>
        </section>
        <div className="wp-actions">
          <button type="button" className="wp-ghost">Put it down</button>
        </div>
      </div>
    </main>
  );
}

function Years({ left }: { left: number }) {
  // Two bars on one scale: his sixteen years away, and your whole walk at the sample pace.
  const yours = left + 0.75;
  const max = Math.max(16, yours);
  const Row = ({ who, years, note, cls }: { who: string; years: number; note: ReactNode; cls: string }) => (
    <div className={`wp-yr ${cls}`}>
      <span className="who">{who}</span>
      <i style={{ ['--f' as string]: years / max }} />
      <span className="note">{note}</span>
    </div>
  );
  return (
    <section className="wp-years rise" aria-label="His sixteen years against your years">
      <span className="wp-label">Then and you · the whole journey</span>
      <Row who="Xuanzang" years={16} note="629 to 645: 16 years, with years of study at Nalanda" cls="them" />
      <Row who="You" years={yours} note={`about ${yours.toFixed(1)} years at your pace, no study breaks`} cls="you" />
    </section>
  );
}

function SealMark() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="17" />
      <path d="M12 14 h16 M14 20 h12 M12 26 h16 M20 10 v20" />
    </svg>
  );
}
