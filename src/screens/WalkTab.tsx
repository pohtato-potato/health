import { useState, type ReactNode } from 'react';
import { addDays } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { chapterAt, kmFromSteps, positionAt } from '../domain/walk';
import { useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { Seg } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { distanceInTerms, ghostLastMonth, journal, loadedSteps } from '../walk/journal';
import { WalkScene } from '../walk/WalkScene';
import { reachedCards, walkForecast } from '../walk/cards';
import { recordLine, trackRecord } from '../domain/forecastStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useEffect } from 'react';
import { saveForecast } from '../db/forecasts';
import { dayNumber } from '../domain/forecastStore';
import { meetBuilt, structuresFrom } from '../walk/camps';
import { effectiveKm, PASSES, strengthIndex } from '../walk/passes';
import { detourKm, QuestPanel, SouvenirShelf, useQuestState } from '../walk/WalkExtras';

type Tab = 'journal' | 'route';

/** The Walk tab: where you are, lit for the hour, and the road behind and ahead. */
export function WalkTab({ extraTabs }: { extraTabs?: { id: string; label: string; body: ReactNode }[] } = {}) {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const sets = useAllSets();
  const [tab, setTab] = useState<string>('journal');
  const quests = useQuestState();
  const forecasts = useLiveQuery(() => db.forecasts.toArray(), []);
  // Keep today's walk forecast so its track record can be checked when the day comes.
  const keep = (() => {
    if (!days) return undefined;
    const recentDays = days.filter((d) => d.date >= addDays(today, -14) && d.date < today && d.steps !== undefined);
    const pace = recentDays.length ? recentDays.reduce((n, d) => n + d.steps!, 0) / recentDays.length : undefined;
    return walkForecast(kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0)), pace, today);
  })();
  useEffect(() => {
    if (keep) void saveForecast({ kind: `walk:${keep.name}`, targetDate: keep.range[1], low: dayNumber(keep.range[0]), high: dayNumber(keep.range[1]) }, today);
  }, [keep?.name, keep?.range[0], keep?.range[1], today]);
  if (!settings || !days || !sessions || !sets) return <div className="page" />;
  const steps = days.reduce((n, d) => n + (d.steps ?? 0), 0);
  const strength = strengthIndex(sets, today);
  const raw = Math.max(0, kmFromSteps(steps) - detourKm(quests ?? []));
  const km = effectiveKm(raw, strength);
  const waiting = PASSES.find((p) => p.km === km && raw > km);
  const records = new Set(sets.filter((x) => x.mark === '!!').map((x) => x.sessionId));
  const built = structuresFrom(days, sessions, records);
  const met = meetBuilt(km, built);
  const pos = positionAt(km);
  const chapter = chapterAt(km);
  const loaded = loadedSteps(sets);
  const lines = journal(days, sessions, today, loaded).map((l) => {
    const b = built.find((x) => x.date === l.date);
    return b ? { ...l, body: `${l.body} Built a ${b.kind} by the road.` } : l;
  });
  const ghost = ghostLastMonth(days, today);
  const recent = days.filter((d) => d.date >= addDays(today, -14) && d.date < today && d.steps !== undefined);
  const perDay = recent.length ? recent.reduce((n, d) => n + d.steps!, 0) / recent.length : undefined;
  const forecast = walkForecast(km, perDay, today);
  const record = forecasts ? recordLine(trackRecord(forecasts.filter((f) => f.kind.startsWith('walk:')).map((f) => ({ ...f, kind: 'walk' })), 'walk')) : undefined;
  const cards = reachedCards(km);
  const terms = distanceInTerms(km);

  const tabs: { id: string; label: string }[] = [
    { id: 'journal', label: 'Journal' },
    { id: 'route', label: 'Route' },
    { id: 'souvenirs', label: 'Souvenirs' },
    { id: 'quests', label: 'Quests' },
    ...(extraTabs ?? []).map(({ id, label }) => ({ id, label })),
  ];

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
        {waiting && (
          <div className="t14 gold lh">
            Waiting at the foot of {waiting.name}, {fmtInt(waiting.heightM)} m. It opens at strength +{waiting.need}%; you're at +{strength}%. Training gets you over.
          </div>
        )}
        {met.map((b) => (
          <div key={b.name} className="t14 gold">
            You passed something you built: {b.name}.
          </div>
        ))}
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
          {forecast && (
            <div className="card">
              <div className="t16">
                {forecast.name} around {fmtDayMonth(forecast.date)}
              </div>
              <div className="t13 q">
                Between {fmtDayMonth(forecast.range[0])} and {fmtDayMonth(forecast.range[1])}, at your two-week average of {fmtInt(Math.round(perDay!))} steps a day.
              </div>
              {record && <div className="t12 q">{record}.</div>}
            </div>
          )}
          <div className="lbl" style={{ paddingTop: 4 }}>
            Cards from the road
          </div>
          <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
            {cards.map((c) => (
              <button key={c.city} type="button" className="chip sm" onClick={() => go('/arrival', { city: c.city })}>
                {c.city}
              </button>
            ))}
          </div>
          <div className="list">
            {[
              { label: 'The map', sub: 'Your trail across India', path: '/map' },
              { label: 'Departures', sub: 'Every milestone ahead', path: '/departures' },
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

      {tab === 'souvenirs' && <SouvenirShelf km={km} />}
      {tab === 'quests' && <QuestPanel days={days} km={km} />}

      {extraTabs?.find((t) => t.id === tab)?.body}
    </div>
  );
}
