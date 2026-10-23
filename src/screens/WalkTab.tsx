import { addDays } from '../domain/dates';
import { fmtDayMonth, fmtInt } from '../domain/format';
import { chapterAt, kmFromSteps, positionAt } from '../domain/walk';
import { changePlace } from '../db/actions';
import { useAllDays, useDay, useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { Icon } from '../ui/Icon';
import { WalkScene } from '../walk/WalkScene';
import { PlaceStatusRow } from './walk/PlaceStatusRow';
import { reachedCards } from '../walk/cards';
import { passAhead } from '../walk/passes';
import { peopleMet } from '../walk/people';

/** The Walk tab: where you are, lit for the hour, what's next, and the road so far. */
export function WalkTab() {
  const today = useToday();
  const days = useAllDays();
  const settings = useSettings();
  const day = useDay(today);
  if (!days || !settings) return <div className="page" />;
  const km = kmFromSteps(days.reduce((n, d) => n + (d.steps ?? 0), 0));
  const pos = positionAt(km);
  const chapter = chapterAt(km);
  const pass = passAhead(km, pos.to?.km);
  const next = pass ? `${fmtInt(Math.ceil(pass.km - km))} km to ${pass.name}, ${fmtInt(pass.heightM)} m` : pos.to ? `${fmtInt(Math.ceil(pos.to.km - km))} km to ${pos.to.name}` : undefined;
  // Someone met on the road shows for the day they were met and the day after, as steps are often logged late.
  const met = peopleMet(days.filter((d) => d.date <= today)).filter((m) => m.date >= addDays(today, -1)).at(-1);
  const cards = reachedCards(km);

  return (
    <div className="page walk">
      <div className="walk-top">
        <WalkScene km={km} caption={false} hero />
        <div className="walk-title">
          <h1 className="h1">{pos.done ? 'Leh, the end of the road' : `Near ${pos.from.name}`}</h1>
          <span className="t14 tn">
            {fmtInt(Math.round(km))} km · Chapter {chapter.n}
          </span>
        </div>
      </div>
      <PlaceStatusRow settings={settings} today={today} day={day} onPlace={(id) => void changePlace(today, id)} />
      {next && <div className="t15">{next}</div>}
      {!days.some((d) => d.steps !== undefined) && <div className="t14 q lh">Log today's steps and you'll set off from Delhi.</div>}
      {met && (
        <div className="card">
          <div className="lbl">Met on the road · {met.date === today ? 'today' : fmtDayMonth(met.date)}</div>
          <div className="t15 lh">
            {met.who.name}, {met.who.who}. {met.who.line}
          </div>
        </div>
      )}

      <div className="list">
        {[
          { label: 'Route', sub: 'The whole walk on one map', path: '/map' },
          { label: 'Departures', sub: 'Every milestone ahead', path: '/departures' },
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

      {cards.length > 0 && (
        <div className="col gap8">
          <div className="lbl">Cities reached</div>
          <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
            {cards.map((c) => (
              <button key={c.city} type="button" className="chip" onClick={() => go('/postcard', { c: c.city })}>
                {c.city}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
