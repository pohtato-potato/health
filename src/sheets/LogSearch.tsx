import { useState } from 'react';
import { fmtInt } from '../domain/format';
import type { Food } from '../domain/types';
import { Icon, type IconName } from '../ui/Icon';

/** Words that open a log directly from the search box: a sheet to open, or a page to go to. */
export const LOG_ACTIONS: { words: string[]; label: string; icon: IconName; color: string; sheet?: string; route?: string }[] = [
  { words: ['weight', 'kg', 'weigh', 'sleep', 'morning'], label: 'Morning log', icon: 'sun', color: 'var(--apricot)', sheet: 'morning' },
  { words: ['step', 'walk'], label: 'Steps', icon: 'steps', color: 'var(--steps)', sheet: 'steps' },
  { words: ['waist', 'tape', 'inch'], label: 'Waist', icon: 'tape', color: 'var(--pearl)', sheet: 'waist' },
  { words: ['drink', 'beer', 'wine', 'whisky', 'alcohol'], label: 'Drinks', icon: 'drink', color: 'var(--apricot)', sheet: 'drink' },
  { words: ['night out', 'party', 'friends'], label: 'Night out', icon: 'night', color: 'var(--apricot)', sheet: 'nightout' },
  { words: ['free', 'cheat', 'treat'], label: 'Free meal', icon: 'free', color: 'var(--kcal)', sheet: 'free' },
  { words: ['pill', 'medicine', 'creatine', 'drops', 'tablet', 'checklist'], label: 'Checklist', icon: 'pill', color: 'var(--pearl)', sheet: 'checklist' },
  { words: ['photo', 'check-in', 'checkin'], label: 'Check-in', icon: 'camera', color: 'var(--pearl)', route: '/checkin' },
  { words: ['sick', 'ill', 'injured', 'travel', 'status', 'break'], label: 'Status', icon: 'calendar', color: 'var(--apricot)', sheet: 'more' },
  { words: ['close', 'done', 'day'], label: 'Close the day', icon: 'check', color: 'var(--apricot)', route: '/close' },
];

/** What a query matches: actions by their words, and up to five foods by name (never archived ones). */
export function logMatches(q: string, foods: Food[]): { actions: typeof LOG_ACTIONS; foods: Food[] } {
  const query = q.trim().toLowerCase();
  if (!query) return { actions: [], foods: [] };
  return {
    actions: LOG_ACTIONS.filter((a) => a.words.some((w) => w.startsWith(query) || query.includes(w)) || a.label.toLowerCase().includes(query)),
    foods: foods.filter((f) => !f.archived && f.name.toLowerCase().includes(query)).slice(0, 5),
  };
}

/** "Log anything": one search box for foods and logs, used by the + sheet and by Today. The host decides how to open things. */
export function LogSearch({ foods, onAction, onFood, onQuick }: { foods: Food[]; onAction: (a: (typeof LOG_ACTIONS)[number]) => void; onFood: (f: Food) => void; onQuick: () => void }) {
  const [q, setQ] = useState('');
  const hits = logMatches(q, foods);
  return (
    <>
      <label className="log-search">
        <Icon name="search" size={18} color="var(--quiet)" />
        <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Log anything: “chai”, “waist”…" aria-label="Log anything" />
      </label>
      {(hits.actions.length > 0 || hits.foods.length > 0) && (
        <div className="list">
          {hits.actions.map((a) => (
            <button key={a.label} type="button" className="li" onClick={() => onAction(a)}>
              <span className="row" style={{ gap: 10 }}>
                <Icon name={a.icon} size={18} color={a.color} />
                <span>{a.label}</span>
              </span>
              <Icon name="right" size={16} color="var(--dim)" />
            </button>
          ))}
          {hits.foods.map((f) => (
            <button key={f.id} type="button" className="li" onClick={() => onFood(f)}>
              <span className="row" style={{ gap: 10 }}>
                <Icon name="food" size={18} color="var(--kcal)" />
                <span>{f.name}</span>
              </span>
              <span className="t14 q tn">{fmtInt(f.kcal)} kcal</span>
            </button>
          ))}
        </div>
      )}
      {q.trim() && hits.actions.length === 0 && hits.foods.length === 0 && (
        <button type="button" className="link t14" onClick={onQuick}>
          Nothing called “{q.trim()}” yet. Quick-add its calories instead
        </button>
      )}
    </>
  );
}
