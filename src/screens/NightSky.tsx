import { CALENDAR } from '../domain/calendar';
import { fmtDayMonth } from '../domain/format';
import { constellationFor, skyStars } from '../domain/nightSky';
import { useAllDays, useAllEntries, useSettings, useToday } from '../db/hooks';
import { back } from '../router';
import { dayRings } from '../state/derived';
import { Icon } from '../ui/Icon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A star for every perfect day; each month's stars make a constellation with its own name. */
export function NightSkyPage() {
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const today = useToday();
  if (!settings || !days || !entries) return <div className="page bare" />;
  const byDate = new Map<string, typeof entries>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const perfect = days.filter((d) => d.date < today && byDate.has(d.date) && dayRings(settings, d.date, d, byDate.get(d.date)!).rings.perfect).map((d) => d.date);
  const stars = skyStars(perfect);
  const months = [...new Set(perfect.map((d) => d.slice(0, 7)))].sort().reverse();
  const nextSky = CALENDAR.filter((e) => e.kind === 'sky' && e.from >= today).sort((a, b) => a.from.localeCompare(b.from))[0];

  return (
    <div className="page bare sky-page">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <h1 className="h1">Night sky</h1>
      <div className="t14 q">A star for every perfect day.</div>
      <svg viewBox="0 0 390 380" className="sky" role="img" aria-label={`${stars.length} stars for ${stars.length} perfect days`}>
        {Array.from({ length: 80 }, (_, i) => (
          <circle key={`d${i}`} cx={(i * 97) % 390} cy={(i * 53) % 380} r={0.5} fill="#ede6da" opacity={0.25} />
        ))}
        {months.map((m) => {
          const pts = stars.filter((s) => s.date.startsWith(m));
          return pts.length > 1 ? <polyline key={m} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#b7a6f0" strokeOpacity="0.35" strokeWidth="0.8" /> : null;
        })}
        {stars.map((s) => (
          <circle key={s.date} cx={s.x} cy={s.y} r={s.r} fill={s.date.startsWith(today.slice(0, 7)) ? '#f2c46d' : '#f6eed9'} />
        ))}
      </svg>
      {months.length === 0 && <div className="t15 q lh">Your first perfect day puts the first star up: calories in range, protein met, steps closed.</div>}
      <div className="list">
        {months.map((m) => {
          const n = perfect.filter((d) => d.startsWith(m)).length;
          return (
            <div key={m} className="li">
              <span className="s">
                <span>{constellationFor(m).name}</span>
                <small>
                  {MONTHS[Number(m.slice(5, 7)) - 1]} · {n} perfect day{n === 1 ? '' : 's'}
                </small>
              </span>
            </div>
          );
        })}
      </div>
      {nextSky && (
        <div className="card">
          <div className="t15">
            {nextSky.name} · {fmtDayMonth(nextSky.from)}
          </div>
          <div className="t13 q lh">{nextSky.why}</div>
        </div>
      )}
    </div>
  );
}
