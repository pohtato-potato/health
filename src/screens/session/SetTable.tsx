import { unlockAudio } from '../../audio';
import { fmtKg } from '../../domain/loads';
import { CHALLENGE_NAMES, measureOf, valueOfSet, type ExerciseDef } from '../../domain/plan';
import { FAULTS, FORM_LABELS } from '../../domain/quality';
import type { ExerciseStatus } from '../../domain/progression';
import type { SetEntry, Side } from '../../domain/types';
import { Dial } from '../../ui/Dial';
import { Icon } from '../../ui/Icon';

export interface Row {
  ex: ExerciseDef;
  setNo: number;
  side: Side;
  drop: boolean;
  key: string;
}

export interface Draft {
  kg?: string;
  val?: string;
  form?: 1 | 2 | 3 | 4 | 5;
  clean?: number;
  rir?: number;
  challenges?: string[];
  faults?: string[];
  discomfort?: 'knee' | 'wrist';
}

const toggle = (xs: string[] | undefined, x: string) => (xs?.includes(x) ? xs.filter((y) => y !== x) : [...(xs ?? []), x]);

export const findLogged = (mine: SetEntry[], r: Row) => mine.find((s) => s.exerciseId === r.ex.id && s.setNo === r.setNo && s.side === r.side && !!s.drop === r.drop);

export function describe(kg: number | null, m: { reps?: number; seconds?: number; steps?: number }) {
  const v = m.reps !== undefined ? `${m.reps}` : m.steps !== undefined ? `${m.steps} steps` : `${m.seconds} s`;
  return kg !== null ? `${fmtKg(kg)} kg × ${v}` : m.reps !== undefined ? `${v} reps` : v;
}

const UNIT = { reps: 'Reps', seconds: 'Secs', steps: 'Steps' } as const;

