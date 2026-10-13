import { useMemo, useState } from 'react';
import { estMinutes, shortPlan } from '../domain/plannerShort';
import { buildSession, findSession } from '../domain/plan';
import { exerciseStatus } from '../domain/progression';
import { useAllDays, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { go, useRoute } from '../router';
import { flagEvents, nextUp } from '../state/derived';
import { readinessFor } from '../state/readinessFor';
import { Check } from '../ui/Check';
import { Sheet } from '../ui/Sheet';

type Time = 20 | 30 | 45 | 'full';
const TIMES: Time[] = [20, 30, 45, 'full'];

/** Short session by time (s46): pick the time, see why each exercise made it, tick or untick any, start. */
export function ShortSessionSheet() {
  const settings = useSettings();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const today = useToday();
  const { params } = useRoute();
  const [time, setTime] = useState<Time>(30);
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const plan = settings?.plan;
  const sessionId = params.get('session') ?? (settings && sessions && sets && days ? nextUp(settings, sessions, sets, days)?.sessionId : undefined) ?? plan?.rotation[0];
  const exs = useMemo(() => (plan && sessionId ? buildSession(plan, sessionId) : []), [plan, sessionId]);
  if (!settings || !plan || !sets || !sessions || !days || !sessionId) return <Sheet title="Short session">{null}</Sheet>;
  const statuses = new Map(exs.map((e) => [e.id, exerciseStatus(e, settings.planState, settings.equipment, sets, plan.bigJump)]));
  const { picks } = time === 'full' ? { picks: exs.map((e) => ({ exId: e.id, reason: 'Full session' })) } : shortPlan(exs, time, statuses);
  const reason = new Map(picks.map((p) => [p.exId, p.reason]));
  const chosen = picked ?? new Set(picks.map((p) => p.exId));
  const list = exs.filter((e) => chosen.has(e.id));
  const total = Math.round(list.reduce((n, e) => n + estMinutes(e), 0));
  const ready = readinessFor(settings, today, days, sessions, sets, flagEvents(plan, sessions, days).map((e) => e.date));
  const name = findSession(plan, sessionId)?.name ?? `Session ${sessionId}`;

  return (
    <Sheet title={`${name} in`}>
      <div className="seg" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }} role="radiogroup" aria-label="Time you have">
        {TIMES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={time === t}
            className={time === t ? 'on' : undefined}
            onClick={() => {
              setTime(t);
              setPicked(null);
            }}
          >
            {t === 'full' ? 'Full' : `${t} min`}
          </button>
        ))}
      </div>
      <div className="col">
        {exs.map((ex) => {
          const on = chosen.has(ex.id);
          return (
            <div key={ex.id} style={{ opacity: on ? 1 : 0.5 }}>
            <Check
              checked={on}
              onChange={(v) => {
                const n = new Set(chosen);
                if (v) n.add(ex.id);
                else n.delete(ex.id);
                setPicked(n);
              }}
              label={ex.name}
              detail={on ? (reason.get(ex.id) ?? 'Added by you').toLowerCase() : 'skip tonight'}
            />
            </div>
          );
        })}
      </div>
      <div className="row t14">
        <span>
          {list.length} exercise{list.length === 1 ? '' : 's'} · about {total} min
        </span>
        {ready.known && (
          <span className="q">
            readiness {ready.score} · {ready.label.toLowerCase()}
          </span>
        )}
      </div>
      <button type="button" className="btn lg block" disabled={!list.length} onClick={() => go('/session', time === 'full' && list.length === exs.length ? { start: sessionId } : { start: sessionId, only: list.map((e) => e.id).join(',') })}>
        {time === 'full' ? 'Start the full session' : `Start ${time}-minute session`}
      </button>
    </Sheet>
  );
}
