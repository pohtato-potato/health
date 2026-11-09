// Football engine 2, layer 4: the world (spec §9.3–9.5, §10, §16; rounds seven to nine as pinned).
// Loans from packs, sleep-style trials and the academy, international duty, and the morning on Tonight.
// The aurora look with glowing outlines; words in Atkinson Hyperlegible Next, numbers and titles in Fraunces.
import { useEffect, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { go } from '../../../router';
import { loadHealth } from '../../../football/store/gather';
import { letTrialistGo, seeLoan, seeTrials, tieTrialist, useWorld, type BreakView, type Morning } from '../../../football/store/globeActions';
import { linkOptions, PROMOTE_GROWTH, type YouthLink } from '../../../football/players/youth';
import { loanById, LOAN_DAYS, LOAN_MENTOR, LOAN_TIER_NAME } from '../../../football/globe/loans';
import { loanSvg } from '../../../football/globe/art';
import { STYLE_WORDS } from '../../../football/globe/trials';
import { BREAK_DAYS, DUTY_ATTR, DUTY_NEEDS } from '../../../football/globe/duty';
import { fromName, nationName } from '../../../football/globe/nations';
import { UNIT_HABIT } from '../../../football/globe/scout';
import { UNIT_COLOUR } from '../../../football/players/eleven';
import type { LoanDef, Unit } from '../../../football/content/types';
import type { FbSquadRow } from '../../../football/store/tables';
import type { LoanStay } from '../../../football/globe/types';
import { Back, TreePage } from '../tree/TreeScreens';

const col = (c: string) => ({ ['--c' as string]: c }) as CSSProperties;
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const TIER_COLOUR: Record<LoanDef['tier'], string> = { gold: '#ffd56a', prism: '#c4abff', icon: '#ffa25c' };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The loan's drawing: a pose, kit colours and a shirt number; the face is line-art shading only. */
export function LoanArt({ loan, size = 120 }: { loan: LoanDef; size?: number }) {
  return <span className="fbg-art" dangerouslySetInnerHTML={{ __html: loanSvg(loan, size) }} />;
}

/** The doors to the world, on the Club's squad page. */
export function WorldDoors() {
  const w = useWorld();
  if (!w) return null;
  const doors: { to: string; label: string; sub: string; c: string }[] = [
    { to: '/football/loans', label: 'Loans', sub: w.here.length ? `${plural(w.here.length, 'player')} here` : 'From packs', c: '#ffa25c' },
    { to: '/football/trials', label: 'Trials', sub: w.trials.length ? `${w.trials.length} waiting` : `Your sleep: ${STYLE_WORDS[w.week.style].name}`, c: '#ffe27a' },
    { to: '/football/academy', label: 'Academy', sub: `${w.academy.filter((y) => y.link).length} of ${w.rules.academy} places`, c: '#8fdcb6' },
    { to: '/football/duty', label: 'International duty', sub: w.intl ? `Break on: day ${w.intl.day} of ${BREAK_DAYS}` : 'Two breaks a season', c: '#ff7d9c' },
  ];
  return (
    <nav className="fbg-doors" aria-label="The world">
      {doors.map((d) => (
        <button key={d.to} type="button" className="fbg-door" style={col(d.c)} onClick={() => go(d.to)}><b>{d.label}</b><small>{d.sub}</small></button>
      ))}
    </nav>
  );
}

/** A loan's arrival (round seven): "On loan · 7 days", the drawing, the line, the chips. */
export function LoanMoment({ k }: { k: string }) {
  const w = useWorld();
  if (!w) return null;
  const st = [...w.here, ...w.g.loans].find((s) => s.key === k);
  const def = st ? loanById(st.loan) : undefined;
  if (!st || !def) return <TreePage><Back to="/football/loans" label="Loans" /><p className="fbt-line">That loan isn't at the club.</p></TreePage>;
  const days = Math.round((Date.parse(`${st.until}T12:00:00Z`) - Date.parse(`${st.from}T12:00:00Z`)) / 86400000) + 1;
  const done = () => { void seeLoan(k).then(() => go('/football', undefined, { replace: true })); };
  return (
    <div className="fbg-moment loan" style={col(TIER_COLOUR[def.tier])}>
      <i className="fbg-ray" aria-hidden="true" />
      <p className="fbt-lb c">On loan · {days} days</p>
      <div className="fbg-sil"><LoanArt loan={def} size={150} /></div>
      <h1 className="fbt-t1 c">{def.name}</h1>
      <p className="fbg-say c">{def.arrival}</p>
      <p className="fbt-line c">Joins {def.unit}. Plays only on days you log {UNIT_HABIT[def.unit]}, in place of the lowest-rated starter there, who rests. While {def.name.split(' ').slice(-1)[0]} is here the {def.unit} youngsters grow half as fast again.</p>
      <div className="fbg-chips">
        <span className="fbg-chip" style={col(TIER_COLOUR[def.tier])}>{LOAN_TIER_NAME[def.tier]}</span>
        <span className="fbg-chip" style={col(UNIT_COLOUR[def.unit])}>{def.unit}</span>
        <span className="fbg-chip" style={col('#ffe27a')}>Mentor ×{LOAN_MENTOR}</span>
      </div>
      <section className="fbt-card" style={col(UNIT_COLOUR[def.unit])}>
        <span className="fbt-lb">Signature move</span>
        <b className="fbt-t2">{def.trait.name}</b>
        <span>{def.trait.text}</span>
        <small className="fbg-q">{def.style}</small>
      </section>
      <button type="button" className="fbt-btn gold wide" onClick={done}>Carry on</button>
    </div>
  );
}

function StayCard({ st, left, past }: { st: LoanStay; left?: number; past?: boolean }) {
  const def = loanById(st.loan);
  if (!def) return null;
  return (
    <section className="fbg-stay" style={col(TIER_COLOUR[def.tier])}>
      <LoanArt loan={def} size={72} />
      <span className="fbg-st">
        <span className="fbt-lb">{LOAN_TIER_NAME[def.tier]} · {def.unit}</span>
        <b className="fbt-t2">{def.name}</b>
        <span>{plural(st.apps.length, 'game')}{st.goals ? ` · ${plural(st.goals, 'goal')}` : ''}{past ? ` · left ${fmtDate(st.until)}` : left != null ? ` · ${left === 1 ? 'last day today' : `${left} days left`}` : ''}</span>
        <small className="fbg-q">{def.trait.name}: {def.trait.text}</small>
        {past && <small className="fbg-q">“{def.farewell}”</small>}
      </span>
    </section>
  );
}

export function LoansPage() {
  const w = useWorld();
  if (!w) return null;
  return (
    <TreePage>
      <Back to="/football/club" label="Club" />
      <div className="fbt-head"><h1 className="fbt-t1">Loans</h1><span className="fbt-cap"><b className="fbt-n">{w.here.length}</b> of {w.rules.loan.slots} at the club</span></div>
      <p className="fbt-line">Loans come from packs. Each stays {w.rules.loan.days} days in its unit and takes the lowest starter's place on days you log that unit's habit; that player sits and rests. One at a time{w.rules.loan.slots > 1 ? ` per slot (${w.rules.loan.slots} slots)` : ''}.</p>
      {w.here.length === 0 && <p className="fbt-line">Nobody on loan right now.</p>}
      {w.here.map((s) => (
        <button key={s.key} type="button" className="fbg-btnwrap" onClick={() => go('/football/loan', { key: s.key })} aria-label={`${loanById(s.loan)?.name}: open the arrival`}>
          <StayCard st={s} left={s.left} />
        </button>
      ))}
      {w.waiting.length > 0 && (
        <>
          <h2 className="fbt-sh">Waiting to come</h2>
          <p className="fbt-line">They come as soon as a slot is free, in the order you opened them.</p>
          <ul className="fbg-list">
            {w.waiting.map((q) => { const d = loanById(q.loan); return d ? <li key={q.key} style={col(TIER_COLOUR[d.tier])}><b>{d.name}</b><small>{LOAN_TIER_NAME[d.tier]} · {d.unit} · opened {fmtDate(q.on)}</small></li> : null; })}
          </ul>
        </>
      )}
      {w.past.length > 0 && (
        <>
          <h2 className="fbt-sh">Been and gone</h2>
          {w.past.slice(0, 12).map((s) => <StayCard key={s.key} st={s} past />)}
        </>
      )}
      <p className="fbt-line">Real footballers, for this club only: no club badges, and nothing said about them beyond how they play. Icon loans are retired greats.</p>
    </TreePage>
  );
}

function Moon({ stars = 16 }: { stars?: number }) {
  return (
    // Stars stay in a band at the top right, clear of the words.
    <span className="fbg-sky" aria-hidden="true">
      <span className="fbg-moon" />
      {Array.from({ length: stars }, (_, i) => <i key={i} className="fbg-star" style={{ left: `${30 + ((i * 37) % 66)}%`, top: `${8 + ((i * 23) % 9) * 9}px`, animationDelay: `-${i % 5}s` }} />)}
    </span>
  );
}

const STARS = (n: number) => <span className="fbg-pot" aria-label={`${n} stars`}>{'★'.repeat(n)}</span>;

/** Trials (round seven): the week's sleep style, who came, and a tie for each. */
export function TrialsPage() {
  const w = useWorld();
  const last = w?.g.trials[w.g.trials.length - 1];
  useEffect(() => { if (last && w?.trials.length) void seeTrials(last.on); }, [last?.on, w?.trials.length]);
  if (!w) return null;
  const s = STYLE_WORDS[w.week.style];
  const hrs = Math.floor(w.week.hours), mins = Math.round((w.week.hours - hrs) * 60);
  return (
    <div className="fbg-night">
      <Moon />
      <TreePage>
        <Back to="/football/club" label="Club" />
        <p className="fbt-lb" style={col('#ffe27a')}>{last ? `${new Date(`${last.on}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })} morning · academy trials` : 'Academy trials'}</p>
        <h1 className="fbt-t1">{w.trials.length ? `${w.trials.length === 1 ? 'One' : w.trials.length === 2 ? 'Two' : w.trials.length} came to the trials` : 'Trials'}</h1>
        <section className="fbg-sleep">
          <b>Your week's sleep: {s.name}</b>
          <span>{w.week.nights >= 3 ? <><b className="fbt-n">{w.week.kept}</b> of {w.week.nights} bedtimes kept · <b className="fbt-n">{hrs}</b> h <b className="fbt-n">{String(mins).padStart(2, '0')}</b> average</> : 'Fewer than three nights logged this week: anyone might come.'}</span>
        </section>
        <p className="fbt-line">Trials are held on Sunday mornings{w.rules.trials.extraDay ? ' and Wednesdays' : ''}. Early, regular sleep draws steady defenders. Long nights draw prospects. Short but rested nights draw quick wingers.</p>
        {w.trials.length === 0 && <p className="fbt-line">Nobody waiting. The next trial day brings {w.rules.trials.size === 1 ? 'one' : w.rules.trials.size} new {w.rules.trials.size === 1 ? 'face' : 'faces'}, drawn by this week's sleep.</p>}
        <div className="fbg-trials">
          {w.trials.map((y) => <Trialist key={y.id} y={y} />)}
        </div>
        <p className="fbt-line">A trialist waits {w.rules.trials.hold} days to be tied to a habit; then they go home, no harm done. The academy holds {w.rules.academy}.</p>
      </TreePage>
    </div>
  );
}
function Trialist({ y }: { y: FbSquadRow }) {
  return (
    <section className="fbg-trial" style={col(UNIT_COLOUR[y.axis as Unit])}>
      {STARS(y.potential)}
      <b className="fbt-t2">{y.name}</b>
      <small>{y.axis} · {y.what}{y.nation ? ` · from ${nationName(y.nation)}` : ''}</small>
      {y.trialUntil && <small>Waits until {fmtDate(y.trialUntil)}</small>}
      <button type="button" className="fbt-btn sm" onClick={() => go('/football/tie', { id: y.id })}>Tie to a habit</button>
    </section>
  );
}

/** Tie a trialist to a real habit (round seven). Football never makes a habit itself: add a new one in Settings first. */
export function TiePage({ id }: { id: string }) {
  const w = useWorld();
  const opts = useLiveQuery(async () => {
    if (!w) return undefined;
    const y = w.squad.find((x) => x.id === id);
    if (!y) return [];
    return linkOptions(await loadHealth(), y, w.squad.filter((x) => x.status === 'growing'), y.id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1] ?? w.today);
  }, [w?.squad.map((x) => `${x.id}:${x.status}:${x.link?.id ?? ''}`).join(','), id]);
  if (!w) return null;
  const y = w.squad.find((x) => x.id === id);
  if (!y || y.status !== 'trial') {
    return <TreePage><Back to="/football/trials" label="Trials" /><p className="fbt-line">{y?.status === 'growing' ? `${y.name} is at the academy now.` : 'That trialist has gone home.'}</p><button type="button" className="fbt-btn wide" onClick={() => go('/football/academy')}>The academy</button></TreePage>;
  }
  const full = w.academy.filter((x) => x.link).length >= w.rules.academy;
  const tie = (l: YouthLink) => { void tieTrialist(y.id, l).then((ok) => ok && go('/football/academy', undefined, { replace: true })); };
  return (
    <TreePage>
      <Back to="/football/trials" label="Trials" />
      <h1 className="fbt-t1">Tie {y.name} to a habit</h1>
      <p className="fbt-line">It only counts on days you really log it. Only habits you haven't been logging already: a youngster stands for something new.</p>
      {full && <section className="fbt-card" style={col('#ffe27a')}><b>The academy is full</b><span>{w.rules.academy} of {w.rules.academy} places taken. A place frees up when a youngster is promoted or leaves.</span></section>}
      <div className="fbg-opts">
        {(opts ?? []).map((o) => (
          <button key={`${o.link.kind}:${o.link.id}`} type="button" className="fbg-opt" style={col(o.link.kind === 'exercise' ? '#ff9a76' : '#f4aedb')} disabled={full} onClick={() => tie(o.link)}>
            <b>{o.name}</b><span>{o.link.kind === 'exercise' ? 'An exercise in the coach’s plan' : 'A checklist habit · ticks on Today'}</span>
          </button>
        ))}
        <button type="button" className="fbg-opt" style={col('#93c3dc')} onClick={() => { void letTrialistGo(y.id, w.today).then(() => go('/football/trials', undefined, { replace: true })); }}>
          <b>Let {y.name} go</b><span>No penalty</span>
        </button>
      </div>
      {opts && opts.length === 0 && <p className="fbt-line">No new habit to tie to yet. Add one to the checklist in Settings, or an exercise to the coach's plan, and it shows up here.</p>}
      {opts && opts.length > 0 && <p className="fbt-line">Want something else? Add it to the checklist in Settings, or to the coach's plan, and come back.</p>}
    </TreePage>
  );
}

/** The academy (round seven): sessions from the habit, growth from kept bedtimes, under the moon. */
export function AcademyPage() {
  const w = useWorld();
  if (!w) return null;
  const need = w.rules.promoteSessions;
  return (
    <div className="fbg-night">
      <Moon stars={10} />
      <TreePage>
        <Back to="/football/club" label="Club" />
        <div className="fbt-head"><h1 className="fbt-t1">Academy</h1><span className="fbt-cap"><b className="fbt-n">{w.academy.filter((y) => y.link).length}</b> of {w.rules.academy} places</span></div>
        <p className="fbt-line">They grow overnight on nights you keep your bedtime. Rest days double it. Growth pauses, never goes back. A loan in the same unit makes them grow half as fast again. Only youngsters tied to a habit take a place.</p>
        {w.academy.length === 0 && <p className="fbt-line">Nobody at the academy yet. Trialists come on trial days; tie one to a habit and they start here.</p>}
        <div className="fbg-acad">
          {w.academy.map((y) => {
            const s = y.sessions?.length ?? 0, g = y.growth ?? 0;
            const tonight = y.lastGrow && y.lastGrow.on === w.save.lastPlayed ? y.lastGrow.n : 0;
            return (
              <section key={y.id} className="fbg-young" style={col(UNIT_COLOUR[y.axis as Unit])}>
                <b className="fbt-t2">{y.name}</b>
                <small>{y.axis} · {'★'.repeat(y.potential)}<span className="fb-sr"> {y.potential} stars</span>{y.link ? '' : ' · not tied to a habit: nothing counts'}</small>
                <span className="fbg-bars">
                  <span className="fbg-bar" role="img" aria-label={`${s} of ${need} sessions`}><i style={{ width: `${Math.min(100, (s / need) * 100)}%` }} /></span>
                  <span className="fbg-bar gr" role="img" aria-label={`${g} of ${PROMOTE_GROWTH} growth`}><i style={{ width: `${Math.min(100, (g / PROMOTE_GROWTH) * 100)}%` }} /></span>
                </span>
                {!y.link && <button type="button" className="fbt-btn sm" onClick={() => go('/football/club', { view: 'deals' })}>Tie to a habit</button>}
                <em><b className="fbt-n">{s}</b> of {need} sessions · <b className="fbt-n">{g}</b> of {PROMOTE_GROWTH} growth{tonight ? <> · <b className="fbt-n">+{tonight}</b> last night</> : ''}</em>
              </section>
            );
          })}
        </div>
        <p className="fbg-key"><span><i className="s" />Sessions (the habit)</span><span><i className="g" />Growth (sleep)</span></p>
        <button type="button" className="fbt-btn wide" onClick={() => go('/football/trials')}>Trials</button>
      </TreePage>
    </div>
  );
}

const NATION_HUES = ['#ffd56a', '#8fdcb6', '#ff7d9c', '#93c3dc', '#c4abff', '#ff9a76'];
/** International duty (round seven): who's away, for which nation, and the days logged. */
export function DutyPage() {
  const w = useWorld();
  if (!w) return null;
  const view = w.intl;
  const past = w.g.duty.filter((d) => d.settled).slice(-12).reverse();
  const byId = new Map(w.players.map((p) => [p.id, p]));
  const nations = Object.entries(w.g.nations).filter(([id]) => byId.get(id)?.status === 'squad');
  return (
    <TreePage>
      <Back to="/football/club" label="Club" />
      {view ? <BreakPanel b={view} full /> : (
        <>
          <h1 className="fbt-t1">International duty</h1>
          <p className="fbt-line">Two breaks a season, before days 14 and 30: three days with no league games. Players called up play for their nation; log their habit on {DUTY_NEEDS} of the {BREAK_DAYS} days and they come back with a trait or +{DUTY_ATTR} to an attribute.</p>
        </>
      )}
      <h2 className="fbt-sh">Nations</h2>
      <p className="fbt-line">A name that carries a nation plays for it. Everyone else was given one at random, for good.</p>
      <ul className="fbg-list">
        {nations.map(([id, code], i) => { const p = byId.get(id)!; return <li key={id} style={col(NATION_HUES[i % NATION_HUES.length])}><b>{nationName(code)}</b><small>{p.name}</small></li>; })}
      </ul>
      {past.length > 0 && (
        <>
          <h2 className="fbt-sh">Back from duty</h2>
          <ul className="fbg-list">
            {past.map((d) => {
              const got = byId.get(d.player)?.duty?.find((x) => x.nation === d.nation && d.days.includes(x.on));
              return <li key={`${d.season}:${d.n}:${d.player}`} style={col('#ff7d9c')}><b>{d.name} · {nationName(d.nation)}</b><small>Season {d.season}, break {d.n} · {d.days.length} of {BREAK_DAYS} days{d.settled === 'trait' ? ` · trait: ${got?.trait ?? 'new'}` : d.settled === 'attr' ? ` · +${got?.d ?? DUTY_ATTR} ${got?.attr ?? ''}` : ' · quiet trip'}</small></li>;
            })}
          </ul>
        </>
      )}
    </TreePage>
  );
}
/** The break on Tonight and on the duty page: "International break · 3 days", "On duty", the list. */
export function BreakPanel({ b, full }: { b: BreakView; full?: boolean }) {
  const Title = full ? 'h1' : 'b';
  return (
    <section className={full ? 'fbg-break full' : 'fbt-card fbg-break'} style={col('#ff7d9c')}>
      <span className="fbt-lb">International break · day {b.day} of {BREAK_DAYS}</span>
      <Title className={full ? 'fbt-t1' : 'fbt-t2'}>On duty</Title>
      <span>No league games for {BREAK_DAYS} days. Log a player's habit on {DUTY_NEEDS} of the {BREAK_DAYS} days and they come back with a trait or +{DUTY_ATTR} to an attribute.</span>
      <div className="fbg-duty">
        {b.rows.map((r, i) => (
          <p key={r.player} style={col(NATION_HUES[i % NATION_HUES.length])}>
            <span><b>{nationName(r.nation)}</b><small>{r.name}{fromName(r.name, r.nation) ? '' : ' · drawn for good'}</small></span>
            <em><span><b className="fbt-n">{r.days.length}</b> of {BREAK_DAYS} days</span>{r.today && <small>✓ logged today</small>}</em>
          </p>
        ))}
      </div>
      {!full && <button type="button" className="fbt-btn sm" onClick={() => go('/football/duty')}>Who's away</button>}
    </section>
  );
}

/** The morning on Tonight (round seven): overnight at the academy, trialists, the scout line, loans arriving. */
export function MorningCards({ m }: { m: Morning }) {
  return (
    <>
      {m.arrivals.map((s) => {
        const d = loanById(s.loan);
        return d ? (
          <button key={s.key} type="button" className="fbt-banner fbg-arrive" style={col(TIER_COLOUR[d.tier])} onClick={() => go('/football/loan', { key: s.key })}>
            <span className="fbt-lb">On loan · {LOAN_DAYS} days</span><b className="fbt-t2">{d.name} has arrived</b><small>{LOAN_TIER_NAME[d.tier]} · {d.unit} · tap to meet them</small>
          </button>
        ) : null;
      })}
      {m.newTrials && m.trials.length > 0 && (
        <button type="button" className="fbt-banner fbg-arrive" style={col('#ffe27a')} onClick={() => go('/football/trials')}>
          <span className="fbt-lb">Academy trials</span><b className="fbt-t2">{m.trials.length === 1 ? 'One came' : `${m.trials.length} came`} to the trials</b><small>Drawn by this week's sleep · tie them to a habit</small>
        </button>
      )}
      {m.grew.length > 0 && (
        <section className="fbg-over" style={col('#ffe27a')}>
          <i className="fbg-mo" aria-hidden="true" />
          <span><b>Overnight at the academy</b><small>{m.grew.map((g) => `${g.name} grew +${g.n}`).join(' · ')} · bedtime kept</small></span>
        </section>
      )}
      {m.intl && <BreakPanel b={m.intl} />}
      {m.scout && (
        <section className="fbg-scout" style={col(UNIT_COLOUR[m.scout.unit])}>
          <span className="fbt-lb">The scout</span>
          <b>{m.scout.line}</b>
          {m.scout.weak && <small>{m.scout.weak.line}</small>}
        </section>
      )}
    </>
  );
}

/** A loan in a pack's reveal. */
export function PackLoan({ id }: { id: string }) {
  const d = loanById(id);
  if (!d) return null;
  return (
    <div className={`fbt-item loan ${d.tier}`} style={col(TIER_COLOUR[d.tier])}>
      <span className="fbt-lb">{LOAN_TIER_NAME[d.tier]} · {LOAN_DAYS} days</span>
      <span className="fbg-pk"><LoanArt loan={d} size={64} /><span><b className="fbt-t2">{d.name}</b><span>Joins {d.unit} as soon as a slot is free.</span></span></span>
      <small>{d.trait.name}: {d.trait.text}</small>
    </div>
  );
}
