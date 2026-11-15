// The tree's screens (rounds six to eight, as pinned): the tree in six eras, a tech, a eureka, entering a new era,
// projects on the Kaai skyline, the staff room and the board. Words in Atkinson Hyperlegible Next, numbers and titles
// in Fraunces. Every state has a word beside its colour or line.
import type { CSSProperties, ReactNode } from 'react';
import { ERAS, TECHS } from '../../../football/content/tree';
import { BOARD } from '../../../football/content/season';
import { PROJECTS } from '../../../football/content/projects';
import { WAGE_UNIT, wage } from '../../../football/content/money';
import type { EraId, TechDef } from '../../../football/content/types';
import { euros } from '../../../football/money';
import { clearTarget, researchTech, seeEra, seeEureka } from '../../../football/store/treeActions';
import { techState } from '../../../football/tree/research';
import { objectiveLine } from '../../../football/tree/season';
import { fmtCount, METRIC_WORDS, ROMAN } from '../../../football/tree/words';
import { go } from '../../../router';
import { useHeaded } from '../FootballHome';
import { useModel, type Model } from './model';
import { Skyline } from './Skyline';
import { Crest, GlassCard, SimpleBack, Viewable, type CardView } from '../../../ui/CardViewer';
import { Action, Door, Doors, Hero, Panel, Sect, Title } from '../../../ui/kit/Kit';
import { Icon, type IconName } from '../../../ui/Icon';
import { Bar, MarkRow, Note, PanelTop, Stat } from '../club/Bits';

const eraOf = (id: EraId) => ERAS.find((e) => e.id === id)!;
const col = (c: string) => ({ ['--c' as string]: c }) as CSSProperties;

type Era = (typeof ERAS)[number];
/** An era seal full screen: a crest in the era's colour; its name and story on the back. */
export function sealView(era: Era, k: number, state: string): CardView {
  return { face: <GlassCard ink={era.colour} tier="gold"><Crest /></GlassCard>, back: <SimpleBack kicker={`Era ${ROMAN[k]} · ${state}`} title={era.name} lines={[era.intro]} />, label: `Era ${ROMAN[k]}: ${era.name}, ${state.toLowerCase()}` };
}
/** A staff card full screen. */
export function staffView(name: string, text: string, era: Era, from: string): CardView {
  return { face: <GlassCard ink={era.colour} tier="silver"><Crest /></GlassCard>, back: <SimpleBack kicker={from} title={name} lines={[text]} />, label: `${name}, staff` };
}

/** An older page's own way back. Inside Football's page header (navigation A) the header carries it instead. */
export function Back({ to, label, params }: { to: string; label: string; params?: Record<string, string> }) {
  const headed = useHeaded();
  if (headed) return null;
  return <button type="button" className="fbt-back" onClick={() => go(to, params, { replace: true })}>‹ {label}</button>;
}
export function TreePage({ children }: { children: ReactNode }) {
  return <div className="fbt-page">{children}</div>;
}

/** Each tech's small picture (board three, "The tree, with small pictures"). */
const TECH_ICON: Record<string, IconName> = {
  's-442': 'sheet', 's-captains': 'shield', 's-portakabin': 'office', 's-kitsponsor': 'money', 's-kitman': 'kit', 's-teahut': 'food', 's-fiveaside': 'people', 's-programme': 'book',
  'p-4231': 'sheet', 'p-physio': 'joint', 'p-sleepcoach': 'sleep', 'p-weeklytrials': 'calendar', 'p-meals': 'food', 'p-physioroom': 'body', 'p-minibus': 'route', 'p-scarf': 'kit',
  'r-352': 'sheet', 'r-sportsscience': 'stopwatch', 'r-commercial': 'money', 'r-kaai42': 'ground', 'r-videoroom': 'camera', 'r-academy': 'people', 'r-setpieces': 'bolt', 'r-pressoffice': 'phone',
  't-433': 'sheet', 't-datateam': 'trend', 't-mediadeals': 'money', 't-secondtiers': 'ground', 't-rotation': 'swap', 't-pool': 'water', 't-band': 'shield', 't-bignights': 'night',
  'n-gegenpress': 'sheet', 'n-tour': 'map', 'n-globalscouting': 'scope', 'n-museum': 'book', 'n-testimonials': 'win', 'n-fanclubs': 'people', 'n-classickit': 'kit', 'n-sponsorabroad': 'money',
  'c-falsenine': 'sheet', 'c-foreignscouts': 'scope', 'c-abroadloans': 'deal', 'c-twofronts': 'swap', 'c-charter': 'route', 'c-loanmanager': 'deal', 'c-europeannights': 'night', 'c-squaddepth': 'list',
};
const techIcon = (t: TechDef): IconName => TECH_ICON[t.id] ?? (t.effects.some((e) => e.kind === 'staff') ? 'people' : t.effects.some((e) => e.kind === 'project') ? 'ground' : 'tree');
const TREE_INK = '#c2b2ff';

