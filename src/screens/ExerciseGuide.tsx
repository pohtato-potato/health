import { useAllSets, useSettings } from '../db/hooks';
import { allExercises, type Guide } from '../domain/plan';
import { cueFor, FAULTS, topFault } from '../domain/quality';
import { back, go, useRoute } from '../router';
import { Icon } from '../ui/Icon';

const PARTS: { key: Exclude<keyof Guide, 'faults'>; title: string }[] = [
  { key: 'setup', title: 'Set up' },
  { key: 'movement', title: 'The movement' },
  { key: 'breathing', title: 'Breathing' },
  { key: 'feel', title: 'Where you should feel it' },
  { key: 'stop', title: 'When to stop' },
  { key: 'progress', title: 'How it progresses' },
];

/** One exercise, written for the room it is done in: setup, movement, faults, when to stop, and a mirror cue. */
export function ExerciseGuidePage() {
  const { params } = useRoute();
  const settings = useSettings();
  const sets = useAllSets();
  if (!settings || !sets) return <div className="page bare" />;
  const ex = settings.plan ? allExercises(settings.plan).find((e) => e.id === params.get('ex')) : undefined;
  if (!ex)
    return (
      <div className="page bare">
        <button type="button" className="backlink" onClick={() => back('/train')}>
          <Icon name="left" size={20} stroke={1.8} />
          Back
        </button>
        <div className="t15 q">That exercise isn't in your plan.</div>
      </div>
    );
  const mine = sets.filter((s) => s.exerciseId === ex.id);
  const cue = cueFor(ex, mine);
  const fault = topFault(mine);
  const g = ex.guide;
  const written = g && (PARTS.some((p) => g[p.key]?.trim()) || g.faults.some((f) => f.trim()));
  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/train')}>
        <Icon name="left" size={20} stroke={1.8} />
        Back
      </button>
      <div className="col gap4">
        <h1 className="h1">{ex.name}</h1>
        <div className="t14 q">
          {ex.sets} sets{ex.reps ? ` · ${ex.reps[0]}–${ex.reps[1]} reps` : ex.seconds ? ` · ${ex.seconds[0]}–${ex.seconds[1]} s` : ''}
        </div>
      </div>
      {cue && (
        <div className="cue">
          <span className="lbl sm gold">In the mirror</span>
          <span className="t15 lh">{cue}</span>
        </div>
      )}
      {written ? (
        <>
          {PARTS.filter((p) => g![p.key]?.trim()).map((p) => (
            <div key={p.key} className="col gap4">
              <div className="lbl">{p.title}</div>
              <div className="t15 lh">{g![p.key]}</div>
            </div>
          ))}
          {g!.faults.some((f) => f.trim()) && (
            <div className="col gap4">
              <div className="lbl apri">Faults to watch</div>
              <ul className="t15 lh" style={{ margin: 0, paddingLeft: 18 }}>
                {g!.faults
                  .filter((f) => f.trim())
                  .map((f) => (
                    <li key={f}>{f}</li>
                  ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <div className="t15 lh">No guide written for this one yet. Write it for your own room: what you use as a bench, where your feet lock, what you see in the mirror.</div>
        </div>
      )}
      {fault && (
        <div className="t14 q lh">
          Seen most lately: {FAULTS.find((f) => f.id === fault)?.name.toLowerCase()}. {FAULTS.find((f) => f.id === fault)?.cue}
        </div>
      )}
      <button type="button" className="btn ghost" onClick={() => go('/plan', { ex: ex.id })}>
        {written ? 'Edit the guide' : 'Write the guide'}
      </button>
    </div>
  );
}
