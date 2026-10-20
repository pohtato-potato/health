import { useMemo, useState } from 'react';
import { bump, patchSettings } from '../db/actions';
import { saveBackup } from '../db/backup';
import { useAllSets, useSessions } from '../db/hooks';
import { fmtKg } from '../domain/loads';
import { findSession, rotationOf, type PlanDef } from '../domain/plan';
import { applyImport, diffPlans, loadChangeText, UNDO_DAYS } from '../domain/planImport';
import type { Settings } from '../domain/types';
import { Seg } from '../ui/controls';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';

/** "Use this plan?" with what changes: exercises kept, renamed, new and gone, new flags, loads that reset, and where the loop starts. */
export function PlanImportSheet({ plan, settings, onClose }: { plan: PlanDef; settings: Settings; onClose: () => void }) {
  const sets = useAllSets();
  const sessions = useSessions();
  const toast = useToast();
  const diff = useMemo(() => (sets && sessions ? diffPlans(settings.plan, plan, { ...settings, sets, sessions }) : undefined), [plan, settings, sets, sessions]);
  const [start, setStart] = useState<string | null>(null);
  const [skipReset, setSkipReset] = useState<Set<string>>(new Set());
  if (!diff) return null;
  const startAt = start ?? diff.next;
  const rot = rotationOf(plan);
  const name = (id: string) => findSession(plan, id)?.name ?? id;
  const toggle = (id: string) => {
    const n = new Set(skipReset);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSkipReset(n);
  };

  return (
    <Sheet title={`Use “${plan.name}”?`} onClose={onClose}>
      <div className="t15 lh">
        {plan.sessions.map((s) => `${s.name}: ${s.exercises.length} exercises`).join(' · ')}. {plan.flags.length} joint checks, {plan.triggers?.length ?? 0} triggers.
      </div>

      <div className="col gap8">
        <span className="lbl">Next session: {name(startAt)}</span>
        {diff.next !== startAt && <span className="t13 q lh">Carrying on from your last session would make it {name(diff.next)}.</span>}
        {rot.length > 1 && <Seg options={rot.map((id) => ({ id, label: id }))} value={startAt} onChange={setStart} />}
      </div>

      {diff.loads.length > 0 && (
        <div className="col gap8">
          <span className="lbl">Loads that change</span>
          <span className="t13 q lh">Ticked ones start at the plan’s load. History and records stay.</span>
          {diff.loads.map((c) => (
            <label key={c.id} className="row" style={{ gap: 12, minHeight: 48, justifyContent: 'flex-start' }}>
              <input type="checkbox" checked={c.forced || !skipReset.has(c.id)} disabled={c.forced} onChange={() => toggle(c.id)} style={{ width: 24, height: 24 }} />
              <span className="t15 lh">
                {c.name}: {loadChangeText(c, fmtKg)}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="col gap6 t14 lh">
        <span className="lbl">Exercises</span>
        <span>{diff.kept.length} kept, with their history.</span>
        {diff.renamed.length > 0 && <span>Renamed: {diff.renamed.map((r) => `${r.from} → ${r.to}`).join('; ')}.</span>}
        {diff.added.length > 0 && <span>New: {diff.added.map((a) => a.name).join(', ')}.</span>}
        {diff.removed.length > 0 && <span className="q">No longer in the plan: {diff.removed.map((a) => a.name).join(', ')}. Their history stays.</span>}
        {diff.newFlags.length > 0 && <span>New checks: {diff.newFlags.map((f) => f.label).join('; ')}.</span>}
      </div>

      <div className="t13 q lh">Your current plan is kept: Undo import in Settings puts it back for {UNDO_DAYS} days.</div>
      <button type="button" className="btn ghost block" onClick={() => void saveBackup()}>
        Save a backup file too
      </button>
      <button
        type="button"
        className="btn lg block"
        onClick={async () => {
          const resets = diff.loads.filter((c) => c.forced || !skipReset.has(c.id)).map((c) => c.id);
          await patchSettings((s) => applyImport(s, plan, { resets, start: startAt, at: Date.now() }));
          await bump('plan-import');
          onClose();
          toast({ text: `${plan.name} is your plan now. Next: ${name(startAt)}.` });
        }}
      >
        Use this plan
      </button>
    </Sheet>
  );
}
