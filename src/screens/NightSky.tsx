import { CALENDAR } from '../domain/calendar';
import { daysBetween } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { dosesAllowPerfect } from '../domain/medicines';
import { constellationFor, skyStars } from '../domain/nightSky';
import { useAllDays, useAllEntries, useSettings, useToday } from '../db/hooks';
import { back } from '../router';
import { dayRings } from '../state/derived';
import { Icon } from '../ui/Icon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Night sky (s18): a deep sky with a faint Milky Way; a glowing star for every perfect day, each
 * month joined into its named constellation; this month's stars in gold with the next one waiting;
 * meteors on shower nights; the fort on the horizon.
 */
export function NightSkyPage() {
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const today = useToday();
  if (!settings || !days || !entries) return <div className="page bare" />;
  const byDate = new Map<string, typeof entries>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const perfect = days.filter((d) => d.date < today && byDate.has(d.date) && dayRings(settings, d.date, d, byDate.get(d.date)!).rings.perfect && dosesAllowPerfect(settings, d)).map((d) => d.date);
  const thisMonth = today.slice(0, 7);
  // Each month shown gets a large cell of its own; a star keeps its place within its month.
  const shownMonths = [...new Set([...perfect.map((d) => d.slice(0, 7)), thisMonth])].sort().slice(-6);
  const cell = (m: string) => {
    const i = shownMonths.indexOf(m);
    return { x: 100 + (i % 2) * 190, y: 80 + Math.floor(i / 2) * 120 };
  };
  const place = (date: string, x: number, y: number) => {
    const month = Number(date.slice(5, 7)) - 1;
    const c = cell(date.slice(0, 7));
    return { x: c.x + (x - (40 + (month % 4) * 90)) * 1.7, y: c.y + (y - (50 + Math.floor(month / 4) * 110)) * 1.1 };
  };
  const stars = skyStars(perfect.filter((d) => shownMonths.includes(d.slice(0, 7)))).map((st) => ({ ...st, ...place(st.date, st.x, st.y) }));
  const lit = (m: string) => stars.filter((s) => s.date.startsWith(m));
  const months = shownMonths.filter((m) => perfect.some((d) => d.startsWith(m)));
  const shower = CALENDAR.find((e) => e.kind === 'sky' && Math.abs(daysBetween(today, e.from)) <= 2);
  const nextSky = CALENDAR.filter((e) => e.kind === 'sky' && e.from >= today).sort((a, b) => a.from.localeCompare(b.from))[0];
  // Where tonight's star would go if today ends perfect: drawn as a waiting ring.
  const waiting = skyStars([today]).map((st) => ({ ...st, ...place(st.date, st.x, st.y) }))[0];
  const nowCount = lit(thisMonth).length;

  return (
    <div className="page bare sky-page">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <h1 className="h1">Night sky</h1>
      <div className="t14 q">A star for every perfect day.</div>
      <svg viewBox="0 0 390 460" className="sky" role="img" aria-label={`${stars.length} stars for ${stars.length} perfect days`}>
        <defs>
          <radialGradient id="glow">
            <stop offset="0" stopColor="#fff8e6" stopOpacity="0.9" />
            <stop offset="0.4" stopColor="#f6eed9" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f6eed9" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="glowGold">
            <stop offset="0" stopColor="#ffe4a3" stopOpacity="0.95" />
            <stop offset="0.4" stopColor="#f2c46d" stopOpacity="0.4" />
            <stop offset="1" stopColor="#f2c46d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="milky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b93d6" stopOpacity="0" />
            <stop offset="0.5" stopColor="#8b93d6" stopOpacity="0.13" />
            <stop offset="1" stopColor="#8b93d6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-20 120 C 120 60, 260 260, 420 180 L 420 260 C 260 340, 120 140, -20 210 Z" fill="url(#milky)" />
        {Array.from({ length: 110 }, (_, i) => (
          <circle key={`d${i}`} cx={(i * 97) % 390} cy={(i * 53) % 390} r={i % 7 === 0 ? 0.9 : 0.5} fill="#ede6da" opacity={i % 5 === 0 ? 0.45 : 0.2} />
        ))}
        {months.map((m) => {
          const pts = lit(m);
          const gold = m === thisMonth;
          return pts.length > 1 ? <polyline key={m} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={gold ? '#f2c46d' : '#c9d1ff'} strokeOpacity={gold ? 0.55 : 0.45} strokeWidth="0.9" /> : null;
        })}
        {stars.map((s) => {
          const gold = s.date.startsWith(thisMonth);
          return (
            <g key={s.date}>
              <circle cx={s.x} cy={s.y} r={s.r * 4.5} fill={`url(#${gold ? 'glowGold' : 'glow'})`} />
              <circle cx={s.x} cy={s.y} r={s.r + 0.4} fill={gold ? '#ffe4a3' : '#fff8e6'} />
            </g>
          );
        })}
        {waiting && <circle cx={waiting.x} cy={waiting.y} r="4" fill="none" stroke="#f2c46d" strokeOpacity="0.7" strokeDasharray="2 2" />}
        {months.map((m) => {
          const pts = lit(m);
          const x = cell(m).x;
          const y = Math.max(...pts.map((p) => p.y)) + 22;
          return (
            <g key={`l${m}`} textAnchor="middle">
              <text x={x} y={y} fontSize="12" fontStyle="italic" fontFamily="var(--serif)" fill={m === thisMonth ? '#f2c46d' : '#ede6da'}>
                {constellationFor(m).name}
              </text>
              <text x={x} y={y + 13} fontSize="9" fontFamily="var(--sans)" fill="#aeabbd">
                {MONTHS[Number(m.slice(5, 7)) - 1]} · {pts.length} perfect day{pts.length === 1 ? '' : 's'}
              </text>
            </g>
          );
        })}
        {shower && (
          <g stroke="#fff8e6" strokeLinecap="round">
            <line x1="300" y1="40" x2="250" y2="70" strokeOpacity="0.7" strokeWidth="1.2" />
            <line x1="200" y1="20" x2="170" y2="38" strokeOpacity="0.45" strokeWidth="0.9" />
            <line x1="350" y1="110" x2="320" y2="128" strokeOpacity="0.4" strokeWidth="0.8" />
          </g>
        )}
        {/* The fort on the horizon ties the sky to the walk. */}
        <path d="M0 430 C 60 418, 120 424, 160 420 L160 404 L170 404 L170 398 L178 398 L178 404 L196 404 L196 392 L204 386 L212 392 L212 404 L232 404 L232 396 L240 396 L240 404 L250 404 L250 420 C 300 416, 350 424, 390 418 L390 460 L0 460 Z" fill="#090b1a" />
        <g fill="#f2c46d" opacity="0.7">
          <rect x="200" y="396" width="2" height="3" />
          <rect x="182" y="408" width="2" height="3" />
          <rect x="236" y="408" width="2" height="3" />
        </g>
      </svg>
      {perfect.length === 0 && <div className="t15 q lh">Your first perfect day puts the first star up: calories in range, protein met, steps closed.</div>}
      <div className="t14 lh">
        <span className="gold">{MONTHS[Number(thisMonth.slice(5, 7)) - 1]} so far</span> · {nowCount} star{nowCount === 1 ? '' : 's'}, the next one waiting
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