/** The tree, inside the Club page (board three): research and the era lead, then each era drawn as techs with lines between. */
export function TreeHome() {
  const m = useModel();
  if (!m) return null;
  const now = eraOf(m.era);
  const k = ERAS.indexOf(now);
  const nextEra = ERAS[k + 1];
  const doneNow = TECHS.filter((t) => t.era === now.id && m.researched.includes(t.id)).length;
  const target = m.user.target ? TECHS.find((x) => x.id === m.user.target) : undefined;
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={fmtCount(m.bank)} ink={TREE_INK} label="research" />
        <span className="k-r"><b>{now.name}</b><span className="k-q">{doneNow} of 8{nextEra ? ` · then ${nextEra.name}` : ''}</span></span>
      </div>
      <Bar pct={(doneNow / 8) * 100} c={TREE_INK} label={`${doneNow} of 8 researched in ${now.name}`} />
      <Waiting m={m} />
      {target && (
        <Panel ink="#f2c46d">
          <PanelTop name={`Saving for ${target.name}`} c="#f2c46d" right={`${fmtCount(m.bank)} of ${m.cost(target.id)}`} />
          <Bar pct={(m.bank / Math.max(1, m.cost(target.id))) * 100} c="#f2c46d" />
          <span className="k-q">It is researched by itself once the bank covers it.</span>
          <Action quiet sm onClick={() => void clearTarget()}>Stop saving for it</Action>
        </Panel>
      )}
      {ERAS.map((e, i) => <Era key={e.id} m={m} id={e.id} n={i} />)}
      <Note>Every tech has its own small picture. Filled is done, gold is within reach. Tap any to read it.</Note>
      <Sect>Around the tree</Sect>
      <Doors two label="The tree's rooms">
        <Door icon="ground" name="Projects" value={m.projectsOpen.length ? `${m.projectsOpen.length} building` : 'Kaai quarter'} ink="#ffd56a" onClick={() => go('/football/projects')} />
        <Door icon="people" name="Staff room" value={`${m.staff.filter((x) => x.hired).length} hired`} ink="#8fdcb6" onClick={() => go('/football/staff')} />
        <Door icon="sheet" name="The board" value="Two goals" ink="#93c3dc" onClick={() => go('/football/board')} />
        <Door icon="pack" name="Packs" value={m.packsWaiting.length ? `${m.packsWaiting.length} to open` : 'The album'} ink="#ff9a76" onClick={() => go('/football/packs')} />
      </Doors>
    </div>
  );
}

/** What's waiting: a new era, eurekas, a boon pick, packs. Each a tappable panel. */
function Waiting({ m }: { m: Model }) {
  const items: ReactNode[] = [];
  for (const e of m.erasUnseen) items.push(<Banner key={e} c={eraOf(e).colour} title={`Era ${ROMAN[ERAS.indexOf(eraOf(e))]} · ${eraOf(e).name}`} line="A new era is open." onClick={() => go('/football/era', { e })} />);
  for (const id of m.eurekasUnseen.slice(0, 2)) {
    const t = TECHS.find((x) => x.id === id)!;
    items.push(<Banner key={id} c="#ffe27a" title={`Eureka · ${t.name}`} line="It costs half now." onClick={() => go('/football/eureka', { id })} />);
  }
  if (m.boonPick) items.push(<Banner key="boon" c="#8fdcb6" title="Pick a boon for this season" line={`Boon ${m.boonPick > 3 ? 'extra' : `${m.boonPick} of 3`}`} onClick={() => go('/football/boon')} />);
  if (m.packsWaiting.length) items.push(<Banner key="packs" c="#ff9a76" title={m.packsWaiting.length === 1 ? 'A pack to open' : `${m.packsWaiting.length} packs to open`} line="Five things inside each." onClick={() => go('/football/packs')} />);
  return items.length ? <div className="kb-rows">{items}</div> : null;
}
function Banner({ c, title, line, onClick }: { c: string; title: string; line: string; onClick: () => void }) {
  return <Panel ink={c} onClick={onClick}><b style={{ color: c }}>{title}</b><span className="k-q">{line}</span></Panel>;
}

