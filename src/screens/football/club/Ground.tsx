// The ground, sealed: only what exists, plus the next project's name and a teasing line.
import { BUNDLES, capacityOf, homeGround, isOpen, isShut, PLACES, type BundleDef, type Need } from '../../../football/ground';
import { euros } from '../../../football/money';
import type { Club } from '../../../football/store/club';
import type { FbBundle } from '../../../football/store/tables';
import { useModel } from '../tree/model';
import { Skyline } from '../tree/Skyline';
import { ProjectList } from '../tree/TreeScreens';

const NEED: Record<Need, string> = {
  steps: 'days at the step goal', training: 'training sessions', sleep: 'nights at the sleep target', protein: 'days at the protein target',
  bedtime: 'nights near your usual bedtime', meds: 'days with every medicine kept', kcal: 'days inside the calorie range', youth: 'days on youth habits', none: '',
};

export function GroundView({ c, onMove }: { c: Club; onMove?: (on: boolean) => void }) {
  const s = c.save;
  const states = new Map((c.bundles ?? []).map((b) => [b.id, b]));
  const done = [...states.values()].filter((b) => b.done).map((b) => b.id);
  const g = { tier: c.tier, moved: Boolean(s.moved), done, budget: s.budget };
  const open = BUNDLES.filter((b) => isOpen(b, g));
  const sealed = BUNDLES.find((b) => !done.includes(b.id) && !isOpen(b, g));
  const built = BUNDLES.filter((b) => done.includes(b.id));
  /** The one Kaai skyline and project list, shared with the tree's Projects page. */
  const tree = useModel();
  return (
    <>
      <section className="fb-card hot" aria-label="Home ground">
        <span className="fb-lb">{s.moved ? 'Home' : 'Tenants'}</span>
        <b className="fb-t">{homeGround(Boolean(s.moved))}</b>
        <span className="fb-s">{s.moved ? `Capacity ${capacityOf(true, done).toLocaleString('en-GB')}.` : 'Zurenborg Athletic’s ground. They keep the good dressing room.'}</span>
        {!s.moved && done.includes('kaai-stand') && (
          <button type="button" className={`fb-btn sm${s.moveAtBreak ? ' pri' : ''}`} aria-pressed={Boolean(s.moveAtBreak)} onClick={() => onMove?.(!s.moveAtBreak)}>
            {s.moveAtBreak ? '✓ Moving at the next break' : 'Move to Kaai 42 at the next break'}
          </button>
        )}
      </section>
      {tree ? (
        <>
          <Skyline places={tree.places} progress={tree.progress} />
          <ProjectList m={tree} />
        </>
      ) : (
        <>
          <Quarter done={done} states={states} />
          {open.length > 0 && <h2 className="fb-t">Building now</h2>}
          {open.map((b) => <Bundle key={b.id} b={b} st={states.get(b.id)} budget={s.budget} />)}
        </>
      )}
      {!tree && sealed && (
        <section className="fb-card fb-sealed" aria-label="Sealed">
          <span className="fb-lb">Next · sealed</span>
          <b>{sealed.name}</b>
          <span className="fb-s">“{sealed.tease}”</span>
        </section>
      )}
      {built.length > 0 && (
        <section className="fb-card" aria-label="Built">
          <span className="fb-lb">Built</span>
          {built.map((b) => (
            <div key={b.id} className="fb-col">
              <b>{b.name}{isShut(b, states.get(b.id)?.done, c.today ?? '') ? ' · shut while it’s built' : ''}</b>
              <span className="fb-s">{b.effect}</span>
            </div>
          ))}
        </section>
      )}
      <p className="fb-s">Bundles count day and week totals only, never when you logged. None of it is required.</p>
    </>
  );
}

function Bundle({ b, st, budget }: { b: BundleDef; st?: FbBundle; budget: number }) {
  return (
    <section className="fb-card" aria-label={b.name}>
      <b>{b.name}</b>
      {b.needs.filter((n) => n.what !== 'none').map((n) => {
        const have = st?.progress[n.what] ?? 0;
        return (
          <div key={n.what} className="fb-col">
            <div className="fb-row"><span className="fb-s">{n.count} {NEED[n.what]}</span><b className="fb-num">{have} / {n.count}</b></div>
            <div className="fb-tiles" role="img" aria-label={`${have} of ${n.count}`}>
              {Array.from({ length: Math.min(n.count, 30) }, (_, i) => <i key={i} className={i < Math.round((have / n.count) * Math.min(n.count, 30)) ? 'f' : undefined} />)}
            </div>
          </div>
        );
      })}
      <div className="fb-row"><span className="fb-s">Money</span><b className="fb-num">{euros(Math.min(budget, b.money))} / {euros(b.money)}</b></div>
      <span className="fb-s">{b.effect}{b.downtime ? ` Shuts for ${b.downtime} days to build.` : ''}</span>
    </section>
  );
}

/** The Kaai quarter, top down: built places glow, unbuilt ones are dashed. */
export function Quarter({ done, states }: { done: string[]; states: Map<string, FbBundle> }) {
  const level = (p: string) => BUNDLES.filter((b) => b.place === p && done.includes(b.id)).length;
  const max = (p: string) => BUNDLES.filter((b) => b.place === p).length;
  void states;
  return (
    <section className="fb-card pu" aria-label="The Kaai quarter">
      <div className="fb-row"><span className="fb-lb">The Kaai quarter</span><span className="fb-s">{PLACES.length} places</span></div>
      <svg className="fb-qmap" viewBox="0 0 360 220" aria-hidden="true">
        <path d="M0 176 Q90 162 180 180 T360 172" className="rv" />
        <path d="M0 190 Q90 176 180 194 T360 186" className="rv b" />
        <path d="M20 154 H340" className="rk" />
        {PLACES.map((p, i) => (
          <g key={p.id} transform={`translate(${p.x} ${p.y})`} className={`qp${level(p.id) ? ' on' : ''}`}>
            <rect x="-17" y="-17" width="34" height="34" rx={p.id === 'cafe' || p.id === 'ferry' ? 17 : 6} />
            <text y="6">{i + 1}</text>
          </g>
        ))}
      </svg>
      <ol className="fb-qlist">
        {PLACES.map((p, i) => (
          <li key={p.id} className="fb-row">
            <span><b className="fb-num">{i + 1}</b> {p.name}</span>
            <span className="fb-s">{level(p.id) ? `stage ${level(p.id)} of ${max(p.id)}` : 'not built'}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
