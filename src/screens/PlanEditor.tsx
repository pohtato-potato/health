import { useState } from 'react';
import { CHALLENGE_IDS, CHALLENGE_NAMES, groupExercises, isSuperset, targetText, validatePlan, type ExerciseDef, type Guide, type LoadKind, type Measure, type PlanDef, type SessionDef } from '../domain/plan';
import { addExercise, moveExercise, removeExercise, setSuperset, updateExercise } from '../domain/planEdit';
import { patchSettings } from '../db/actions';
import { uid } from '../db/db';
import { useSettings } from '../db/hooks';
import { back, useRoute } from '../router';
import { DecField, IntField, Seg, SwitchRow } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';
import { askConfirm } from '../ui/Confirm';

const GUIDE_FIELDS: { key: keyof Guide; label: string; hint: string }[] = [
  { key: 'setup', label: 'Setup', hint: 'Where and how: the bed, the mattress, the wall' },
  { key: 'movement', label: 'The movement', hint: 'What moves, and the path it takes' },
  { key: 'breathing', label: 'Breathing', hint: 'When to breathe in and out' },
  { key: 'faults', label: 'Common faults, one per line', hint: 'Elbows flaring, rushing the lowering' },
  { key: 'feel', label: 'What you should feel', hint: 'Which muscle works' },
  { key: 'stop', label: 'When to stop', hint: 'Pain, not effort' },
  { key: 'progress', label: 'How to progress at home', hint: 'Reps, then a challenge, then load' },
];

/** Edit the training plan in the app: exercises, order, supersets, targets, challenges, cues and guides. */
export function PlanEditor() {
  const settings = useSettings();
  if (!settings?.plan) return <div className="page" />;
  return <Editor initial={settings.plan} />;
}

