import { useRef, useState } from 'react';
import { scheduleDing, unlockAudio } from '../audio';
import { bump, patchSettings } from '../db/actions';
import { useSettings } from '../db/hooks';
import { takeSnapshot } from '../db/snapshots';
import { fmtDayMonth } from '../domain/format';
import { fmtKg, loadOptions } from '../domain/loads';
import { upgradePlan, validatePlan, type PlanDef } from '../domain/plan';
import { undoImport, undoOnOffer } from '../domain/planImport';
import { prefOn, type Settings } from '../domain/types';
import { go } from '../router';
import { askConfirm } from '../ui/Confirm';
import { DecField, IntField, LinkRow, SwitchRow } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { PlanImportSheet } from './PlanImportSheet';

/** Everything about how a session runs. Opens from Train and from Settings. */
export function SessionSettingsSheet() {
  const settings = useSettings();
  const toast = useToast();
  const planInput = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<PlanDef>();
  const [plating, setPlating] = useState(false);
  if (!settings) return <Sheet title="Session settings">{null}</Sheet>;
  const p = settings.prefs;
  const plates = settings.equipment.plates;
  const undo = undoOnOffer(settings);
  const setPref = (k: keyof Settings['prefs'], v: boolean) => patchSettings((s) => ({ prefs: { ...s.prefs, [k]: v } }));
  const pickPlan = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const next = (data.format === 'health-plan' ? data : data.plan) as PlanDef;
      const errs = validatePlan(next);
      if (errs.length) throw new Error(`This plan has problems: ${errs.slice(0, 2).join(' ')}`);
      await takeSnapshot('before', 'Before importing a plan');
      setPlan(upgradePlan(next));
    } catch (e) {
      toast({ text: e instanceof SyntaxError ? "That file isn't a plan: it couldn't be read." : (e as Error).message });
    }
  };
  return (
    <Sheet title="Session settings" tall>
      <div className="list yu-set-page">
        <LinkRow
          title="Plan"
          sub={settings.plan ? `${settings.plan.sessions.length} sessions · ${settings.plan.flags.length} joint checks` : 'None yet'}
          value={settings.plan ? `${settings.plan.name}, from ${fmtDayMonth(settings.plan.from)}` : 'Import'}
          onClick={() => (settings.plan ? go('/plan') : planInput.current?.click())}
        />
        {settings.plan && (
          <button type="button" className="li q" onClick={() => planInput.current?.click()}>
            Import a plan from a file
          </button>
        )}
        {undo && (
          <button
            type="button"
            className="li q"
            onClick={async () => {
              const ok = await askConfirm({ title: `Undo importing “${undo.name}”?`, body: `${undo.plan ? `“${undo.plan.name}” comes back` : 'The plan is removed'}, with its variants and where the loop stood. Sessions logged since stay.`, yes: 'Undo import' });
              const back = ok && undoImport(settings);
              if (!back) return;
              await patchSettings(back);
              toast({ text: undo.plan ? `${undo.plan.name} is your plan again` : 'Import undone' });
            }}
          >
            Undo import of {undo.name}
          </button>
        )}
        <input ref={planInput} type="file" accept="application/json,.json" hidden onChange={(e) => (pickPlan(e.target.files?.[0]), (e.target.value = ''))} />
        {plates.map((pl) => (
          <SwitchRow
            key={pl.kg}
            title={`${fmtKg(pl.kg)} kg plates × ${pl.count}`}
            sub={pl.owned ? undefined : 'Switch on when they arrive. Suggested loads then use them.'}
            checked={pl.owned}
            onChange={(v) => {
              void patchSettings((s) => ({ equipment: { ...s.equipment, plates: s.equipment.plates.map((x) => (x.kg === pl.kg ? { ...x, owned: v } : x)) } }));
              if (v) void bump('plates-on');
            }}
          />
        ))}
        <LinkRow
          title="Plates and dumbbells"
          sub={
            plates.length
              ? `Pairs: ${loadOptions(settings.equipment, 'pair').map(fmtKg).join(', ')} kg · one dumbbell: ${loadOptions(settings.equipment, 'single').map(fmtKg).join(', ')} kg`
              : 'Tell Health what you have, and it suggests loads you can actually make.'
          }
          onClick={() => setPlating(true)}
        />
        <SwitchRow title="Resistance band" checked={settings.equipment.band} onChange={(v) => patchSettings((s) => ({ equipment: { ...s.equipment, band: v } }))} />
        <SwitchRow title="Soft ding when rest ends" sub="Plays in your headphones over your music" checked={p.ding} onChange={(v) => setPref('ding', v)} />
        <button
          type="button"
          className="li"
          onClick={() => {
            unlockAudio();
            scheduleDing(0.05);
          }}
        >
          <span className="s">
            <span>Test the ding</span>
            <small>Play music first, then tap: it should sound over it</small>
          </span>
          <Icon name="play" size={18} stroke={1.8} color="var(--quiet)" />
        </button>
        <SwitchRow title="Keep the screen on during sessions" sub="So the timer and ding stay on time" checked={p.wakeLock} onChange={(v) => setPref('wakeLock', v)} />
        <SwitchRow title="Buzz on records" checked={p.buzz} onChange={(v) => setPref('buzz', v)} />
        <SwitchRow title="Tempo coach" sub="A Coach button on slow-lowering sets: the phone buzzes 3 seconds down, 1 up" checked={prefOn(p, 'tempoCoach')} onChange={(v) => setPref('tempoCoach', v)} />
      </div>
      {plating && <PlatesEditor settings={settings} onClose={() => setPlating(false)} />}
      {plan && <PlanImportSheet plan={plan} settings={settings} onClose={() => setPlan(undefined)} />}
    </Sheet>
  );
}

