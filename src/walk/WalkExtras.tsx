import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addDays, dayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { ALL_STATES, ALL_STOPS, statesReached } from '../domain/walk';
import type { Day } from '../domain/types';
import { questOffer, QUESTS, type Quest } from './quests';
export { detourKm } from './quests';
import { souvenirFor, souvenirShape } from './souvenirs';
import { SouvenirArt } from './SouvenirArt';

/** The souvenir shelf: one per state reached, dashed spaces for the rest. */
export function SouvenirShelf({ km }: { km: number }) {
  const reached = new Set(statesReached(km).map((s) => s.name));
  const states = [...new Set(ALL_STATES.map((s) => s.name))];
  return (
    <div className="shelf">
      {states.map((name) => {
        const got = reached.has(name);
        const s = souvenirFor(name);
        return (
          <div key={name} className={`niche${got ? '' : ' waiting'}`}>
            <span className="niche-art">{got && <SouvenirArt shape={souvenirShape(name)} size={36} />}</span>
            <span className="t14">{got ? s?.name : 'Waiting'}</span>
            <span className="t12 q">{got ? s?.note : name}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Quests taken or declined, from the walk records. */
export function useQuestState() {
  return useLiveQuery(async () => (await db.walk.where('kind').equals('quest').toArray()) ?? [], []);
}

/** The side quest on offer after an above-average week, and the ones taken. */
export function QuestPanel({ days, km }: { days: Day[]; km: number }) {
  const records = useQuestState();
  if (!records) return null;
  const today = dayKey();
  const week = days.filter((d) => d.date > addDays(today, -7) && d.date <= today && d.steps !== undefined);
  const all = days.filter((d) => d.steps !== undefined);
  const avg = (xs: Day[]) => (xs.length ? xs.reduce((n, d) => n + d.steps!, 0) / xs.length : 0);
  const seen = new Set(records.map((r) => r.id.replace(/^quest:/, '')));
  const offer = questOffer(avg(week), avg(all), km, seen);
  const taken = records.filter((r) => r.data?.taken).map((r) => QUESTS.find((q) => `quest:${q.id}` === r.id)).filter((q): q is Quest => !!q);
  const answer = (q: Quest, take: boolean) => db.walk.put({ id: `quest:${q.id}`, kind: 'quest', date: today, km, data: { taken: take } });
  return (
    <div className="col gap8">
      {offer ? (
        <div className="card gold">
          <div className="lbl gold">Side quest: {offer.name}</div>
          <QuestSketch quest={offer} />
          <div className="t15 lh">
            You beat your step average this week. A {fmtInt(offer.detourKm)} km detour each way to {offer.name}, for {offer.reward}. The detour doesn’t move you along the route.
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn ghost grow" onClick={() => answer(offer, false)}>
              Stay on route
            </button>
            <button type="button" className="btn grow" onClick={() => answer(offer, true)}>
              Take the detour
            </button>
          </div>
        </div>
      ) : (
        <div className="t14 q lh">Beat your step average for a week and a detour opens up: a hill station, a beach, a desert fort.</div>
      )}
      {taken.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          {taken.map((q) => (
            <div key={q.id} className="col gap2" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
              <span className="t15">{q.name}</span>
              <span className="t13 q lh">{q.postcard}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** The detour drawn off the route: the road, the stop it leaves from, and the spur out to the quest. */
export function QuestSketch({ quest }: { quest: Quest }) {
  const stop = ALL_STOPS.reduce((a, b) => (Math.abs(b.km - quest.nearKm) < Math.abs(a.km - quest.nearKm) ? b : a));
  return (
    <svg viewBox="0 0 300 92" width="100%" height="92" role="img" aria-label={`${fmtInt(quest.detourKm)} km detour from ${stop.name} to ${quest.name}`}>
      <path d="M8 70 C 70 64, 110 74, 150 66 S 240 58, 292 62" fill="none" stroke="var(--sage)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M150 66 C 168 48, 196 30, 232 22" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeDasharray="4 4" strokeLinecap="round" />
      <circle cx="150" cy="66" r="4" fill="var(--text)" />
      <circle cx="232" cy="22" r="5" fill="none" stroke="var(--gold)" strokeWidth="1.8" />
      <text x="150" y="86" textAnchor="middle" fontSize="11" fill="var(--dim)" fontFamily="var(--sans)">{stop.name}</text>
      <text x="226" y="14" textAnchor="end" fontSize="11" fontWeight="600" fill="var(--gold)" fontFamily="var(--sans)">{quest.name}</text>
      <text x="198" y="52" fontSize="11" fill="var(--gold)" fontFamily="var(--sans)">{fmtInt(quest.detourKm)} km</text>
    </svg>
  );
}