function Editor({ initial }: { initial: PlanDef }) {
  const toast = useToast();
  const { params } = useRoute();
  // Opened from an exercise's guide: start on that exercise, unfolded.
  const asked = params.get('ex');
  const home = initial.sessions.find((s) => s.exercises.some((e) => e.id === asked));
  const [plan, setPlan] = useState(initial);
  const [sid, setSid] = useState(home?.id ?? initial.sessions[0].id);
  const [open, setOpen] = useState<string | null>(home ? asked : null);
  const session = plan.sessions.find((s) => s.id === sid)!;
  const dirty = plan !== initial;
  const errs = validatePlan(plan);

  const change = (next: SessionDef) => setPlan({ ...plan, sessions: plan.sessions.map((s) => (s.id === sid ? next : s)) });
  const save = async () => {
    if (errs.length) return;
    await patchSettings({ plan });
    toast({ text: 'Plan saved', sub: 'The next session uses it.' });
    back('/settings');
  };
  const leave = async () => {
    if (dirty && !(await askConfirm({ title: 'Leave without saving?', body: 'Your changes to the plan will be lost.', yes: 'Leave', danger: true }))) return;
    back('/settings');
  };

  return (
    <div className="page" style={{ paddingBottom: 'calc(110px + var(--safe-bottom))' }}>
      <button type="button" className="backlink" onClick={leave}>
        <Icon name="left" size={20} stroke={1.8} />
        Settings
      </button>
      <h1 className="h1">{plan.name}</h1>
      <Seg options={plan.sessions.map((s) => ({ id: s.id, label: s.name }))} value={sid} onChange={(v) => (setSid(v), setOpen(null))} />

      <div className="col gap8">
        {groupExercises(session.exercises).map((g) => (
          <div key={g[0].id} className={g.length > 1 ? 'plan-group pair' : 'plan-group'}>
            {g.map((ex) => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                open={open === ex.id}
                onToggle={() => setOpen(open === ex.id ? null : ex.id)}
                onMove={(by) => change(moveExercise(session, ex.id, by))}
                onChange={(patch) => change(updateExercise(session, ex.id, patch))}
                onPair={(on) => change(setSuperset(session, ex.id, on))}
                onRemove={async () => {
                  if (await askConfirm({ title: `Remove ${ex.name}?`, body: 'Logged sets stay in your history.', yes: 'Remove', danger: true })) {
                    change(removeExercise(session, ex.id));
                    setOpen(null);
                  }
                }}
                isLast={session.exercises[session.exercises.length - 1].id === ex.id}
              />
            ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn ghost block"
        onClick={() => {
          const id = `ex-${uid().slice(0, 6)}`;
          change(addExercise(session, { id, order: '?', name: 'New exercise', sets: 3, reps: [10, 15], load: 'pair', startKg: 5, measure: 'reps', restSec: 90 }));
          setOpen(id);
        }}
      >
        + Add an exercise
      </button>

      <div className="savebar">
        {errs.length > 0 && <div className="t13 apri">{errs[0]}</div>}
        <button type="button" className="btn lg block" disabled={!dirty || errs.length > 0} onClick={save}>
          {dirty ? 'Save the plan' : 'No changes'}
        </button>
      </div>
    </div>
  );
}

function ExerciseRow({
  ex,
  open,
  onToggle,
  onMove,
  onChange,
  onPair,
  onRemove,
  isLast,
}: {
  ex: ExerciseDef;
  open: boolean;
  onToggle: () => void;
  onMove: (by: -1 | 1) => void;
  onChange: (patch: Partial<ExerciseDef>) => void;
  onPair: (on: boolean) => void;
  onRemove: () => void;
  isLast: boolean;
}) {
  const measure: Measure = ex.measure ?? (ex.seconds ? 'seconds' : 'reps');
  const range = measure === 'seconds' ? ex.seconds : measure === 'steps' ? ex.steps : ex.reps;
  const key = measure === 'seconds' ? 'seconds' : measure === 'steps' ? 'steps' : 'reps';
  const setRange = (lo: number | undefined, hi: number | undefined) => onChange({ [key]: [lo ?? range?.[0] ?? 1, hi ?? range?.[1] ?? 1] } as Partial<ExerciseDef>);
  const guide: Guide = ex.guide ?? { setup: '', movement: '', breathing: '', faults: [], feel: '', stop: '', progress: '' };

  return (
    <div className="plan-ex">
      <div className="row" style={{ gap: 8 }}>
        <span className="plan-order tn">{ex.order}</span>
        <button type="button" className="col gap2 grow" style={{ textAlign: 'left', minWidth: 0, minHeight: 44 }} aria-expanded={open} onClick={onToggle}>
          <span className="t15">{ex.name}</span>
          <span className="t12 q">{measure === 'steps' && ex.steps ? `${ex.sets} × ${ex.steps[0]}–${ex.steps[1]} steps` : targetText(ex)}</span>
        </button>
        <button type="button" className="icon-btn" aria-label={`Move ${ex.name} up`} onClick={() => onMove(-1)}>
          <Icon name="up" size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label={`Move ${ex.name} down`} onClick={() => onMove(1)}>
          <Icon name="down" size={18} />
        </button>
      </div>
      {open && (
        <div className="col gap12" style={{ paddingTop: 8 }}>
          <label className="flabel">
            <span className="lbl">Name</span>
            <input className="field" value={ex.name} onChange={(e) => onChange({ name: e.target.value })} spellCheck autoCapitalize="sentences" />
          </label>
          <div className="flabel">
            <span className="lbl">Counts</span>
            <Seg
              options={[
                { id: 'reps', label: 'Reps' },
                { id: 'seconds', label: 'Seconds' },
                { id: 'steps', label: 'Steps' },
              ]}
              value={measure}
              onChange={(m) => onChange({ measure: m, ...(m === 'seconds' ? { seconds: ex.seconds ?? [30, 45] } : m === 'steps' ? { steps: ex.steps ?? [60, 90] } : { reps: ex.reps ?? [10, 15] }) })}
            />
          </div>
          <div className="grid3">
            <label className="flabel">
              <span className="lbl">Sets</span>
              <IntField value={ex.sets} onChange={(v) => onChange({ sets: Math.max(1, v ?? 1) })} />
            </label>
            <label className="flabel">
              <span className="lbl">From</span>
              <IntField value={range?.[0]} onChange={(v) => setRange(v, undefined)} />
            </label>
            <label className="flabel">
              <span className="lbl">To</span>
              <IntField value={range?.[1]} onChange={(v) => setRange(undefined, v)} />
            </label>
          </div>
          <div className="flabel">
            <span className="lbl">Load</span>
            <Seg<LoadKind>
              options={[
                { id: 'pair', label: 'Two dumbbells' },
                { id: 'single', label: 'One' },
                { id: 'body', label: 'Body' },
                { id: 'band', label: 'Band' },
              ]}
              value={ex.load}
              onChange={(load) => onChange({ load })}
            />
          </div>
          <div className="grid2">
            {(ex.load === 'pair' || ex.load === 'single') && (
              <label className="flabel">
                <span className="lbl">Start, kg</span>
                <DecField value={ex.startKg} onChange={(startKg) => onChange({ startKg })} />
              </label>
            )}
            <label className="flabel">
              <span className="lbl">Rest, seconds</span>
              <IntField value={ex.restSec} onChange={(restSec) => onChange({ restSec })} placeholder="90" />
            </label>
            {(ex.load === 'pair' || ex.load === 'single') && (
              <label className="flabel">
                <span className="lbl">Drop set to, kg</span>
                <DecField value={ex.drop?.kg} onChange={(kg) => onChange({ drop: kg ? { kg } : undefined })} placeholder="None" />
              </label>
            )}
          </div>
          <div className="list">
            <SwitchRow title="Each side" checked={!!ex.perSide} onChange={(perSide) => onChange({ perSide, ...(perSide ? {} : { lead: undefined }) })} />
            <SwitchRow title={isSuperset(ex) ? 'In a superset' : 'Superset with the next one'} sub={isLast && !isSuperset(ex) ? 'Add another exercise after it first' : undefined} checked={isSuperset(ex)} onChange={(on) => !(isLast && on) && onPair(on)} />
            <SwitchRow title="Tired hands afterwards" sub="Grip-heavy: inputs switch to big dials and chips" checked={!!ex.tiredHands} onChange={(tiredHands) => onChange({ tiredHands })} />
          </div>
          {ex.perSide && (
            <div className="flabel">
              <span className="lbl">Lead side</span>
              <Seg
                options={[
                  { id: 'none', label: 'Either' },
                  { id: 'L', label: 'Left' },
                  { id: 'R', label: 'Right' },
                ]}
                value={ex.lead ?? 'none'}
                onChange={(v) => onChange({ lead: v === 'none' ? undefined : v })}
              />
            </div>
          )}
          <div className="flabel">
            <span className="lbl">Challenges</span>
            <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
              {CHALLENGE_IDS.map((c) => {
                const on = !!ex.challenges?.includes(c);
                return (
                  <button key={c} type="button" className={`chip sm${on ? ' on' : ''}`} aria-pressed={on} onClick={() => onChange({ challenges: on ? ex.challenges!.filter((x) => x !== c) : [...(ex.challenges ?? []), c] })}>
                    {CHALLENGE_NAMES[c]}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flabel">
            <span className="lbl">Your cue</span>
            <input className="field" value={ex.cue ?? ''} onChange={(e) => onChange({ cue: e.target.value || undefined })} placeholder="Elbows tucked, lower for three" spellCheck />
          </label>
          <details className="guide-edit">
            <summary className="t15">Guide</summary>
            <div className="col gap12" style={{ paddingTop: 10 }}>
              {GUIDE_FIELDS.map((f) => (
                <label key={f.key} className="flabel">
                  <span className="lbl">{f.label}</span>
                  <textarea
                    className="field"
                    rows={f.key === 'faults' ? 4 : 3}
                    placeholder={f.hint}
                    value={f.key === 'faults' ? guide.faults.join('\n') : guide[f.key]}
                    onChange={(e) => onChange({ guide: { ...guide, [f.key]: f.key === 'faults' ? e.target.value.split('\n') : e.target.value } })}
                    spellCheck
                  />
                </label>
              ))}
            </div>
          </details>
          <button type="button" className="link" style={{ color: 'var(--rose)' }} onClick={onRemove}>
            Remove this exercise
          </button>
        </div>
      )}
    </div>
  );
}
