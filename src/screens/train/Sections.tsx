import { useState } from 'react';
import type { DayKey } from '../../domain/dates';
import { fmtDayMonth, lowerFirst } from '../../domain/format';
import { GROUPS } from '../../domain/muscles';
import type { VolumeRow } from '../../domain/trainView';
import type { MuscleId } from '../../domain/types';
import { BodyHeat } from '../../ui/BodyMap';

/** The same session about four weeks ago against the latest. */
export function FourWeeksCard({ name, then, rows }: { name: string; then: DayKey; rows: { name: string; then: string; now: string; up: boolean }[] }) {
  return (
    <div className="lv-card">
      <div className="lv-tr-cardhead">
        <span className="lv-card-h">You, four weeks ago</span>
        <span className="lv-small">
          {name} · {fmtDayMonth(then)} → last time
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="lv-row">
          <span className="grow">{r.name}</span>
          <span className="q num tn">{r.then}</span>
          <span className="lv-tr-arrow" aria-label="to">
            →
          </span>
          <span className={`num tn${r.up ? ' lv-tr-up' : ''}`}>
            {r.now}
            {r.up ? ' ↑' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

const TINT = { ok: '#6fe0b0', low: '#f5ea6a', high: '#7fc4f0' } as const;
const LABEL: Record<string, string> = { Shoulders: 'Delts' };

/** This week on the body: front and back, coloured by hard sets against the plan, with each count in words. */
export function BodyCard({ rows, line, onOpen }: { rows: VolumeRow[]; line?: string; onOpen: () => void }) {
  // Nothing to colour before the week's first hard set.
  if (!rows.some((r) => r.sets > 0)) return null;
  const heat: Partial<Record<MuscleId, number>> = {};
  const tint: Partial<Record<MuscleId, string>> = {};
  for (const r of rows)
    for (const m of GROUPS.find((g) => g.name === (LABEL[r.name] ?? r.name))?.muscles ?? []) {
      heat[m] = 0.9;
      tint[m] = TINT[r.state];
    }
  return (
    <div className="lv-card">
      <div className="lv-tr-cardhead">
        <span className="lv-card-h">This week on your body</span>
        <button type="button" className="lv-link" onClick={onOpen}>
          Muscle map ›
        </button>
      </div>
      <span className="lv-small">Hard sets against the plan's target for each group.</span>
      <div className="lv-tr-body">
        <span className="lv-tr-body-fig">
          <BodyHeat heat={heat} tint={tint} label="Hard sets this week, front and back: green on target, yellow low, blue high" />
        </span>
        <span className="lv-tr-legend">
          <span className="ok">on target</span>
          <span className="low">low</span>
          <span className="high">high</span>
        </span>
        <span className="lv-tr-body-list">
          {rows.map((r) => (
            <span key={r.name} className={`lv-tr-body-row ${r.state}`}>
              <span className="grow">{r.name}</span>
              <b className="num tn">{r.sets}</b>
              <span className="lv-small">
                /{r.lo}–{r.hi}
              </span>
              <span className="lv-tr-mark">{r.state === 'ok' ? '✓' : r.state}</span>
            </span>
          ))}
        </span>
      </div>
      {line && <p className="lv-small">{line}</p>}
    </div>
  );
}

/** The latest records, in gold. */
export function RecordsCard({ total, rows, onAll }: { total: number; rows: { what: string; name: string; when: string }[]; onAll: () => void }) {
  if (!rows.length) return null;
  return (
    <div className="lv-card">
      <div className="lv-tr-cardhead">
        <span className="lv-card-h">Records</span>
        <button type="button" className="lv-link" onClick={onAll}>
          All {total} ›
        </button>
      </div>
      {rows.map((r) => (
        <div key={`${r.name}${r.what}`} className="lv-tr-rec">
          <span className="grow">
            <span className="lv-tr-rec-what goldtxt num tn">{r.what}</span>
            <span className="lv-small">{r.name}</span>
          </span>
          <span className="lv-tag gold">{r.when}</span>
        </div>
      ))}
    </div>
  );
}

/** This month so far; early in a month, last month's film. */
export function MonthCard({ month, next, m, film, onFilm }: { month: string; next: string; m: { sessions: number; records: number; usualMin?: number; improved?: { name: string; pct: number } }; film: boolean; onFilm: () => void }) {
  if (!m.sessions && !film) return null;
  return (
    <div className="lv-card">
      <div className="lv-tr-cardhead">
        <span className="lv-card-h">{month} so far</span>
        <span className="lv-small">full report on {next}</span>
      </div>
      <div className="lv-tr-stats">
        <span>
          <b className="num tn">{m.sessions}</b>
          <small>session{m.sessions === 1 ? '' : 's'}</small>
        </span>
        <span>
          <b className="num tn">{m.records}</b>
          <small>record{m.records === 1 ? '' : 's'}</small>
        </span>
        {m.usualMin !== undefined && (
          <span>
            <b className="num tn">{m.usualMin}</b>
            <small>min, usual session</small>
          </span>
        )}
      </div>
      {m.improved && (
        <p className="lv-small">
          Most improved: {lowerFirst(m.improved.name)}, up {m.improved.pct}%.
        </p>
      )}
      {film && (
        <button type="button" className="lv-link" onClick={onFilm}>
          Last month’s film ›
        </button>
      )}
    </div>
  );
}

/** The last few sessions, records in gold. */
export function RecentCard({ rows, onOpen }: { rows: { id: string; title: string; sub: string; records: number }[]; onOpen: (id: string) => void }) {
  if (!rows.length) return null;
  return (
    <div className="lv-card">
      <div className="lv-card-h">Recent sessions</div>
      {rows.map((r) => (
        <button key={r.id} type="button" className="lv-row lv-tr-recent" onClick={() => onOpen(r.id)}>
          <span className="grow">
            <span>{r.title}</span>
            <span className="lv-small">{r.sub}</span>
          </span>
          {r.records > 0 && (
            <span className="lv-tag gold">
              {r.records} record{r.records === 1 ? '' : 's'}
            </span>
          )}
          <span className="q">›</span>
        </button>
      ))}
    </div>
  );
}

/** The plan: name, sessions and since when; warm-up and rules folded below. */
export function PlanCard({ name, sessions, since, warmup, rules, onOpen }: { name: string; sessions: string[]; since: DayKey; warmup?: string; rules: { title: string; text: string }[]; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lv-card">
      <button type="button" className="lv-tr-plan" onClick={onOpen}>
        <span className="lv-card-h">The plan</span>
        <span className="lv-tr-plan-name">{name}</span>
        <span className="lv-small">
          {sessions.join(' · ')} · since {fmtDayMonth(since)} ›
        </span>
      </button>
      {(warmup || rules.length > 0) && (
        <>
          <button type="button" className="lv-link" aria-expanded={open} onClick={() => setOpen(!open)}>
            Warm-up and rules {open ? '▴' : '▾'}
          </button>
          {open && (
            <div className="lv-small">
              {warmup && (
                <p>
                  <b>Warm-up.</b> {warmup}
                </p>
              )}
              {rules.map((r) => (
                <p key={r.title}>
                  <b>{r.title}.</b> {r.text}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
