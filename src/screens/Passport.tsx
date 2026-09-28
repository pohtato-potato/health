import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { ACHIEVEMENTS } from '../domain/achievements';
import { dayKey, type DayKey } from '../domain/dates';
import { FESTIVALS } from '../domain/festivals';
import { fmtDayMonth } from '../domain/format';
import { OCCASION_KINDS } from '../domain/occasions';
import { arrivals, stateEntries } from '../domain/walk';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useSettings, useToday } from '../db/hooks';
import { back } from '../router';
import { Icon } from '../ui/Icon';
import { TIER_COLOR, TIER_NAME } from '../ui/Moments';
import { flightNo } from '../domain/milestones';

interface Stamp {
  key: string;
  top: string;
  main: string;
  date: DayKey;
  ink: string;
  shape: 'round' | 'rect' | 'oval';
}

const INKS = ['#b4533c', '#2f5d8a', '#3f7a52', '#6b4a8a', '#8a6a2f'];

/** Stamps for everywhere the year has taken you: cities, states, festivals, occasions. */
export function PassportPage() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const entries = useAllEntries();
  const unlocked = useLiveQuery(() => db.achievements.toArray(), []);
  useEffect(() => {
    void bump('passport', { day: today });
  }, [today]);
  if (!settings || !days || !entries || !unlocked) return <div className="page bare" />;

  const steps = new Map(days.filter((d) => d.steps !== undefined).map((d) => [d.date, d.steps!]));
  const logged = new Set([...entries.map((e) => e.date), ...days.filter((d) => d.steps !== undefined || d.morning).map((d) => d.date)]);
  const stamps: Stamp[] = [
    ...arrivals(steps).map((a, i) => ({ key: `c:${a.name}`, top: a.km === 0 ? 'Departed' : 'Arrived', main: a.name, date: a.date, ink: INKS[i % INKS.length], shape: 'round' as const })),
    ...stateEntries(steps).map((s, i) => ({ key: `s:${s.name}`, top: 'Entered', main: s.name, date: s.date, ink: INKS[(i + 2) % INKS.length], shape: 'rect' as const })),
    ...FESTIVALS.filter((f) => logged.has(f.day)).map((f) => ({ key: `f:${f.day}`, top: 'Celebrated', main: `${f.name} ${f.day.slice(0, 4)}`, date: f.day, ink: '#c2410c', shape: 'oval' as const })),
    ...(settings.occasions ?? [])
      .filter((o) => o.to < today)
      .map((o) => ({ key: `o:${o.id}`, top: OCCASION_KINDS.find((k) => k.id === o.kind)?.name ?? 'Occasion', main: o.name, date: o.from, ink: '#6b4a8a', shape: 'oval' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const visas = unlocked
    .map((u) => ({ u, a: ACHIEVEMENTS.find((a) => a.id === u.id) }))
    .filter((x) => x.a && (x.a.tier === 'g' || x.a.tier === 'p'))
    .sort((a, b) => a.u.at - b.u.at);
  const issued = dayKey(new Date(settings.createdAt));

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/journey')}>
        <Icon name="left" size={20} stroke={1.8} />
        Journey
      </button>

      <div className="passport-cover">
        <span className="pp-k">Health</span>
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r="30" fill="none" stroke="#d9b45f" strokeWidth="1.5" />
          <circle cx="36" cy="36" r="22" fill="none" stroke="#d9b45f" strokeWidth="1" />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <line key={i} x1={36 + 23 * Math.cos(a)} y1={36 + 23 * Math.sin(a)} x2={36 + 29 * Math.cos(a)} y2={36 + 29 * Math.sin(a)} stroke="#d9b45f" strokeWidth="1" />;
          })}
          <circle cx="36" cy="36" r="6" fill="#d9b45f" />
        </svg>
        <span className="pp-title">Passport</span>
      </div>

      <div className="passport-page">
        <div className="pp-row">
          <span>
            <i>Holder</i>
            {settings.name || 'You'}
          </span>
          <span>
            <i>No.</i>
            {flightNo(issued).replace('HL ', 'HP')}
            {issued.slice(2, 4)}
          </span>
        </div>
        <div className="pp-row">
          <span>
            <i>Issued</i>
            {fmtDayMonth(issued)} {issued.slice(0, 4)}
          </span>
          <span>
            <i>Valid until</i>
            {settings.goalDate ? `${fmtDayMonth(settings.goalDate)} ${settings.goalDate.slice(0, 4)}` : 'Open-ended'}
          </span>
        </div>
        <div className="pp-row">
          <span>
            <i>Stamps</i>
            {stamps.length}
          </span>
          <span>
            <i>Visas</i>
            {visas.length}
          </span>
        </div>
      </div>

      <div className="passport-page">
        <div className="pp-head">Stamps</div>
        {stamps.length ? (
          <div className="stamps">
            {stamps.map((s, i) => (
              <div key={s.key} className={`stamp ${s.shape}`} style={{ color: s.ink, transform: `rotate(${((i * 37) % 17) - 8}deg)` }}>
                <span className="st-top">{s.top}</span>
                <span className="st-main">{s.main}</span>
                <span className="st-date">{fmtDayMonth(s.date).toUpperCase()}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="t14 lh" style={{ color: '#7d7466' }}>
            Log your steps and the first stamp arrives: Delhi, where the walk begins.
          </div>
        )}
      </div>

      {visas.length > 0 && (
        <div className="passport-page">
          <div className="pp-head">Visas</div>
          {visas.map(({ u, a }) => (
            <div key={u.id} className="visa" style={{ borderColor: TIER_COLOR[a!.tier] }}>
              <span className="st-top" style={{ color: '#7d7466' }}>
                {TIER_NAME[a!.tier]} visa · {fmtDayMonth(u.date)}
              </span>
              <span className="st-main" style={{ color: 'var(--paper-ink)' }}>
                {a!.name}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="t12 d center">Gold and platinum achievements are stamped in as visas.</div>
    </div>
  );
}
