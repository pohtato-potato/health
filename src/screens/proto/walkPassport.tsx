import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../ui/Icon';
import stampAgra from './walk-art/stamp-agra.svg?raw';
import visaDandi from './walk-art/visa-dandi.svg?raw';
import { REGIONS } from './walkRoutes';

/**
 * Design prototype: the passport as a booklet you swipe through. A cover, then a paper page per state or union
 * territory reached (its real outline engraved faintly on the page, an oval entry stamp, its city stamps), the
 * visas for challenges and expeditions, and the places-I've-been page. Pages you haven't reached don't exist yet.
 */

/** The bounding box of a path's coordinates, padded, as a viewBox. */
function boxOf(d: string, pad = 0.08): string {
  const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const p = Math.max(x1 - x0, y1 - y0) * pad;
  return `${x0 - p} ${y0 - p} ${x1 - x0 + p * 2} ${y1 - y0 + p * 2}`;
}

const stateShape = (name: string) => REGIONS.india.states?.find(([n]) => n === name)?.[1] ?? '';

function Entry({ what, km, day, ut }: { what: string; km: number; day: number; ut?: boolean }) {
  return (
    <span className={`wp-pp-entry ${ut ? 'ut' : ''}`}>
      <small>Entered</small>
      <b>{what}</b>
      <small>
        km {km} · day {day}
      </small>
    </span>
  );
}

function Page({ title, kind, n, shape, children }: { title: string; kind: string; n: number; shape?: string; children: ReactNode }) {
  return (
    <section className={`wp-pg ${kind === 'Union territory' ? 'ut' : ''}`} aria-label={`${title}, ${kind}, page ${n}`}>
      {shape && (
        <svg className="wp-pg-shape" viewBox={boxOf(shape)} aria-hidden="true">
          <path d={shape} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <header className="wp-pg-head">
        <b>{title}</b>
        <small>
          {kind} · page {n}
        </small>
      </header>
      <div className="wp-pg-body">{children}</div>
    </section>
  );
}

export function PassportBook({ onBack, onReplay }: { onBack: () => void; onReplay: () => void }) {
  const row = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const pages = 7;
  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const on = () => setAt(Math.round(el.scrollLeft / (el.scrollWidth / pages)));
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);
  const go = (i: number) => row.current?.scrollTo({ left: (row.current.scrollWidth / pages) * i, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return (
    <main className="wp-page">
      <div className="wp-col">
        <button type="button" className="wp-back" onClick={onBack}>
          <Icon name="left" size={20} stroke={1.8} />
          Walk
        </button>
        <div className="rise">
          <h1 className="wp-title big">Passport</h1>
          <p className="wp-sub">3 of 28 states · 1 of 8 union territories · 2 of 46 cities</p>
        </div>
      </div>

      <div className="wp-book" ref={row} role="region" aria-label="Passport pages, swipe sideways">
        <section className="wp-pg cover" aria-label="Passport cover">
          <svg className="wp-cover-india" viewBox={REGIONS.india.box.join(' ')} aria-hidden="true">
            <path d={REGIONS.india.outline} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="wp-cover-text">
            <small>Passport</small>
            <b>The walk across India</b>
            <small>Set off from Delhi · day 1</small>
          </span>
        </section>

        <Page title="Delhi" kind="Union territory" n={2} shape={stateShape('Delhi')}>
          <Entry what="Delhi" km={0} day={1} ut />
          <p className="wp-pg-note">Where the walk began. Kept: a twist of jalebi from Chandni Chowk.</p>
        </Page>

        <Page title="Haryana" kind="State" n={3} shape={stateShape('Haryana')}>
          <Entry what="Haryana" km={25} day={3} />
          <p className="wp-pg-note">A short crossing: no city on this road, just the state line.</p>
        </Page>

        <Page title="Uttar Pradesh" kind="State" n={4} shape={stateShape('Uttar Pradesh')}>
          <Entry what="Uttar Pradesh" km={85} day={9} />
          <span className="wp-pg-stamp" dangerouslySetInnerHTML={{ __html: stampAgra }} />
          <p className="wp-pg-note">Kept: a box of petha from Agra.</p>
          <button type="button" className="wp-pg-replay" onClick={onReplay}>
            Replay Agra
          </button>
        </Page>

        <section className="wp-pg visas" aria-label="Visas, page 5">
          <header className="wp-pg-head">
            <b>Visas</b>
            <small>Challenges and expeditions · page 5</small>
          </header>
          <span className="wp-pg-visa" dangerouslySetInnerHTML={{ __html: visaDandi }} />
          <span className="wp-visa-slip">
            <b>Harold Fry's walk</b>
            <small>Joined day 3 · bookmarked at day 18</small>
          </span>
          <span className="wp-visa-slip exp">
            <b>Xuanzang's road</b>
            <small>Expedition · 1 of 24 seals</small>
          </span>
        </section>

        <section className="wp-pg been" aria-label="Places I've been, page 6">
          <header className="wp-pg-head">
            <b>Places I've been</b>
            <small>page 6</small>
          </header>
          <svg className="wp-been-map" viewBox={REGIONS.india.box.join(' ')} aria-hidden="true">
            <path d={REGIONS.india.outline} className="land" vectorEffect="non-scaling-stroke" />
            {REGIONS.india.states?.map(([name, d]) => (
              <path key={name} d={d} className={['Delhi', 'Haryana', 'Uttar Pradesh'].includes(name) ? 'on' : ''} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <span className="wp-been-num">
            <b>9%</b>
            <small>of India's land is in the states you've walked into</small>
          </span>
        </section>

        <section className="wp-pg next" aria-label="The next page, page 7">
          <span className="wp-next-q" aria-hidden="true">
            ?
          </span>
          <b>The next page</b>
          <small>appears when you cross into a new state. Rajasthan's border is 17 km ahead.</small>
        </section>
      </div>

      <div className="wp-col">
        <div className="wp-book-nav">
          <button type="button" className="wp-ghost" onClick={() => go(Math.max(0, at - 1))} aria-label="Previous page" disabled={at === 0}>
            <Icon name="left" size={18} stroke={1.8} />
          </button>
          <span className="wp-book-dots" aria-label={`Page ${at + 1} of ${pages}`}>
            {Array.from({ length: pages }, (_, i) => (
              <i key={i} className={i === at ? 'on' : ''} />
            ))}
          </span>
          <button type="button" className="wp-ghost" onClick={() => go(Math.min(pages - 1, at + 1))} aria-label="Next page" disabled={at === pages - 1}>
            <Icon name="right" size={18} stroke={1.8} />
          </button>
        </div>
      </div>
    </main>
  );
}
