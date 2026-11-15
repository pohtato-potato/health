// Train's lead (look pass L2; board five "Train: any order, your body, weights you can change", board four's gym and
// home looks): the week in any order, today's pick, the session's exercises with their effort and weights as buttons.
import { useState, type ReactNode } from 'react';
import { fmtKg } from '../../domain/loads';
import type { MuscleRow } from '../../domain/trainWeek';
import type { MuscleId } from '../../domain/types';
import { BodyHeat } from '../../ui/BodyMap';
import { Icon } from '../../ui/Icon';
import { Action, Panel } from '../../ui/kit/Kit';
import { Sheet } from '../../ui/Sheet';

/** Sets per muscle in the colours chosen in October: green on target, yellow low, blue high. */
export const MUSCLE_INK = { ok: '#8fc9b0', low: '#e8d27a', high: '#8fb3f0' } as const;
const STATE_WORD = { ok: 'on target', low: 'low', high: 'high' } as const;

export type Place = 'home' | 'gym';
export const placeIcon = (p: Place) => (p === 'gym' ? 'gym' : 'home');

export interface Pick {
  id: string;
  code: string;
  focus: string;
  minutes: number;
  place: Place;
}

/** The week: how many done, which, and today's pick from what is left. Any order; any one can be swapped for another. */
export function WeekLead(p: {
  words: string;
  done: { code: string; day: string; place: Place }[];
  picks: Pick[];
  picked: string;
  onPick: (id: string) => void;
  also: { id: string; label: string }[];
  allDone: boolean;
}) {
  return (
    <section className="tr-week" aria-label="This week">
      <div className="k-row">
        <b className="tr-words">{p.words}</b>
        <span className="k-q">any order</span>
      </div>
      {p.done.length > 0 && (
        <div className="k-chips">
          {p.done.map((d, i) => (
            <span key={`${d.code}${i}`} className="tr-done">
              <Icon name="check" size={16} stroke={2.4} />
              {d.code} {d.day}
            </span>
          ))}
        </div>
      )}
      <b>{p.allDone ? 'Another today?' : p.picks.length === 1 ? 'Today' : 'Which one today?'}</b>
      <div className="tr-picks" role="radiogroup" aria-label="Which session today">
        {p.picks.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={s.id === p.picked} aria-label={`${s.code}, ${s.place === "gym" ? "at the gym" : "at home"}: ${s.focus}, ${s.minutes} minutes`} className={`tr-pick ${s.place}${s.id === p.picked ? ' on' : ''}`} onClick={() => p.onPick(s.id)}>
            <span className="tr-pick-code">
              <Icon name={placeIcon(s.place)} size={20} stroke={1.8} />
              <b>{s.code}</b>
            </span>
            <span>{s.focus}</span>
            <span className="k-q">{s.minutes} min</span>
          </button>
        ))}
      </div>
      {p.also.length > 0 && (
        <div className="tr-or">
          <span className="k-q">Or</span>
          {p.also.map((a) => (
            <button key={a.id} type="button" className={a.id === p.picked ? 'on' : undefined} aria-pressed={a.id === p.picked} onClick={() => p.onPick(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export interface ExRow {
  id: string;
  name: string;
  target: string;
  /** Tempo, a lead side: small words after the target. */
  extra?: string;
  effort?: string;
  /** Close to failure (0–1 left) gets the warm ink; stopping short the quiet one. */
  hard?: boolean;
  weight?: { text: string; onTap?: () => void; label: string };
  up?: string;
}

/** One block of exercises: a heading (the load at home, or none), the rows, pairs marked "back to back". */
export function ExerciseBlock({ head, groups, ink }: { head?: ReactNode; groups: ExRow[][]; ink: string }) {
  return (
    <Panel ink={ink} className="tr-exs">
      {head && <span className="tr-block-h">{head}</span>}
      {groups.map((g, gi) => (
        <div key={g[0].id} className={`tr-group${g.length > 1 ? ' pair' : ''}${gi > 0 ? ' sep' : ''}`}>
          {g.map((r, i) => (
            <div key={r.id}>
              {i > 0 && (
                <span className="tr-b2b">
                  <Icon name="link" size={16} stroke={1.8} />
                  back to back
                </span>
              )}
              <ExerciseLine r={r} />
            </div>
          ))}
        </div>
      ))}
    </Panel>
  );
}

function ExerciseLine({ r }: { r: ExRow }) {
  return (
    <div className="tr-ex">
      <span className="k-col tr-ex-text">
        <b>{r.name}</b>
        <span className="tr-ex-sub">
          <span className="k-q">
            {r.target}
            {r.extra ? ` · ${r.extra}` : ''}
          </span>
          {r.effort && <span className={`tr-eff${r.hard ? ' hard' : ''}`}>{r.effort}</span>}
        </span>
      </span>
      {r.weight &&
        (r.weight.onTap ? (
          <button type="button" className="tr-weight" onClick={r.weight.onTap} aria-label={r.weight.label}>
            {r.weight.text}
          </button>
        ) : (
          <span className="tr-weight still">{r.weight.text}</span>
        ))}
      {r.up && <span className="tr-up">{r.up}</span>}
    </div>
  );
}

/** The body figure panel: this week's sets per muscle in colour. Tap for the numbers. */
export function BodyPanel({ rows, onOpen }: { rows: MuscleRow[]; onOpen: () => void }) {
  const heat: Partial<Record<MuscleId, number>> = {};
  const tint: Partial<Record<MuscleId, string>> = {};
  for (const r of rows)
    for (const m of r.muscles) {
      heat[m] = r.sets > 0 ? 0.95 : 0.55;
      tint[m] = MUSCLE_INK[r.state];
    }
  const low = rows.filter((r) => r.state === 'low').length;
  return (
    <Panel ink="#ede6da" onClick={onOpen} label={`This week on your body: ${rows.filter((r) => r.state === 'ok').length} on target, ${low} low. Tap for the numbers.`} className="tr-body">
      <span className="tr-body-in">
        <span className="tr-body-fig">
          <BodyHeat heat={heat} tint={tint} label="This week on your body, front and back: green on target, yellow low, blue high" />
        </span>
        <span className="k-col">
          <b>This week on your body</b>
          <span><b style={{ color: MUSCLE_INK.ok }}>Green</b> on target</span>
          <span><b style={{ color: MUSCLE_INK.low }}>Yellow</b> low</span>
          <span><b style={{ color: MUSCLE_INK.high }}>Blue</b> high</span>
          <span className="k-q">Tap for the numbers</span>
        </span>
      </span>
    </Panel>
  );
}

/** Sets per muscle: each row's bar against the plan's range (the dashed marks), the count in its colour. */
export function MuscleBars({ rows }: { rows: MuscleRow[] }) {
  const max = Math.max(16, ...rows.map((r) => Math.max(r.sets, r.hi + 2)));
  return (
    <Panel ink="#9db4d6" className="tr-bars">
      {rows.map((r) => (
        <div key={r.name} className="tr-bar-row" aria-label={`${r.name}: ${r.sets} hard sets, ${STATE_WORD[r.state]}; the plan asks ${r.lo} to ${r.hi}`}>
          <span>{r.name}</span>
          <span className="tr-bar" aria-hidden="true">
            <i style={{ width: `${Math.min(100, (r.sets / max) * 100)}%`, background: MUSCLE_INK[r.state] }} />
            <em style={{ left: `${(r.lo / max) * 100}%` }} />
            <em style={{ left: `${(r.hi / max) * 100}%` }} />
          </span>
          <b className="tr-bar-n" style={{ color: MUSCLE_INK[r.state] }}>{r.sets}</b>
        </div>
      ))}
    </Panel>
  );
}

/**
 * A weight, changed with minus and plus. On Train it holds for next time; during a set it is for good or this set only.
 * `onType` opens the exact-number entry (gym machines, where the stack's own numbers vary).
 */
export function WeightSheet(p: { name: string; kg: number | null; unit: string; step: (kg: number | null, dir: -1 | 1) => number | null; onSave: (kg: number) => void; onClose: () => void; onType?: () => void; note?: string }) {
  const [kg, setKg] = useState<number | null>(p.kg);
  return (
    <Sheet title={p.name} onClose={p.onClose}>
      <div className="tr-wsheet">
        <div className="tr-stepper">
          <button type="button" className="tr-step" aria-label="Lighter" onClick={() => setKg((k) => p.step(k, -1))}>
            <Icon name="minus" size={26} stroke={2.2} />
          </button>
          <span className="tr-stepper-v">
            <b>{kg === null ? '–' : fmtKg(kg)}</b> {p.unit}
          </span>
          <button type="button" className="tr-step" aria-label="Heavier" onClick={() => setKg((k) => p.step(k, 1))}>
            <Icon name="plus" size={26} stroke={2.2} />
          </button>
        </div>
        {p.note && <span className="k-q">{p.note}</span>}
        {p.onType && (
          <button type="button" className="tr-chipbtn" onClick={p.onType}>
            Type the number
          </button>
        )}
        <Action wide disabled={kg === null || kg === p.kg} onClick={() => kg !== null && p.onSave(kg)}>
          Keep it for next time
        </Action>
      </div>
    </Sheet>
  );
}
