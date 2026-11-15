// The ground, sealed: only what exists, plus the next project's name and a teasing line.
import { BUNDLES, capacityOf, homeGround, isOpen, isShut, PLACES, type BundleDef, type Need } from '../../../football/ground';
import { euros } from '../../../football/money';
import type { Club } from '../../../football/store/club';
import type { FbBundle } from '../../../football/store/tables';
import { useModel } from '../tree/model';
import { ProjectList } from '../tree/TreeScreens';
import { Action, Hero, Panel, Sect } from '../../../ui/kit/Kit';
import { Icon } from '../../../ui/Icon';
import { Bar, Note, PanelTop } from './Bits';
import { Kaai, kaaiStage } from './Kaai';

const NEED: Record<Need, string> = {
  steps: 'days at the step goal', training: 'training sessions', sleep: 'nights at the sleep target', protein: 'days at the protein target',
  bedtime: 'nights near your usual bedtime', meds: 'days with every medicine kept', kcal: 'days inside the calorie range', youth: 'days on youth habits', none: '',
};

const STAGE_NAME = ['Works team', 'Town club', 'City club'];
/** The side buildings a bigger stage is drawn with, for the picture of a stage you have not reached. */
const SIDES = ['river-end', 'crane-stand', 'dock-end'];
const STAGE_LINE = ['One stand, two floodlights.', 'A second tier, the café and the club shop either side.', 'A roof, the lit entrance, the quay wall in club purple.'];

/** The ground (board two, "The ground"; "The Kaai grows with the club"): the Kaai on top, what is being built and what
 * makes each one grow, then how the Kaai grows with the club. */
export function GroundView({ c, onMove }: { c: Club; onMove?: (on: boolean) => void }) {
  const s = c.save;
  const states = new Map((c.bundles ?? []).map((b) => [b.id, b]));
  const done = [...states.values()].filter((b) => b.done).map((b) => b.id);
  const g = { tier: c.tier, moved: Boolean(s.moved), done, budget: s.budget };
  const open = BUNDLES.filter((b) => isOpen(b, g));
  const sealed = BUNDLES.find((b) => !done.includes(b.id) && !isOpen(b, g));
  const built = BUNDLES.filter((b) => done.includes(b.id));
  /** The one project list, shared with the tree's Projects page. */
  const tree = useModel();
  const building = tree ? tree.projectsOpen.filter((p) => !tree.states.get(p.id)?.done).length : open.length;
  const stage = kaaiStage(c.tier);
  const canMove = !s.moved && done.includes('kaai-stand');
  return (
    <div className="k-page">
      <div className="kg-kaai"><Kaai tier={c.tier} done={done} height={110} /></div>
      <div className="kb-lead">
        <Hero value={building} ink="#ff9a76" label="being built" />
        <span className="k-r k-q">{s.moved ? `${homeGround(true)} · holds ${capacityOf(true, done).toLocaleString('en-GB')}` : `Tenants at ${homeGround(false)}`}</span>
      </div>
      {!s.moved && <Note>Zurenborg Athletic’s ground. They keep the good dressing room.</Note>}
      {canMove && (s.moveAtBreak
        ? <Panel ink="#8fdcb6" flat><Icon name="check" size={24} color="#8fdcb6" /><span style={{ flex: 1 }}><b>Moving to Kaai 42 at the next break</b></span><Action quiet sm onClick={() => onMove?.(false)}>Stay</Action></Panel>
        : <Action wide onClick={() => onMove?.(true)}>Move to Kaai 42 at the next break</Action>)}
      {tree ? <ProjectList m={tree} /> : (
        <>
          {open.length > 0 && <Sect>Building now</Sect>}
          <div className="kb-rows">{open.map((b) => <Bundle key={b.id} b={b} st={states.get(b.id)} budget={s.budget} />)}</div>
          {sealed && <Panel ink="#a9a7b8"><PanelTop name={`Next · ${sealed.name}`} c="#c4c1cf" right="sealed" /><span className="k-q">“{sealed.tease}”</span></Panel>}
        </>
      )}
      <Note>A die on the desk’s project job adds to one of these. Day totals only, never when you logged.</Note>
      {built.length > 0 && (
        <>
          <Sect>Built</Sect>
          <div className="kb-rows">
            {built.map((b) => (
              <Panel key={b.id} ink="#f2c46d">
                <PanelTop name={b.name} c="#f2c46d" right={isShut(b, states.get(b.id)?.done, c.today ?? '') ? 'shut while it’s built' : undefined} />
                <span className="k-q">{b.effect}</span>
              </Panel>
            ))}
          </div>
        </>
      )}
      <h2 className="k-sect kg-big">How the Kaai grows</h2>
      {([1, 2, 3] as const).map((k) => (
        <div key={k} className={`kg-stage${k === stage ? ' now' : ''}`}>
          <h3 className="k-sect kg-sh">{k === stage ? `Now · ${STAGE_NAME[k - 1]}` : STAGE_NAME[k - 1]}</h3>
          <div className="kg-kaai"><Kaai tier={c.tier} done={k === stage ? done : k === 1 ? [] : SIDES} stage={k} height={92} /></div>
          <span className="k-q">{STAGE_LINE[k - 1]}</span>
        </div>
      ))}
      <Note>Each building you finish is added to the picture at the top of Club, and each step up in standing redraws it larger.</Note>
    </div>
  );
}

function Bundle({ b, st, budget }: { b: BundleDef; st?: FbBundle; budget: number }) {
  return (
    <Panel ink="#ff9a76">
      <PanelTop name={b.name} c="#ff9a76" right={`${euros(Math.min(budget, b.money))} of ${euros(b.money)}`} />
      {b.needs.filter((n) => n.what !== 'none').map((n) => {
        const have = st?.progress[n.what] ?? 0;
        return (
          <div key={n.what} className="k-col" style={{ gap: 3 }}>
            <Bar pct={(have / n.count) * 100} c="#ff9a76" label={`${have} of ${n.count}`} />
            <span className="k-q">Grows on {NEED[n.what]} · {have} of {n.count}</span>
          </div>
        );
      })}
      <span>{b.effect}{b.downtime ? ` Shuts for ${b.downtime} days to build.` : ''}</span>
    </Panel>
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
