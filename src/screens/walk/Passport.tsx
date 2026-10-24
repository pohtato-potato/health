import { daysBetween } from '../../domain/dates';
import { fmtDayMonth } from '../../domain/format';
import { ALL_STATES } from '../../domain/walk';
import { CITY_COUNT, areaShare, passportCounts, type PassportPage } from '../../walk/arrivals';
import { REGIONS } from '../../walk/geo';
import { SOUVENIRS } from '../../walk/souvenirs';
import { StampTemplate, StateShape } from './Arrival';

const PLACES = new Set(ALL_STATES.map((s) => s.name)).size;

/**
 * The passport as a booklet you swipe through: a cover with the counts, a paper page per state or union territory
 * reached (its outline engraved faintly, the day you entered, its city stamps, the souvenir kept), and the places
 * you've been. Pages you haven't reached don't exist yet; the cover says how many are left to find.
 */
export function PassportView({ pages, startDay, onReplay }: { pages: PassportPage[]; startDay: string; onReplay: (city: string) => void }) {
  const counts = passportCounts(pages);
  const cities = pages.reduce((n, p) => n + p.cities.length, 0);
  const share = Math.round(areaShare(pages) * 100);
  return (
    <div className="walk-pp">
      <header className="walk-head">
        <h1 className="walk-title big">Passport</h1>
        <p className="walk-sub">
          {counts.states} of 28 states · {counts.uts} of 8 union territories · {cities} of {CITY_COUNT} cities
        </p>
      </header>
      <div className="walk-book" role="region" aria-label="Passport pages, swipe sideways">
        <section className="walk-pg cover" aria-label="Passport cover">
          <svg className="walk-cover-india" viewBox={REGIONS.india.box.join(' ')} aria-hidden="true">
            <path d={REGIONS.india.outline} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="walk-cover-text">
            <small>Passport</small>
            <b>The walk across India</b>
            <small>
              {pages.length} pages filled · {PLACES - pages.length} still to find
            </small>
          </span>
        </section>
        {pages.map((p, i) => {
          const km = ALL_STATES.find((s) => s.name === p.state)?.km ?? 0;
          const kind = p.ut ? 'Union territory' : 'State';
          const kept = SOUVENIRS[p.state];
          return (
            <section key={p.state} className={`walk-pg ${p.ut ? 'ut' : ''}`} aria-label={`${p.state}, ${kind}, page ${i + 2}`}>
              <StateShape state={p.state} className="walk-pg-shape" />
              <header className="walk-pg-head">
                <b>{p.state}</b>
                <small>
                  {kind} · page {i + 2}
                </small>
              </header>
              <span className="walk-pg-entry">
                Entered {fmtDayMonth(p.date)} · km {Math.round(km).toLocaleString('en-IN')} · day {daysBetween(startDay, p.date) + 1}
              </span>
              <div className="walk-pg-stamps">
                {p.cities.map((c) => (
                  <div key={c.name} className="walk-pg-city">
                    <StampTemplate name={c.name} state={p.state} n={c.n} ut={p.ut} date={fmtDayMonth(c.date)} />
                    <span className="walk-pg-date">{fmtDayMonth(c.date)}</span>
                    {c.n === 1 ? (
                      <span className="walk-pg-note">Where the walk began</span>
                    ) : (
                      <button type="button" className="walk-pg-replay" onClick={() => onReplay(c.name)}>
                        Replay {c.name}
                      </button>
                    )}
                  </div>
                ))}
                {!p.cities.length && <p className="walk-pg-note">No city on this road here, just the line on the map.</p>}
              </div>
              {kept && (
                <p className="walk-pg-note">
                  Kept: {kept.name}, {kept.note}
                </p>
              )}
            </section>
          );
        })}
        <section className="walk-pg been" aria-label="Places I’ve been">
          <header className="walk-pg-head">
            <b>Places I’ve been</b>
            <small>The whole walk so far</small>
          </header>
          <ul className="walk-been">
            <li>
              <b>{counts.states}</b> of 28 states
            </li>
            <li>
              <b>{counts.uts}</b> of 8 union territories
            </li>
            <li>
              <b>{cities}</b> of {CITY_COUNT} cities
            </li>
            <li>
              <b>{share}%</b> of India’s area walked into
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
