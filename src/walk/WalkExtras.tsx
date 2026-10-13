import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addDays, dayKey } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { ALL_STATES, statesReached } from '../domain/walk';
import type { Day } from '../domain/types';
import { questOffer, QUESTS, type Quest } from './quests';
export { detourKm } from './quests';
import { souvenirFor } from './souvenirs';

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
            <span className="t14">{got ? s?.name : 'Waiting'}</span>
            <span className="t12 q">{name}</span>
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
