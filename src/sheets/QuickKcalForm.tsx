import { useState } from 'react';
import { fmtInt } from '../domain/format';
import { QUICK_PROTEIN_KCAL } from '../domain/foodChecks';
import { DecField } from '../ui/controls';

export type QuickKcal = { name: string; kcal: number; protein: number | 'unknown' };

/** A nameless quick entry is logged as "Quick kcal". */
export const quickName = (name: string) => name.trim() || 'Quick kcal';

/**
 * Quick kcal as it really is (board 4 `f4-half`): a name if you want one, kcal and protein, "Protein not known",
 * and Add once. Logged once; never saved as a food or a meal. No router here, so it renders statically.
 */
export function QuickKcalForm({ onAdd, autoFocus }: { onAdd: (q: QuickKcal) => void; autoFocus?: boolean }) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState<number | undefined>();
  const [protein, setProtein] = useState<number | undefined>();
  const [unknown, setUnknown] = useState(false);
  const ready = (kcal ?? 0) > 0 && (unknown || protein !== undefined);
  const bigNoProtein = !unknown && protein === 0 && (kcal ?? 0) > QUICK_PROTEIN_KCAL;
  const add = () => {
    if (!ready) return;
    onAdd({ name: quickName(name), kcal: Math.round(kcal!), protein: unknown ? 'unknown' : protein! });
    setName('');
    setKcal(undefined);
    setProtein(undefined);
    setUnknown(false);
  };
  return (
    <section className="k-panel af-quick" aria-labelledby="af-quick-h">
      <h3 id="af-quick-h" className="af-qh">Quick kcal</h3>
      <p className="k-q af-qline">For a one-off: logged once, never saved as a food or a meal.</p>
      <label className="flabel">
        <span className="lbl">Name (optional)</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office samosa" spellCheck autoCapitalize="sentences" />
      </label>
      <div className="af-qnums">
        <label className="flabel">
          <span className="lbl apri">Kcal</span>
          <DecField value={kcal} onChange={setKcal} placeholder="0" autoFocus={autoFocus} />
        </label>
        <label className="flabel">
          <span className="lbl lav">Protein g</span>
          {unknown ? <span className="field af-qnone">Not known</span> : <DecField value={protein} onChange={setProtein} placeholder="0" />}
        </label>
      </div>
      {bigNoProtein && (
        <div className="notice t14 lh" role="status">
          0 g for {fmtInt(kcal!)} kcal? Most meals that size have some. “Protein not known” keeps the protein count honest instead of counting zero.
        </div>
      )}
      <div className="af-qacts">
        <button type="button" className={`chip af-qunk${unknown ? ' on' : ''}`} aria-pressed={unknown} onClick={() => setUnknown(!unknown)}>Protein not known</button>
        <button type="button" className="k-act grow" disabled={!ready} onClick={add}>Add once</button>
      </div>
    </section>
  );
}