export function SetTable({
  ex,
  st,
  rows,
  mine,
  activeKey,
  draft,
  setDraft,
  editing,
  setEditing,
  defaults,
  kgEditable,
  onSave,
  onRemove,
  onSkip,
  onUndoSkip,
  watch,
  setWatch,
  now,
  chips,
  tired,
  turnSteps,
}: {
  ex: ExerciseDef;
  st: ExerciseStatus;
  rows: Row[];
  mine: SetEntry[];
  activeKey: string | null;
  draft: Draft;
  setDraft: (d: Draft) => void;
  editing: string | null;
  setEditing: (k: string | null) => void;
  defaults: (r: Row) => { kg: number | null; val?: number; last?: SetEntry };
  kgEditable: (r: Row) => boolean;
  onSave: (r: Row) => void;
  onRemove: (r: Row) => void;
  onSkip: (r: Row) => void;
  onUndoSkip: (r: Row) => void;
  watch: { key: string; startedAt: number } | null;
  setWatch: (w: { key: string; startedAt: number } | null) => void;
  now: number;
  /** Loads the kit can make, offered as chips. */
  chips: number[];
  /** Big dial and chips instead of the keyboard. */
  tired: boolean;
  /** Steps in one turn of the room, for carries. */
  turnSteps?: number;
}) {
  const measure = measureOf(ex);
  const timed = measure === 'seconds';
  return (
    <div className="sets">
      <div className="setrow head">
        <div>Set</div>
        <div>Last time</div>
        <div className="center">{ex.load === 'band' ? 'Band' : 'kg'}</div>
        <div className="center">{UNIT[measure]}</div>
        <div />
        <div />
      </div>
      {rows.map((r) => {
        const logged = findLogged(mine, r);
        const isActive = r.key === activeKey;
        const d = defaults(r);
        const lastText = d.last ? describe(d.last.loadKg, d.last).replace(' kg', '') : '—';
        const label = `${r.drop ? '↓' : r.setNo}${r.side !== 'both' ? ` ${r.side}` : ''}`;
        const leadSet = ex.lead && r.side !== ex.lead ? mine.find((s) => s.exerciseId === ex.id && s.setNo === r.setNo && s.side === ex.lead && !!s.drop === r.drop) : undefined;
        const typedVal = isActive ? parseFloat(draft.val ?? '') : NaN;
        const followerVal = logged ? valueOfSet(logged) : Number.isFinite(typedVal) ? typedVal : undefined;
        const overLead = leadSet && followerVal !== undefined && (valueOfSet(leadSet) ?? 0) < followerVal;
        const watching = watch?.key === r.key;
        const kgNow = draft.kg ?? d.kg?.toString() ?? '';
        const valNow = draft.val !== undefined ? Number(draft.val) : d.val;
        return (
          <div key={r.key} id={`row-${r.key}`}>
            <div className={`setrow${isActive ? ' cur' : ''}${logged?.skipped ? ' skipped' : ''}`}>
              <div className={isActive ? 't15' : 't15 q'}>{label}</div>
              <div className="t14 q" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {lastText}
              </div>
              {isActive ? (
                <>
                  {kgEditable(r) ? (
                    <input
                      className="field sm"
                      inputMode="decimal"
                      aria-label="Load in kg"
                      value={kgNow}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setDraft({ ...draft, kg: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })}
                    />
                  ) : (
                    <div className="t14 q center">{ex.load === 'band' ? st.band?.split(' ')[0] ?? 'Band' : 'Body'}</div>
                  )}
                  <div style={{ position: 'relative' }}>
                    <input
                      className="field sm focus"
                      inputMode="numeric"
                      aria-label={UNIT[measure]}
                      placeholder={d.val?.toString() ?? ''}
                      value={watching ? String(Math.floor((now - watch!.startedAt) / 1000)) : draft.val ?? ''}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => setDraft({ ...draft, val: e.target.value.replace(/[^\d]/g, '') })}
                    />
                  </div>
                  {timed ? (
                    <button
                      type="button"
                      aria-label={watching ? 'Stop the stopwatch' : 'Start the stopwatch'}
                      className="center"
                      style={{ color: watching ? 'var(--sage)' : 'var(--quiet)' }}
                      onClick={() => {
                        if (watching) {
                          setDraft({ ...draft, val: String(Math.floor((now - watch!.startedAt) / 1000)) });
                          setWatch(null);
                        } else {
                          unlockAudio();
                          setWatch({ key: r.key, startedAt: Date.now() });
                        }
                      }}
                    >
                      <Icon name={watching ? 'pause' : 'stopwatch'} size={18} stroke={1.8} />
                    </button>
                  ) : (
                    <div />
                  )}
                  <button type="button" className="okdot" aria-label={`Complete set ${label}`} onClick={() => onSave(r)} />
                </>
              ) : logged?.skipped ? (
                <>
                  <div className="t14 q center" style={{ gridColumn: 'span 2' }}>
                    Skipped
                  </div>
                  <div />
                  <button type="button" className="t13 q" style={{ minHeight: 44 }} onClick={() => onUndoSkip(r)}>
                    Undo
                  </button>
                </>
              ) : (
                <>
                  <div className={`t16 center ${logged ? '' : 'f'}`}>
                    {logged ? (logged.loadKg !== null ? fmtKg(logged.loadKg) : ex.load === 'band' ? 'B' : '—') : d.kg !== null && kgEditable(r) ? fmtKg(d.kg) : ''}
                  </div>
                  <div className={`t16 center ${logged ? '' : 'f'}`}>
                    {logged ? valueOfSet(logged) : d.val ?? ''}
                    {logged?.cleanReps !== undefined && logged.cleanReps < (logged.reps ?? 0) && <span className="t11" style={{ color: logged.form ? `var(--f${logged.form})` : 'var(--quiet)' }}> · {logged.cleanReps} clean</span>}
                    {logged?.form && <i className="formdot" style={{ background: `var(--f${logged.form})` }} aria-label={`form ${FORM_LABELS[logged.form - 1]}`} />}
                  </div>
                  <div className="mark" style={{ color: logged?.mark === '!!' ? 'var(--gold)' : logged?.mark === '!' ? 'var(--sage)' : 'var(--quiet)' }}>
                    {logged?.mark ?? ''}
                  </div>
                  {logged ? (
                    <button type="button" className="editbtn" aria-label={`Edit set ${label}`} onClick={() => setEditing(r.key)}>
                      Edit
                    </button>
                  ) : (
                    <div />
                  )}
                </>
              )}
            </div>
            {overLead && <div className="flagline">{r.side === 'R' ? 'Right' : 'Left'} did more than {ex.lead === 'L' ? 'left' : 'right'}. Keep it at or below.</div>}
            {isActive && (
              <div className="setpanel">
                {kgEditable(r) && chips.length > 0 && (
                  <div className="chiprow" role="radiogroup" aria-label="Weight">
                    {chips.map((kg) => {
                      const on = Number(kgNow) === kg;
                      return (
                        <button key={kg} type="button" role="radio" aria-checked={on} className={`chip sm${on ? ' on' : ''}`} onClick={() => setDraft({ ...draft, kg: String(kg) })}>
                          {fmtKg(kg)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {tired && !timed && (
                  <Dial value={valNow ?? 0} step={1} min={0} max={measure === 'steps' ? 300 : 50} onChange={(v) => setDraft({ ...draft, val: String(v) })} unit={UNIT[measure].toLowerCase()} label={UNIT[measure]} major={5} />
                )}
                {measure === 'steps' && turnSteps ? (
                  <div className="chiprow" aria-label="Turns of the room">
                    {[2, 3, 4, 5, 6].map((n) => (
                      <button key={n} type="button" className="chip sm" onClick={() => setDraft({ ...draft, val: String(n * turnSteps) })}>
                        {n} turns
                      </button>
                    ))}
                  </div>
                ) : null}
                {measure === 'reps' && !r.drop && (
                  <>
                    <div className="chiprow" role="radiogroup" aria-label="Form">
                      {FORM_LABELS.map((word, i) => {
                        const f = (i + 1) as 1 | 2 | 3 | 4 | 5;
                        const on = draft.form === f;
                        return (
                          <button key={word} type="button" role="radio" aria-checked={on} className={`chip sm formchip${on ? ' on' : ''}`} style={on ? { background: `var(--f${f})`, borderColor: `var(--f${f})` } : { color: `var(--f${f})` }} onClick={() => setDraft({ ...draft, form: on ? undefined : f })}>
                            {f} {word}
                          </button>
                        );
                      })}
                    </div>
                    {draft.form !== undefined && draft.form < 5 && (
                      <div className="row" style={{ gap: 10, justifyContent: 'flex-start' }}>
                        <span className="t13 q">Clean reps before it slipped</span>
                        <input
                          className="field sm"
                          style={{ width: 64 }}
                          inputMode="numeric"
                          aria-label="Clean reps"
                          placeholder={String(valNow ?? '')}
                          value={draft.clean ?? ''}
                          onChange={(e) => setDraft({ ...draft, clean: e.target.value ? Number(e.target.value.replace(/[^\d]/g, '')) : undefined })}
                        />
                      </div>
                    )}
                    <div className="chiprow" role="radiogroup" aria-label="Reps in reserve">
                      <span className="t13 q" style={{ alignSelf: 'center', flexShrink: 0 }}>
                        Left in the tank
                      </span>
                      {[0, 1, 2, 3].map((n) => {
                        const on = draft.rir === n;
                        return (
                          <button key={n} type="button" role="radio" aria-checked={on} className={`chip sm${on ? ' on' : ''}`} style={n === 0 ? (on ? { background: 'var(--rose)', borderColor: 'var(--rose)' } : { color: 'var(--rose)' }) : undefined} onClick={() => setDraft({ ...draft, rir: on ? undefined : n })}>
                            {n === 3 ? '3+' : n}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                {(ex.challenges?.length ?? 0) > 0 && (
                  <div className="chiprow" aria-label="Challenges">
                    {ex.challenges!.map((c) => {
                      const on = !!draft.challenges?.includes(c);
                      return (
                        <button key={c} type="button" aria-pressed={on} className={`chip sm${on ? ' on' : ''}`} onClick={() => setDraft({ ...draft, challenges: toggle(draft.challenges, c) })}>
                          {CHALLENGE_NAMES[c]}
                        </button>
                      );
                    })}
                  </div>
                )}
                <details className="setmore">
                  <summary className="t13 q">Faults or discomfort</summary>
                  <div className="col gap8" style={{ paddingTop: 8 }}>
                    <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
                      {FAULTS.map((f) => {
                        const on = !!draft.faults?.includes(f.id);
                        return (
                          <button key={f.id} type="button" aria-pressed={on} className={`chip sm${on ? ' on' : ''}`} onClick={() => setDraft({ ...draft, faults: toggle(draft.faults, f.id) })}>
                            {f.name}
                          </button>
                        );
                      })}
                    </div>
                    <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
                      {(['knee', 'wrist'] as const).map((j) => {
                        const on = draft.discomfort === j;
                        return (
                          <button key={j} type="button" aria-pressed={on} className={`chip sm${on ? ' on' : ''}`} onClick={() => setDraft({ ...draft, discomfort: on ? undefined : j })}>
                            {j === 'knee' ? 'Knee felt off' : 'Wrist felt off'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </details>
                <div className="row" style={{ justifyContent: 'flex-start', gap: 16 }}>
                  {editing === r.key ? (
                    <>
                      <button type="button" className="t13 q" style={{ minHeight: 44 }} onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                      <button type="button" className="t13" style={{ color: 'var(--rose)', minHeight: 44 }} onClick={() => onRemove(r)}>
                        Delete set
                      </button>
                    </>
                  ) : (
                    <button type="button" className="t13 q" style={{ minHeight: 44 }} onClick={() => onSkip(r)}>
                      Skip this set
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="t12 q" style={{ padding: '8px 14px 10px', borderTop: '1px solid var(--divider)' }}>
        ! beats last time: more reps, more weight, or a challenge at the same reps. !! is a record.
      </div>
    </div>
  );
}