function PlatesEditor({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const [plates, setPlates] = useState(settings.equipment.plates.map((p) => ({ ...p })));
  const [fixed, setFixed] = useState(settings.equipment.fixed.join(', '));
  const [sleeve, setSleeve] = useState<number | undefined>(settings.equipment.sleeveMm);
  const eq = { ...settings.equipment, plates, fixed: parseList(fixed), sleeveMm: sleeve };
  return (
    <Sheet title="Plates and dumbbells" sub="Loads are per dumbbell. Plates go on in matching pairs." onClose={onClose} tall>
      {plates.map((p, i) => (
        <div key={i} className="col gap6">
        <div className="grid3" style={{ alignItems: 'end' }}>
          <label className="flabel">
            <span className="lbl">Plate kg</span>
            <DecField value={p.kg} onChange={(v) => setPlates(plates.map((x, j) => (j === i ? { ...x, kg: v ?? 0 } : x)))} />
          </label>
          <label className="flabel">
            <span className="lbl">How many</span>
            <IntField value={p.count} onChange={(v) => setPlates(plates.map((x, j) => (j === i ? { ...x, count: v ?? 0 } : x)))} />
          </label>
          <label className="row" style={{ height: 48, gap: 8 }}>
            <span className="t14">Have them</span>
            <input type="checkbox" className="sw" checked={p.owned} onChange={(e) => setPlates(plates.map((x, j) => (j === i ? { ...x, owned: e.target.checked } : x)))} />
          </label>
        </div>
          <label className="flabel">
            <span className="lbl">Width of one plate, mm (optional)</span>
            <DecField value={p.thicknessMm} onChange={(v) => setPlates(plates.map((x, j) => (j === i ? { ...x, thicknessMm: v || undefined } : x)))} placeholder="e.g. 30 for PVC, 18 for cast iron" />
          </label>
        </div>
      ))}
      <button type="button" className="link" onClick={() => setPlates([...plates, { kg: 2.5, count: 4, owned: true }])}>
        + Add a plate size
      </button>
      <label className="flabel">
        <span className="lbl">Handle sleeve, mm each side (optional)</span>
        <DecField value={sleeve} onChange={(v) => setSleeve(v || undefined)} placeholder="Collar to the end of the handle" />
        <span className="t13 q lh">With plate widths and this set, loads only count when the plates fit on the handle.</span>
      </label>
      <label className="flabel">
        <span className="lbl">Fixed dumbbells, kg each</span>
        <input className="field" value={fixed} onChange={(e) => setFixed(e.target.value)} placeholder="e.g. 1, 2.5, 5" />
      </label>
      <div className="t13 q lh">
        Pairs you can make: {loadOptions(eq, 'pair').map(fmtKg).join(', ') || 'none'} kg. One dumbbell: {loadOptions(eq, 'single').map(fmtKg).join(', ') || 'none'} kg.
      </div>
      <button
        type="button"
        className="btn lg block"
        onClick={async () => {
          await patchSettings((s) => ({ equipment: { ...s.equipment, plates: plates.filter((p) => p.kg > 0 && p.count > 0), fixed: parseList(fixed), sleeveMm: sleeve } }));
          onClose();
        }}
      >
        Save
      </button>
    </Sheet>
  );
}

function parseList(s: string): number[] {
  return s
    .split(/[,\s]+/)
    .map((x) => parseFloat(x))
    .filter((x) => Number.isFinite(x) && x > 0);
}

