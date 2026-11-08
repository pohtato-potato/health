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
import { useModel, type Model } from './model';
import { Skyline } from './Skyline';

const eraOf = (id: EraId) => ERAS.find((e) => e.id === id)!;
const col = (c: string) => ({ ['--c' as string]: c }) as CSSProperties;

export function Back({ to, label, params }: { to: string; label: string; params?: Record<string, string> }) {
  return <button type="button" className="fbt-back" onClick={() => go(to, params, { replace: true })}>‹ {label}</button>;
}
function Head({ title, cap }: { title: string; cap?: ReactNode }) {
  return <div className="fbt-head"><h1 className="fbt-t1">{title}</h1>{cap != null && <span className="fbt-cap">{cap}</span>}</div>;
}
export function TreePage({ children }: { children: ReactNode }) {
  return <div className="fbt-page">{children}</div>;
}

/** The tree, inside the Club page: what's waiting, the doors, and six eras of eight techs. */
export function TreeHome() {
  const m = useModel();
  if (!m) return null;
  return (
    <div className="fbt-page">
      <Head title="The tree" cap={<><b className="fbt-n">{fmtCount(m.bank)}</b> research</>} />
      <Waiting m={m} />
      <nav className="fbt-doors" aria-label="The tree's rooms">
        <Door to="/football/projects" label="Projects" sub={m.projectsOpen.length ? `${m.projectsOpen.length} building` : 'Kaai quarter'} c="#ffd56a" />
        <Door to="/football/staff" label="Staff room" sub={`${m.staff.filter((s) => s.hired).length} hired`} c="#8fdcb6" />
        <Door to="/football/board" label="The board" sub="Two goals" c="#93c3dc" />
        <Door to="/football/packs" label="Packs" sub={m.packsWaiting.length ? `${m.packsWaiting.length} to open` : 'The album'} c="#ff9a76" />
      </nav>
      {m.user.target && (
        <section className="fbt-card on" style={col('#ffd56a')}>
          <span className="fbt-lb">Saving for</span>
          <b className="fbt-t2">{TECHS.find((x) => x.id === m.user.target)?.name}</b>
          <span>{fmtCount(m.bank)} of {m.cost(m.user.target)} research. It's researched by itself once the bank covers it.</span>
          <button type="button" className="fbt-btn sm" onClick={() => void clearTarget()}>Stop saving for it</button>
        </section>
      )}
      <p className="fbt-line">Six eras, eight techs each. An era opens once six techs of the one before are researched.</p>
      <div className="fbt-tree">
        {ERAS.map((e, i) => <Era key={e.id} m={m} id={e.id} n={i} />)}
      </div>
      <p className="fbt-line">Research comes from lesson points in every match (losses teach most), one a day for logging anything, ten for each board goal met, and duplicate album cards. Nothing in the tree is ever lost.</p>
      <p className="fbt-legend">
        <span><i className="k dn" />Done</span><span><i className="k rs" />Saving for</span><span><i className="k eu" />Eureka: half price</span><span><i className="k lk" />Not yet</span>
      </p>
    </div>
  );
}

function Door({ to, label, sub, c }: { to: string; label: string; sub: string; c: string }) {
  return <button type="button" className="fbt-door" style={col(c)} onClick={() => go(to)}><b>{label}</b><small>{sub}</small></button>;
}

/** What's waiting: a new era, eurekas, a boon pick, packs. */
function Waiting({ m }: { m: Model }) {
  const items: ReactNode[] = [];
  for (const e of m.erasUnseen) items.push(<Banner key={e} c={eraOf(e).colour} label={`Era ${ROMAN[ERAS.indexOf(eraOf(e))]}`} title={eraOf(e).name} line="A new era is open." onClick={() => go('/football/era', { e })} />);
  for (const id of m.eurekasUnseen.slice(0, 2)) {
    const t = TECHS.find((x) => x.id === id)!;
    items.push(<Banner key={id} c="#ffe27a" label="Eureka" title={t.name} line="Costs half." onClick={() => go('/football/eureka', { id })} />);
  }
  if (m.boonPick) items.push(<Banner key="boon" c="#8fdcb6" label="Boon" title="Pick one for this season" line={`Boon ${m.boonPick > 3 ? 'extra' : `${m.boonPick} of 3`}`} onClick={() => go('/football/boon')} />);
  if (m.packsWaiting.length) items.push(<Banner key="packs" c="#ff9a76" label="Packs" title={`${m.packsWaiting.length} to open`} line="Five items each." onClick={() => go('/football/packs')} />);
  return items.length ? <div className="fbt-waiting">{items}</div> : null;
}
function Banner({ c, label, title, line, onClick }: { c: string; label: string; title: string; line: string; onClick: () => void }) {
  return (
    <button type="button" className="fbt-banner" style={col(c)} onClick={onClick}>
      <span className="fbt-lb">{label}</span><b className="fbt-t2">{title}</b><span>{line}</span>
    </button>
  );
}

