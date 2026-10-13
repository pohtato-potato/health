import { useMemo, useState } from 'react';
import { estMinutes, shortPlan } from '../domain/plannerShort';
import { buildSession, findSession } from '../domain/plan';
import { exerciseStatus } from '../domain/progression';
import { useAllDays, useAllSets, useSessions, useSettings } from '../db/hooks';
import { go, useRoute } from '../router';
import { nextUp } from '../state/derived';
import { Check } from '../ui/Check';
import { Sheet } from '../ui/Sheet';

const MINUTES = [20, 30, 45];

/** "I have 30 min": proposed exercises with reasons; untick any, then start. */
export function ShortSessionSheet() {
  const settings = useSettings();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const { params } = useRoute();
  const [minutes, setMinutes] = useState(30);
  const [off, setOff] = useState<Set<string>>(new Set());
  const plan = settings?.plan;
  const sessionId = params.get('session') ?? (settings && sessions && sets && days ? nextUp(settings, sessions, sets, days)?.sessionId : undefined) ?? plan?.rotation[0];
  const exs = useMemo(() => (plan && sessionId ? buildSession(plan, sessionId) : []), [plan, sessionId]);
  if (!settings || !plan || !sets || !sessionId) return <Sheet title="Short session">{null}</Sheet>;
  const statuses = new Map(exs.map((e) => [e.id, exerciseStatus(e, settings.planState, settings.equipment, sets, plan.bigJump)]));
  const { picks } = shortPlan(exs, minutes, statuses);
  const chosen = picks.filter((p) => !off.has(p.exId));
  const total = Math.round(chosen.reduce((n, p) => n + estMinutes(exs.find((e) => e.id === p.exId)!), 0));

  return (
    <Sheet title="Short on time" sub={findSession(plan, sessionId)?.name}>
      <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }} role="radiogroup" aria-label="Minutes">
        <span className="t14 q">I have</span>
        {MINUTES.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={minutes === m} className={`chip sm${minutes === m ? ' on' : ''}`} onClick={() => (setMinutes(m), setOff(new Set()))}>
            {m} min
          </button>
        ))}
      </div>
      <div className="col">
        {picks.map((p) => {
          const ex = exs.find((e) => e.id === p.exId)!;
          return (
            <Check
              key={p.exId}
              checked={!off.has(p.exId)}
              onChange={(on) => {
                const n = new Set(off);
                if (on) n.delete(p.exId);
                else n.add(p.exId);
                setOff(n);
              }}
              label={ex.name}
              detail={`${p.reason} · about ${Math.round(estMinutes(ex))} min`}
            />
          );
        })}
      </div>
      <button type="button" className="btn lg block" disabled={!chosen.length} onClick={() => go('/session', { start: sessionId, only: chosen.map((p) => p.exId).join(',') })}>
        Start, about {total} min
      </button>
    </Sheet>
  );
}