/** Rows of three, two, three (the drawing's shape), ordered by how deep each tech sits inside its era. */
function layout(techs: TechDef[]): { t: TechDef; x: number; row: number }[] {
  const ids = new Set(techs.map((t) => t.id));
  const depth = new Map<string, number>();
  const d = (t: TechDef): number => {
    if (depth.has(t.id)) return depth.get(t.id)!;
    const ins = t.prereqs.filter((p) => ids.has(p)).map((p) => techs.find((x) => x.id === p)!);
    const v = ins.length ? 1 + Math.max(...ins.map(d)) : 0;
    depth.set(t.id, v);
    return v;
  };
  const order = [...techs].sort((a, b) => d(a) - d(b));
  const shape = [3, 2, 3, 3, 3];
  const out: { t: TechDef; x: number; row: number }[] = [];
  const xOf = new Map<string, number>();
  const left = [...order];
  for (let row = 0; left.length; row++) {
    // A row takes only techs whose prerequisites sit in rows above it, so every line runs downwards.
    const ready = left.filter((t) => t.prereqs.every((p) => !ids.has(p) || xOf.has(p)));
    const take = (ready.length ? ready : left).slice(0, shape[row] ?? 3);
    const n = take.length;
    // Within a row, each tech sits under the parents it comes from, so the lines cross as little as they can.
    const here = take.map((t, k) => {
      const px = t.prereqs.map((p) => xOf.get(p)).filter((v): v is number => v !== undefined);
      return { t, k: px.length ? px.reduce((a, b) => a + b, 0) / px.length : 50 + k };
    }).sort((a, b) => a.k - b.k);
    here.forEach(({ t }, j) => {
      const x = n === 1 ? 50 : n === 2 ? 33.3 + j * 33.4 : 16.7 + j * 33.3;
      xOf.set(t.id, x);
      out.push({ t, row, x });
      left.splice(left.indexOf(t), 1);
    });
  }
  return out;
}
const ROW_H = 116;
/** Lines leave from under a tech's name and arrive at the top of the next one's box. */
const LINE_FROM = 84;

type Spot = { t: TechDef; x: number; row: number };
/** A line from a tech to one that needs it. One that skips rows first drops straight down through the gap between
 * the techs in the rows it passes (rows alternate three and two across, so the parent's own column is a gap), and only
 * curves across in the last stretch, so it never runs through another tech or its name. */
function linkPath(a: Spot, b: Spot, spots: Spot[]): string {
  const y1 = a.row * ROW_H + LINE_FROM, y2 = b.row * ROW_H - 2;
  const between = spots.filter((s) => s.row > a.row && s.row < b.row);
  const clear = between.every((s) => Math.abs(s.x - a.x) > 10);
  const yc = clear && b.row - a.row > 1 ? (b.row - 1) * ROW_H + LINE_FROM : y1;
  const my = (yc + y2) / 2;
  return `M${a.x} ${y1}${yc > y1 ? ` L${a.x} ${yc}` : ''} C${a.x} ${my} ${b.x} ${my} ${b.x} ${y2}`;
}

