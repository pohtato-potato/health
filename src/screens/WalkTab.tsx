import { useState, type ReactNode } from 'react';
import { addDays } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { chapterAt, kmFromSteps, positionAt, STRIDE_M } from '../domain/walk';
import { useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { Seg } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { distanceInTerms, ghostLastMonth, journal, loadedSteps } from '../walk/journal';
import { WalkScene } from '../walk/WalkScene';

type Tab = 'journal' | 'route';

/** The Walk tab: where you are, lit for the hour, and the road behind and ahead. */
export function WalkTab({ extraTabs }: { extraTabs?: { id: string; label: string; body: ReactNode }[] } = {}) {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const [tab, setTab] = useState<string>('journal');
  if (!settings || !days || !sessions || !sets) return <div className="page" />;
  const steps = days.reduce((n, d) => n + (d.steps ?? 0), 0);
  const km = kmFromSteps(steps);
  const pos = positionAt(km);
  const chapter = chapterAt(km);
  const loaded = loadedSteps(sets);
  const lines = journal(days, sessions, today, loaded);
  const ghost = ghostLastMonth(days, today);
  const recent = days.filter((d) => d.date >= addDays(today, -14) && d.date < today && d.steps !== undefined);
  const perDay = recent.length ? recent.reduce((n, d) => n + d.steps!, 0) / recent.length : undefined;
  const toEnd = Math.max(0, chapter.end - km);
  const eta = perDay ? addDays(today, Math.ceil(toEnd / ((perDay * STRIDE_M) / 1000))) : undefined;
  const endName = positionAt(chapter.end).from.name;
  const terms = distanceInTerms(km);

  const tabs: { id: string; label: string }[] = [{ id: 'journal', label: 'Journal' }, { id: 'route', label: 'Route' }, ...(extraTabs ?? []).map(({ id, label }) => ({ id, label }))];

  return (
    <div className="page walk">
      <WalkScene km={km} ghostKm={ghost} caption={false} />
      <div className="col gap4">
        <div className="row base">
          <h1 className="h1">{pos.done ? 'Leh, the end of the road' : `Near ${pos.from.name}`}</h1>
          <span className="t13 q">Chapter {chapter.n}</span>
        </div>
        <div className="t14 q">
          {fmtInt(Math.round(km))} km walked
          {pos.to ? ` · ${fmtInt(Math.max(0, Math.round(pos.to.km - km)))} km to ${pos.to.name}` : ''}
        </div>
        {terms && <div className="t14">{terms}</div>}
        {ghost !== undefined && <div className="t13 q">A month ago you were {fmtInt(Math.round(km - ghost))} km back, near {positionAt(ghost).from.name}.</div>}
      </div>

      <Seg options={tabs} value={tab as Tab} onChange={setTab} />

      {tab === 'journal' && (
        <div className="card" style={{ gap: 0 }}>
          {lines.length === 0 && <div className="t14 q lh">Log today's steps and the road starts writing itself.</div>}
          {lines.slice(0, 30).map((l) => (
            <div key={l.date} className="col gap2" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
              <span className="t14">{l.head}</span>
              <span className="t13 q lh">{l.body}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'route' && (
        <div className="col gap8">
          {eta && (
            <div className="card">
              <div className="t16">
                {endName} around {fmtDayMonth(eta)}
              </div>
              <div className="t13 q">At your two-week average of {fmtInt(Math.round(perDay!))} steps a day.</div>
            </div>
          )}
          <div className="list">
            {[
              { label: 'The map', sub: 'Your trail across India', path: '/map' },
              { label: 'Departures', sub: 'Every milestone ahead', path: '/departures' },
              { label: 'Passport', sub: 'States and territories stamped', path: '/passport' },
              { label: 'Overview', sub: 'The walk in numbers', path: '/journey' },
            ].map((x) => (
              <button key={x.path} type="button" className="li" onClick={() => go(x.path)}>
                <span className="s">
                  <span>{x.label}</span>
                  <small>{x.sub}</small>
                </span>
                <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
              </button>
            ))}
          </div>
        </div>
      )}

      {extraTabs?.find((t) => t.id === tab)?.body}
    </div>
  );
}