function Era({ m, id, n }: { m: Model; id: EraId; n: number }) {
  const e = eraOf(id);
  const open = m.eras.includes(id);
  const techs = TECHS.filter((t) => t.era === id);
  const done = techs.filter((t) => m.researched.includes(t.id)).length;
  const now = m.era === id;
  return (
    <section className={`fbt-era${open ? '' : ' lk'}${now ? ' now' : ''}`} style={col(e.colour)} aria-label={`Era ${ROMAN[n]}: ${e.name}, ${done} of 8 researched${open ? '' : ', not open yet'}`}>
      <div className="fbt-erah"><b>{ROMAN[n]} · {e.name}</b><small>{open ? `${done} of 8 · ${e.cost} each` : 'Not open yet'}</small></div>
      <div className="fbt-nodes">
        {techs.map((t) => {
          const st = techState(t, m.researched);
          const eu = m.eurekas.includes(t.id) && st !== 'done';
          const rs = m.user.target === t.id;
          const word = st === 'done' ? 'done' : rs ? 'saving for it' : eu ? 'eureka, half price' : st === 'open' ? 'open' : 'not yet';
          return (
            <button key={t.id} type="button" className={`fbt-node ${st === 'done' ? 'dn' : st === 'open' ? 'op' : 'lk'}${rs ? ' rs' : ''}${eu ? ' eu' : ''}`} onClick={() => go('/football/tech', { id: t.id })} aria-label={`${t.name}: ${word}`}>
              <span>{t.name}</span>{eu && <em>Eureka</em>}{st === 'done' && <i aria-hidden="true">✓</i>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** One tech: what it does, its cost, its eureka, and research it or save for it. */
export function TechPage({ id }: { id: string }) {
  const m = useModel();
  if (!m) return null;
  const t = TECHS.find((x) => x.id === id);
  if (!t) return <p className="fb-s">No such tech.</p>;
  const st = techState(t, m.researched);
  const e = eraOf(t.era);
  const cost = m.cost(t.id);
  const eu = m.eurekas.includes(t.id);
  const pre = t.prereqs.map((p) => TECHS.find((x) => x.id === p)!);
  return (
    <TreePage>
      <Back to="/football/club" params={{ view: 'tree' }} label="The tree" />
      <section className="fbt-tech" style={col(e.colour)}>
        <span className="fbt-lb">Era {ROMAN[ERAS.indexOf(e)]} · {e.name}</span>
        <h1 className="fbt-t1">{t.name}</h1>
        <p>{t.text}</p>
        <div className="fbt-kv">
          <p><span>Cost</span><b className="fbt-n">{cost}{eu && <small> (was {t.cost})</small>}</b></p>
          <p><span>In the bank</span><b className="fbt-n">{fmtCount(m.bank)}</b></p>
        </div>
        <p className="fbt-eu"><b>{eu ? 'Eureka happened.' : 'Eureka:'}</b> {t.eureka.text} {eu ? 'It costs half.' : 'When it happens, it costs half.'}</p>
        {pre.length > 0 && <p className="fbt-line">Needs {pre.map((p) => `${p.name}${m.researched.includes(p.id) ? ' ✓' : ''}`).join(' and ')}.</p>}
        <TechAction m={m} t={t} st={st} cost={cost} />
      </section>
    </TreePage>
  );
}
function TechAction({ m, t, st, cost }: { m: Model; t: TechDef; st: ReturnType<typeof techState>; cost: number }) {
  if (st === 'done') return <p className="fbt-done">✓ Researched</p>;
  if (st === 'sealed') return <p className="fbt-line">Its era opens after six techs of the era before.</p>;
  if (st === 'locked') return <p className="fbt-line">Research what it needs first.</p>;
  if (m.user.target === t.id) return <p className="fbt-done">Saving for it: {fmtCount(m.bank)} of {cost}</p>;
  return (
    <button type="button" className="fbt-btn gold" onClick={() => void researchTech(t.id)}>
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
          <span key={x.id} className={k < i ? 'dn' : k === i ? 'now' : 'lk'} style={col(x.colour)} aria-label={`Era ${ROMAN[k]}: ${x.name}${k < i ? ', done' : k === i ? ', now' : ', ahead'}`}>
            <b>{ROMAN[k]}</b>
          </span>
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

/** Projects (round seven, pinned) on the one skyline (round eight): every building stage and journey, one list. */
export function ProjectsPage() {
  const m = useModel();
  if (!m) return null;
  return (
    <TreePage>
      <Back to="/football/club" params={{ view: 'tree' }} label="The tree" />
      <Head title="Projects" />
      <p className="fbt-line">Every building on the quay grows stage by stage, and the journeys sit beside them. One list, drawn on the Kaai quarter as it grows.</p>
      <Skyline places={m.places} progress={m.progress} />
      <ProjectList m={m} />
    </TreePage>
  );
}
export function ProjectList({ m }: { m: Model }) {
  const open = m.projectsOpen;
  const next = m.places.flatMap((p) => p.stages.filter((s) => s.look === 'next').map((s) => s.p));
  const journeys = PROJECTS.filter((p) => p.source === 'journey' && !open.includes(p) && !m.t.built.includes(p.id));
  return (
    <>
      {open.length > 0 && <h2 className="fbt-sh">Building now</h2>}
      <div className="fbt-projects">
        {open.map((p) => <Project key={p.id} m={m} id={p.id} on />)}
      </div>
      {next.length > 0 && <h2 className="fbt-sh">Next</h2>}
      <div className="fbt-projects">
        {next.map((p) => (
          <div key={p.id} className="fbt-proj next">
            <b>{p.name}</b>
            <small>{p.tech && !m.researched.includes(p.tech) ? `Research ${TECHS.find((t) => t.id === p.tech)?.name} to start it.` : `“${p.tease}”`}</small>
          </div>
        ))}
        {journeys.map((p) => (
          <div key={p.id} className="fbt-proj next">
            <b>{p.name}</b><small>Research {TECHS.find((t) => t.id === p.tech)?.name} to start it. {p.reward}</small>
          </div>
        ))}
      </div>
      <p className="fbt-line">Projects count day totals only, never when you logged. None of it is required, and nothing is ever lost.</p>
    </>
  );
}
function Project({ m, id, on }: { m: Model; id: string; on?: boolean }) {
  const p = PROJECTS.find((x) => x.id === id)!;
  const s = m.states.get(id);
  const c = p.source === 'journey' ? '#93c3dc' : p.place === 'academy' || p.place === 'training' ? '#8fdcb6' : '#ffd56a';
  return (
    <div className={`fbt-proj${on ? ' on' : ''}`} style={col(c)}>
      <b>{p.name}</b>
      {p.needs.map((n) => {
        const have = Math.min(n.count, s?.progress[n.what] ?? 0);
        return (
          <div key={n.what} className="fbt-need">
            <small>{fmtCount(n.count)} {METRIC_WORDS[n.what]} · <b className="fbt-n">{fmtCount(have)}</b></small>
            <span className="fbt-bar" role="img" aria-label={`${fmtCount(have)} of ${fmtCount(n.count)}`}><i style={{ width: `${Math.round((have / n.count) * 100)}%` }} /></span>
          </div>
        );
      })}
      {p.money > 0 && <small>Money {euros(Math.min(m.t.save.budget, p.money))} of {euros(p.money)}</small>}
      <em>{p.reward}</em>
    </div>
  );
}

/** The staff room (round seven, pinned): hired, researching, further up the tree. Wages, leave, the doctor. */
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
      <p key={x.s.id} className={`fbt-staff${x.leave ? ' leave' : ''}`} style={col(era.colour)}>
        <b>{x.s.name}{doc ? ` · level ${m.doctor.level}` : ''}{x.leave ? ' · on leave' : ''}</b>
        <small>{x.s.text}</small>
        {doc && <small>{m.doctor.xp} days with every medicine kept{m.doctor.next ? ` · next level at ${m.doctor.next}` : ' · top level'}</small>}
        <small className="fbt-from">{era.name} · {x.tech.name}{x.hired ? ` · ${euros(wage(x.s.wageUnits, m.t.tier))} a season` : ''}</small>
      </p>
    );
  };
  return (
    <TreePage>
      <Back to="/football/club" params={{ view: 'tree' }} label="The tree" />
      <Head title="Staff room" cap={`${hired.length} of ${m.staff.length}`} />
      <p className="fbt-line">No staff limit. Wages are paid at the season's end: {euros(m.wages)} this season. Anyone the budget can't cover goes on leave until it can. There's no debt.</p>
      {hired.length > 0 && <><h2 className="fbt-sh">Hired</h2><div className="fbt-staffs">{hired.map(row)}</div></>}
      {saving.length > 0 && <><h2 className="fbt-sh">Saving for</h2><div className="fbt-staffs">{saving.map(row)}</div></>}
      <h2 className="fbt-sh">Further up the tree</h2>
      <div className="fbt-staffs lk">{later.map(row)}</div>
      <p className="fbt-line">One wage unit is {euros(WAGE_UNIT[m.t.tier])} a season in this division.</p>
    </TreePage>
  );
}

/** The Money tab's wages card: this season's bill, last season's payout and anyone on leave. */
export function WagesCard() {
  const m = useModel();
  if (!m) return null;
  const hired = m.staff.filter((s) => s.hired);
  if (!hired.length) return null;
  const last = m.eng.wages;
  const away = m.staff.filter((s) => s.leave);
  return (
    <section className="fb-card" aria-label="Wages">
      <span className="fb-lb">Staff wages</span>
      <div className="fb-row"><span className="fb-s">{hired.length} hired · paid at the season's end</span><b className="fb-num">{euros(m.wages)}</b></div>
      {last && <div className="fb-row"><span className="fb-s">Paid, season {last.season}</span><b className="fb-num">{euros(last.paid)}</b></div>}
      {away.length > 0 && <span className="fb-s">On leave until the budget covers them: {away.map((x) => x.s.name).join(', ')}. No debt is ever run up.</span>}
      <button type="button" className="fbt-btn sm" onClick={() => go('/football/staff')}>Staff room</button>
    </section>
  );
}

/** The board (round six, pinned): two goals, ten research each met, a dry note otherwise. */
export function BoardPage() {
  const m = useModel();
  if (!m) return null;
  const set = m.eng.board.find((b) => b.season === m.t.save.season);
  const last = [...m.eng.board].reverse().find((b) => b.verdicts);
  const facts = m.t.facts;
  return (
    <TreePage>
      <Back to="/football/club" params={{ view: 'tree' }} label="The tree" />
      <Head title="The board" />
      <p className="fbt-line">Two goals a season. Each one met: ten research. Missed: a dry note, nothing more.</p>
      {!set && <p className="fbt-line">The board sets its goals on the season's first day.</p>}
      <div className="fbt-goals">
        {set?.ids.map((id) => {
          const o = BOARD.find((x) => x.id === id)!;
          const v = set.verdicts?.find((x) => x.id === id);
          const line = v ? (v.met ? 'Met · 10 research' : 'Missed') : facts ? objectiveLine(o, facts) : '';
          const ok = v ? v.met : line.includes('on track') || line === 'Done' || line.startsWith('Above');
          return <p key={id} className={ok ? 'on' : ''} style={col(ok ? '#8fdcb6' : '#ff9a76')}><b>{o.text}</b><span>{ok ? '✓ ' : ''}{line}</span></p>;
        })}
      </div>
      {last?.verdicts && (
        <div className="fbt-chair"><span className="fbt-lb">From the chairman</span>
          {last.verdicts.map((v) => { const o = BOARD.find((x) => x.id === v.id)!; return <b key={v.id}>{v.met ? o.met : o.missed}</b>; })}
        </div>
      )}
    </TreePage>
  );
}