function Era({ m, id, n }: { m: Model; id: EraId; n: number }) {
  const e = eraOf(id);
  const open = m.eras.includes(id);
  const techs = TECHS.filter((t) => t.era === id);
  const done = techs.filter((t) => m.researched.includes(t.id)).length;
  const spots = layout(techs);
  const rows = Math.max(...spots.map((s) => s.row)) + 1;
  const h = rows * ROW_H - 16;
  const at = new Map(spots.map((s) => [s.t.id, s]));
  const links = spots.flatMap((s) => s.t.prereqs.filter((p) => at.has(p)).map((p) => ({ a: at.get(p)!, b: s })));
  return (
    <section className={`kt-era${open ? '' : ' kt-sealed'}`} style={{ ['--ink' as string]: e.colour }} aria-label={`Era ${ROMAN[n]}: ${e.name}, ${done} of 8 researched${open ? '' : ', not open yet'}`}>
      <Sect>Era {ROMAN[n]}</Sect>
      <div className="kt-erah"><b>{e.name}</b><span className="k-q">{open ? `${done} of 8 · ${e.cost} each` : 'Opens after six of the era before'}</span></div>
      <div className="kt-tree" style={{ height: h }}>
        <svg className="kt-lines" viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" aria-hidden="true">
          {links.map(({ a, b }) => {
            const lit = m.researched.includes(a.t.id) && techState(b.t, m.researched) !== 'locked' && techState(b.t, m.researched) !== 'sealed';
            return <path key={`${a.t.id}-${b.t.id}`} d={linkPath(a, b, spots)} stroke={lit ? TREE_INK : 'rgba(237,230,218,.2)'} />;
          })}
        </svg>
        {spots.map(({ t, x, row }) => {
          const st = techState(t, m.researched);
          const eu = m.eurekas.includes(t.id) && st !== 'done';
          const rs = m.user.target === t.id;
          const word = st === 'done' ? 'done' : rs ? 'saving for it' : eu ? 'eureka, half price' : st === 'open' ? 'open' : 'not yet';
          return (
            <button key={t.id} type="button" className={`kt-node ${st === 'done' ? 'dn' : st === 'open' ? 'op' : 'lk'}${rs ? ' rs' : ''}`} style={{ left: `${x}%`, top: row * ROW_H }} onClick={() => go('/football/tech', { id: t.id })} aria-label={`${t.name}: ${word}`}>
              <i><Icon name={techIcon(t)} size={30} stroke={1.9} />{eu && <em>½</em>}</i>
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** One tech (no drawing; on the kit): its picture and era lead, what it does, its cost, and research it or save for it. */
export function TechPage({ id }: { id: string }) {
  const m = useModel();
  if (!m) return null;
  const t = TECHS.find((x) => x.id === id);
  if (!t) return null;
  const st = techState(t, m.researched);
  const e = eraOf(t.era);
  const cost = m.cost(t.id);
  const eu = m.eurekas.includes(t.id);
  const pre = t.prereqs.map((p) => TECHS.find((x) => x.id === p)!);
  const c = st === 'done' ? TREE_INK : st === 'open' ? '#f2c46d' : '#a9a7b8';
  return (
    <div className="k-page">
      <div className="km-who">
        <span className={`kt-node ${st === 'done' ? 'dn' : st === 'open' ? 'op' : 'lk'}`} style={{ position: 'static', transform: 'none', width: 'auto' }} aria-hidden="true"><i><Icon name={techIcon(t)} size={30} stroke={1.9} /></i></span>
        <Title under={`Era ${ROMAN[ERAS.indexOf(e)]} · ${e.name}`}>{t.name}</Title>
      </div>
      <Panel ink={e.colour}><span>{t.text}</span></Panel>
      <div className="kb-g2">
        <Stat label="Cost" value={cost} c={c} under={eu ? `was ${t.cost}` : undefined} />
        <Stat label="In the bank" value={fmtCount(m.bank)} c={TREE_INK} />
      </div>
      <Panel ink="#ffe27a">
        <PanelTop name={eu ? 'Eureka happened' : 'Eureka'} c="#ffe27a" right={eu ? 'half price' : undefined} />
        <span className="k-q">{t.eureka.text} {eu ? 'It costs half.' : 'When it happens, it costs half.'}</span>
      </Panel>
      {pre.length > 0 && (
        <>
          <Sect>It needs</Sect>
          <div className="kb-rows">
            {pre.map((p) => {
              const ok = m.researched.includes(p.id);
              return (
                <Panel key={p.id} ink={ok ? TREE_INK : '#a9a7b8'} onClick={() => go('/football/tech', { id: p.id })} label={`${p.name}: ${ok ? 'done' : 'not yet'}`}>
                  <MarkRow icon={ok ? 'check' : techIcon(p)} c={ok ? TREE_INK : '#c4c1cf'} name={p.name} line={ok ? 'Done' : 'Not yet'} />
                </Panel>
              );
            })}
          </div>
        </>
      )}
      <TechAction m={m} t={t} st={st} cost={cost} />
    </div>
  );
}
function TechAction({ m, t, st, cost }: { m: Model; t: TechDef; st: ReturnType<typeof techState>; cost: number }) {
  if (st === 'done') return <Panel ink={TREE_INK} flat><Icon name="check" size={24} color={TREE_INK} /><b>Researched</b></Panel>;
  if (st === 'sealed') return <Note>Its era opens after six techs of the era before.</Note>;
  if (st === 'locked') return <Note>Research what it needs first.</Note>;
  if (m.user.target === t.id) return <Panel ink="#f2c46d"><b>Saving for it</b><Bar pct={(m.bank / Math.max(1, cost)) * 100} c="#f2c46d" /><span className="k-q">{fmtCount(m.bank)} of {cost}</span></Panel>;
  return (
    <button type="button" className="k-act wide kb-gold" onClick={() => void researchTech(t.id)}>
      {m.bank >= cost ? `Research it · ${cost}` : `Save for it · ${fmtCount(m.bank)} of ${cost}`}
    </button>
  );
}

/** A eureka (round six, pinned): the plate, the reason, and research it. */
export function EurekaMoment({ id }: { id: string }) {
  const m = useModel();
  if (!m) return null;
  const t = TECHS.find((x) => x.id === id);
  if (!t) return null;
  const close = () => { void seeEureka(id); go('/football/club', { view: 'tree' }, { replace: true }); };
  return (
    <div className="fbt-moment eureka">
      <p className="fbt-kick">Eureka</p>
      <div className="fbt-plate"><b>{t.name}</b><small>costs half: {m.cost(t.id)}</small></div>
      <p className="fbt-line c">{t.eureka.text} {t.text}</p>
      {techState(t, m.researched) === 'open' && <button type="button" className="fbt-btn gold wide" onClick={() => { void researchTech(t.id); close(); }}>{m.bank >= m.cost(t.id) ? 'Research it' : 'Save for it'}</button>}
      <button type="button" className="fbt-btn wide" onClick={close}>Later</button>
    </div>
  );
}

/** Entering a new era (rounds seven and eight, pinned): floodlights, the seals, the new techs as gold plates. */
export function EraMoment({ e }: { e: string }) {
  const m = useModel();
  if (!m) return null;
  const era = ERAS.find((x) => x.id === e);
  if (!era) return null;
  const i = ERAS.indexOf(era);
  const techs = TECHS.filter((t) => t.era === era.id);
  const built = m.t.built.filter((id) => PROJECTS.some((p) => p.id === id)).length;
  return (
    <div className="fbt-moment era" style={col(era.colour)}>
      <i className="bm a" /><i className="bm b" /><i className="bm c" /><i className="bm d" />
      {[0, 1, 2].map((k) => <i key={k} className="wv" style={{ animationDelay: `${k * 0.9}s` }} />)}
      <p className="fbt-kick" style={{ color: era.colour }}>Era {ROMAN[i]}</p>
      <h1 className="fbt-eat">{era.name}</h1>
      <p className="fbt-line c">{era.intro}</p>
      <div className="fbt-seals">
        {ERAS.map((x, k) => (
          <Viewable key={x.id} view={() => sealView(x, k, k < i ? 'Done' : k === i ? 'Now' : 'Ahead')}>
            <span className={k < i ? 'dn' : k === i ? 'now' : 'lk'} style={col(x.colour)} aria-hidden="true"><b>{ROMAN[k]}</b></span>
          </Viewable>
        ))}
      </div>
      <div className="fbt-plates">{techs.map((t, k) => <span key={t.id} style={{ animationDelay: `${1.2 + k * 0.15}s` }}>{t.name}</span>)}</div>
      {era.id === 'continental' && (
        <section className="fbt-card" style={col(era.colour)}>
          <span className="fbt-lb">Continental nights</span>
          <span>These techs only act in the Continental Cup, on the nights Brabo plays in it: {techs.filter((t) => t.effects.some((x) => (x.kind === 'axis' && x.when.startsWith('continental')) || (x.kind === 'rule' && x.rule === 'rotation-two-fronts'))).map((t) => t.name).join(', ')}. The rest reach abroad every day: scouts, loans and a deeper squad.</span>
        </section>
      )}
      <div className="fbt-kv">
        <p><span>Research so far</span><b className="fbt-n">{fmtCount(m.eng.earned)}</b></p>
        <p><span>Projects built</span><b className="fbt-n">{built}</b></p>
        <p><span>Eurekas</span><b className="fbt-n">{m.eng.eurekas.length}</b></p>
      </div>
      <button type="button" className="fbt-btn gold wide" onClick={() => { void seeEra(era.id); go('/football/club', { view: 'tree' }, { replace: true }); }}>Enter the new era</button>
    </div>
  );
}

/** Projects (no drawing of its own; on the kit): how many are being built leads, the one skyline, then the list. */
export function ProjectsPage() {
  const m = useModel();
  if (!m) return null;
  const building = m.projectsOpen.filter((p) => !m.states.get(p.id)?.done).length;
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={building} ink="#ffd56a" label="being built" />
        <span className="k-r"><b>{m.t.built.filter((id) => PROJECTS.some((p) => p.id === id)).length}</b><span className="k-q">built so far</span></span>
      </div>
      <Skyline places={m.places} progress={m.progress} />
      <ProjectList m={m} />
    </div>
  );
}
const PROJECT_INK = (p: (typeof PROJECTS)[number]) => (p.source === 'journey' ? '#93c3dc' : p.place === 'academy' || p.place === 'training' ? '#8fdcb6' : '#ffd56a');
export function ProjectList({ m }: { m: Model }) {
  const open = m.projectsOpen.filter((p) => !m.states.get(p.id)?.done);
  const next = m.places.flatMap((p) => p.stages.filter((s) => s.look === 'next').map((s) => s.p));
  const journeys = PROJECTS.filter((p) => p.source === 'journey' && !m.projectsOpen.includes(p) && !m.t.built.includes(p.id));
  return (
    <>
      {open.length > 0 && <Sect>Building now</Sect>}
      <div className="kb-rows">
        {open.map((p) => <Project key={p.id} m={m} id={p.id} />)}
      </div>
      {next.length + journeys.length > 0 && <Sect>Next</Sect>}
      <div className="kb-rows">
        {next.map((p) => (
          <Panel key={p.id} ink="#a9a7b8">
            <b>{p.name}</b>
            <span className="k-q">{p.tech && !m.researched.includes(p.tech) ? `Research ${TECHS.find((t) => t.id === p.tech)?.name} to start it.` : `“${p.tease}”`}</span>
          </Panel>
        ))}
        {journeys.map((p) => (
          <Panel key={p.id} ink="#a9a7b8"><b>{p.name}</b><span className="k-q">Research {TECHS.find((t) => t.id === p.tech)?.name} to start it. {p.reward}</span></Panel>
        ))}
      </div>
    </>
  );
}
/** One project being built: its name and the least-finished need on top, a bar per need, and what it gives. */
function Project({ m, id }: { m: Model; id: string }) {
  const p = PROJECTS.find((x) => x.id === id)!;
  const s = m.states.get(id);
  const c = PROJECT_INK(p);
  return (
    <Panel ink={c}>
      <PanelTop name={p.name} c={c} right={m.progress(id)} />
      {p.needs.map((n) => {
        const have = Math.min(n.count, s?.progress[n.what] ?? 0);
        return (
          <div key={n.what} className="k-col" style={{ gap: 3 }}>
            <Bar pct={(have / n.count) * 100} c={c} label={`${fmtCount(have)} of ${fmtCount(n.count)}`} />
            <span className="k-q">Grows on {METRIC_WORDS[n.what]} · {fmtCount(have)} of {fmtCount(n.count)}</span>
          </div>
        );
      })}
      {p.money > 0 && <span className="k-q">Money {euros(Math.min(m.t.save.budget, p.money))} of {euros(p.money)}</span>}
      <span>{p.reward}</span>
    </Panel>
  );
}

/** The staff room (no drawing; on the kit): who is hired leads, then each as a filled panel in its era's colour. */
export function StaffPage() {
  const m = useModel();
  if (!m) return null;
  const hired = m.staff.filter((s) => s.hired);
  const saving = m.staff.filter((s) => !s.hired && s.researching);
  const later = m.staff.filter((s) => !s.hired && !s.researching);
  const row = (x: Model['staff'][number]) => {
    const era = eraOf(x.tech.era);
    const doc = x.s.id === 'club-doctor' && x.hired;
    return (
      <Viewable key={x.s.id} className="k-panel" style={{ ['--ink' as string]: x.hired ? era.colour : '#a9a7b8' } as CSSProperties} view={() => staffView(x.s.name, x.s.text, era, `${era.name} · ${x.tech.name}`)}>
        <PanelTop name={`${x.s.name}${doc ? ` · level ${m.doctor.level}` : ''}`} c={x.hired ? era.colour : '#c4c1cf'} right={x.leave ? 'on leave' : x.hired ? euros(wage(x.s.wageUnits, m.t.tier)) : undefined} />
        <span className="k-q">{x.s.text}</span>
        {doc && <span className="k-q">{m.doctor.xp} days with every medicine kept{m.doctor.next ? ` · next level at ${m.doctor.next}` : ' · top level'}</span>}
        <span className="k-q kb-small">{era.name} · {x.tech.name}</span>
      </Viewable>
    );
  };
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={hired.length} ink="#8fdcb6" label="hired" under={`of ${m.staff.length}`} />
        <span className="k-r"><b className="k-num" style={{ color: '#f2c46d' }}>{euros(m.wages)}</b><span className="k-q">wages this season</span></span>
      </div>
      {hired.length > 0 && <><Sect>Hired</Sect><div className="kb-rows">{hired.map(row)}</div></>}
      {saving.length > 0 && <><Sect>Saving for</Sect><div className="kb-rows">{saving.map(row)}</div></>}
      <Sect>Further up the tree</Sect>
      <div className="kb-rows">{later.map(row)}</div>
      <Note>One wage unit is {euros(WAGE_UNIT[m.t.tier])} a season in this division.</Note>
    </div>
  );
}

/** The Money page's wages panel: this season's bill, last season's payout and anyone on leave. */
export function WagesCard() {
  const m = useModel();
  if (!m) return null;
  const hired = m.staff.filter((s) => s.hired);
  if (!hired.length) return null;
  const last = m.eng.wages;
  const away = m.staff.filter((s) => s.leave);
  return (
    <Panel ink="#8fdcb6" onClick={() => go('/football/staff')} label="Staff wages: the staff room">
      <PanelTop name="Staff wages" c="#8fdcb6" right={euros(m.wages)} />
      <span className="k-q">{hired.length} hired · paid at the season's end</span>
      {last && <span className="k-q">Paid, season {last.season}: {euros(last.paid)}</span>}
      {away.length > 0 && <span className="k-q">On leave until the budget covers them: {away.map((x) => x.s.name).join(', ')}. No debt is ever run up.</span>}
    </Panel>
  );
}

/** The board (no drawing; on the kit): the two goals as panels, green when on track, then the chairman's note. */
export function BoardPage() {
  const m = useModel();
  if (!m) return null;
  const set = m.eng.board.find((b) => b.season === m.t.save.season);
  const last = [...m.eng.board].reverse().find((b) => b.verdicts);
  const facts = m.t.facts;
  const goals = set?.ids.map((id) => {
    const o = BOARD.find((x) => x.id === id)!;
    const v = set.verdicts?.find((x) => x.id === id);
    const line = v ? (v.met ? 'Met · 10 research' : 'Missed') : facts ? objectiveLine(o, facts) : '';
    const ok = v ? v.met : line.includes('on track') || line === 'Done' || line.startsWith('Above');
    return { id, o, line, ok };
  }) ?? [];
  return (
    <div className="k-page">
      <div className="kb-lead"><Hero value={goals.filter((g) => g.ok).length} ink="#8fdcb6" label={`of ${goals.length || 2} goals`} under="on track or met" /></div>
      {!set && <Note>The board sets its goals on the season's first day.</Note>}
      <div className="kb-rows">
        {goals.map((g) => (
          <Panel key={g.id} ink={g.ok ? '#8fdcb6' : '#ff9a76'}>
            <MarkRow icon={g.ok ? 'check' : 'clock'} c={g.ok ? '#8fdcb6' : '#ff9a76'} name={g.o.text} line={g.line} />
          </Panel>
        ))}
      </div>
      {last?.verdicts && (
        <>
          <Sect>From the chairman</Sect>
          <Panel ink="#93c3dc">{last.verdicts.map((v) => { const o = BOARD.find((x) => x.id === v.id)!; return <b key={v.id} className="kd-q" style={{ margin: 0 }}>{v.met ? o.met : o.missed}</b>; })}</Panel>
        </>
      )}
    </div>
  );
}
