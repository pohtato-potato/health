// Football engine 2, layer 4: the world (spec §9.3–9.5, §10, §16; rounds seven to nine as pinned).
// Loans from packs, sleep-style trials and the academy, international duty, and the morning on Tonight.
// The aurora look with glowing outlines; words in Atkinson Hyperlegible Next, numbers and titles in Fraunces.
import { useEffect, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { go } from '../../../router';
import { loadHealth } from '../../../football/store/gather';
import { letTrialistGo, seeLoan, seeTrials, tieToOwnHabit, tieTrialist, useWorld, type BreakView, type Morning } from '../../../football/store/globeActions';
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
import { GlassCard, SimpleBack, Viewable, type CardView } from '../../../ui/CardViewer';
import { Back, TreePage } from '../tree/TreeScreens';
import type { IconName } from '../../../ui/Icon';
import type { Family } from '../../../ui/kit/families';
import { Action, Empty, Hero, Panel, Sect } from '../../../ui/kit/Kit';
import { Bar, Note, PanelTop } from '../club/Bits';
import '../../../styles/club.css';

const col = (c: string) => ({ ['--c' as string]: c }) as CSSProperties;
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const TIER_COLOUR: Record<LoanDef['tier'], string> = { gold: '#ffd56a', prism: '#c4abff', icon: '#ffa25c' };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A loan full screen: the drawing on glass in its tier's colour; name, tier, unit and signature move on the back. */
export function loanView(loan: LoanDef, extra?: string): CardView {
  return {
    face: <GlassCard ink={TIER_COLOUR[loan.tier]} tier={loan.tier}><LoanArt loan={loan} size={220} /></GlassCard>,
    back: <SimpleBack kicker={`${LOAN_TIER_NAME[loan.tier]} · ${loan.unit}`} title={loan.name} lines={[`${loan.trait.name}: ${loan.trait.text}`, loan.style, extra]} />,
    label: `${loan.name}, ${LOAN_TIER_NAME[loan.tier]} loan`,
  };
}

/** The loan's drawing: a pose, kit colours and a shirt number; the face is line-art shading only. */
export function LoanArt({ loan, size = 120 }: { loan: LoanDef; size?: number }) {
  return <span className="fbg-art" dangerouslySetInnerHTML={{ __html: loanSvg(loan, size) }} />;
}

/** The world's four pages as doors on Club, each with its family (ledger O40) and one live line. */
export function useWorldDoors(): { to: string; label: string; sub: string; icon: IconName; family: Family; count?: string }[] | undefined {
  const w = useWorld();
  if (!w) return undefined;
  return [
    { to: '/football/loans', label: 'Loans', sub: w.here.length ? `${plural(w.here.length, 'player')} here` : 'From packs', icon: 'deal', family: 'money' },
    { to: '/football/trials', label: 'Trials', sub: STYLE_WORDS[w.week.style].name, icon: 'scope', family: 'people', count: w.trials.length ? `${w.trials.length} on trial` : undefined },
    { to: '/football/academy', label: 'Academy', sub: `${w.academy.filter((y) => y.link).length} of ${w.rules.academy}`, icon: 'book', family: 'people' },
    { to: '/football/duty', label: 'Duty', sub: w.intl ? `Day ${w.intl.day} of ${BREAK_DAYS}` : 'Two a season', icon: 'map', family: 'people' },
  ];
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
      <Viewable view={() => loanView(def, def.arrival)} className="fbg-sil"><LoanArt loan={def} size={150} /></Viewable>
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
  const c = TIER_COLOUR[def.tier];
  return (
    <div className="kw-loan">
      <Viewable view={() => loanView(def, past ? `“${def.farewell}”` : undefined)}><LoanArt loan={def} size={72} /></Viewable>
      <span className="k-col" style={{ gap: 2, minWidth: 0 }}>
        <span className="k-q">{LOAN_TIER_NAME[def.tier]} · {def.unit}</span>
        <b style={{ color: c, fontSize: 17 }}>{def.name}</b>
        <span>{plural(st.apps.length, 'game')}{st.goals ? ` · ${plural(st.goals, 'goal')}` : ''}{past ? ` · left ${fmtDate(st.until)}` : left != null ? ` · ${left === 1 ? 'last day today' : `${left} days left`}` : ''}</span>
        <span className="k-q">{def.trait.name}: {def.trait.text}</span>
        {past && <span className="k-q">“{def.farewell}”</span>}
      </span>
    </div>
  );
}

export function LoansPage() {
  const w = useWorld();
  if (!w) return null;
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={w.here.length} ink="#c4abff" label={`of ${w.rules.loan.slots} at the club`} />
        <span className="k-r k-q">{w.rules.loan.days} days each</span>
      </div>
      {w.here.length === 0 && <Empty icon="deal" ink="#c4abff" title="Nobody on loan right now" line="Loans come from packs. The next one arrives when a pack brings one." />}
      <div className="kb-rows">
        {w.here.map((st) => {
          const d = loanById(st.loan);
          return (
            <Panel key={st.key} ink={d ? TIER_COLOUR[d.tier] : undefined} onClick={() => go('/football/loan', { key: st.key })} label={`${d?.name}: open the arrival`}>
              <StayCard st={st} left={st.left} />
            </Panel>
          );
        })}
      </div>
      <Note>Each loan stays {w.rules.loan.days} days in its unit and takes the lowest starter's place on days you log that unit's habit; that player sits and rests. One at a time{w.rules.loan.slots > 1 ? ` per slot (${w.rules.loan.slots} slots)` : ''}.</Note>
      {w.waiting.length > 0 && (
        <>
          <Sect>Waiting to come</Sect>
          <div className="kb-rows">
            {w.waiting.map((q) => { const d = loanById(q.loan); return d ? <Panel key={q.key} ink={TIER_COLOUR[d.tier]}><PanelTop name={d.name} c={TIER_COLOUR[d.tier]} right={fmtDate(q.on)} /><span className="k-q">{LOAN_TIER_NAME[d.tier]} · {d.unit} · opened {fmtDate(q.on)}</span></Panel> : null; })}
          </div>
          <Note>They come as soon as a slot is free, in the order you opened them.</Note>
        </>
      )}
      {w.past.length > 0 && (
        <>
          <Sect>Been and gone</Sect>
          <div className="kb-rows">
            {w.past.slice(0, 12).map((st) => { const d = loanById(st.loan); return <Panel key={st.key} ink={d ? TIER_COLOUR[d.tier] : undefined}><StayCard st={st} past /></Panel>; })}
          </div>
        </>
      )}
      <Note>Real footballers, for this club only: no club badges, and nothing said about them beyond how they play. Icon loans are retired greats.</Note>
    </div>
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

const STARS = (n: number) => <span className="kb-stars" aria-label={`${n} stars`}>{'★'.repeat(n)}</span>;

/** Trials (round seven): the week's sleep style, who came, and a tie for each. */
export function TrialsPage() {
  const w = useWorld();
  const last = w?.g.trials[w.g.trials.length - 1];
  useEffect(() => { if (last && w?.trials.length) void seeTrials(last.on); }, [last?.on, w?.trials.length]);
  if (!w) return null;
  const s = STYLE_WORDS[w.week.style];
  const hrs = Math.floor(w.week.hours), mins = Math.round((w.week.hours - hrs) * 60);
  return (
    <div className="k-page">
      <div className="kb-lead kw-night">
        <Moon />
        <Hero value={w.trials.length} ink="#ffe27a" label={w.trials.length === 1 ? 'came to the trials' : 'came to the trials'} />
        <span className="k-r k-q">{last ? `${new Date(`${last.on}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })} morning` : 'Sunday mornings'}</span>
      </div>
      <Panel ink="#93c3dc">
        <PanelTop name={`Your week's sleep: ${s.name}`} c="#93c3dc" />
        <span>{w.week.nights >= 3 ? `${w.week.kept} of ${w.week.nights} bedtimes kept · ${hrs} h ${String(mins).padStart(2, '0')} average` : 'Fewer than three nights logged this week: anyone might come.'}</span>
      </Panel>
      {w.trials.length === 0 && <Note>Nobody waiting. The next trial day brings {w.rules.trials.size === 1 ? 'one' : w.rules.trials.size} new {w.rules.trials.size === 1 ? 'face' : 'faces'}, drawn by this week's sleep.</Note>}
      <div className="kb-rows">
        {w.trials.map((y, i) => <Trialist key={y.id} y={y} lead={i === 0} />)}
      </div>
      <Note>Trials are held on Sunday mornings{w.rules.trials.extraDay ? ' and Wednesdays' : ''}. Early, regular sleep draws steady defenders. Long nights draw prospects. Short but rested nights draw quick wingers.</Note>
      <Note>A trialist waits {w.rules.trials.hold} days to be tied to a habit; then they go home, no harm done. The academy holds {w.rules.academy}.</Note>
    </div>
  );
}
function Trialist({ y, lead }: { y: FbSquadRow; lead: boolean }) {
  const c = UNIT_COLOUR[y.axis as Unit];
  return (
    <Panel ink={c}>
      <PanelTop name={y.name} c={c} right={STARS(y.potential)} />
      <span className="k-q">{y.axis} · {y.what}{y.nation ? ` · from ${nationName(y.nation)}` : ''}{y.trialUntil ? ` · waits until ${fmtDate(y.trialUntil)}` : ''}</span>
      <Action quiet={!lead} onClick={() => go('/football/tie', { id: y.id })}>Tie to a habit</Action>
    </Panel>
  );
}

/** Tie a trialist to a real habit (round seven; O42 finding 35): the habit he came suggesting, which joins the checklist, or any habit already kept. */
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
    return (
      <div className="k-page">
        <Empty icon="scope" ink="#ffe27a" title={y?.status === 'growing' ? `${y.name} is at the academy now` : 'That trialist has gone home'} line="Nothing to tie here.">
          <Action wide onClick={() => go('/football/academy')}>The academy</Action>
        </Empty>
      </div>
    );
  }
  const full = w.academy.filter((x) => x.link).length >= w.rules.academy;
  const done = (ok: boolean) => ok && go('/football/academy', undefined, { replace: true });
  const tie = (l: YouthLink) => { void tieTrialist(y.id, l).then(done); };
  const ownName = y.what.replace(/^./, (ch) => ch.toUpperCase());
  const ownListed = (opts ?? []).some((o) => o.name.toLowerCase() === ownName.toLowerCase());
  return (
    <div className="k-page">
      <h2 className="kd-q">Tie {y.name} to a habit</h2>
      <Note>It only counts on days you really log it. His own habit joins your checklist; or pick one you already keep.</Note>
      {full && <Panel ink="#ffe27a"><PanelTop name="The academy is full" c="#ffe27a" /><span>{w.rules.academy} of {w.rules.academy} places taken. A place frees up when a youngster is promoted or leaves.</span></Panel>}
      <div className="kb-rows">
        {!y.exercise && !ownListed && (
          <button type="button" className="k-panel k-tap kd-target" style={{ ['--ink' as string]: '#ffe27a' }} disabled={full} onClick={() => { void tieToOwnHabit(y.id).then(done); }}>
            <b style={{ color: '#ffe27a' }}>His own: {ownName}</b><span className="k-q">Joins your checklist · one tick a day on Today</span>
          </button>
        )}
        {(opts ?? []).map((o) => {
          const c = o.link.kind === 'exercise' ? '#ff9a76' : '#f4aedb';
          return (
            <button key={`${o.link.kind}:${o.link.id}`} type="button" className="k-panel k-tap kd-target" style={{ ['--ink' as string]: c }} disabled={full} onClick={() => tie(o.link)}>
              <b style={{ color: c }}>{o.name}</b><span className="k-q">{o.link.kind === 'exercise' ? 'An exercise in the coach’s plan' : 'A checklist habit · ticks on Today'}{o.kept ? ' · one you already keep' : ' · new'}</span>
            </button>
          );
        })}
      </div>
      {opts && opts.length > 0 && <Note>Want something else? Add it to the checklist in Settings, or to the coach's plan, and come back.</Note>}
      <Action quiet onClick={() => { void letTrialistGo(y.id, w.today).then(() => go('/football/trials', undefined, { replace: true })); }}>Let {y.name} go · no penalty</Action>
    </div>
  );
}

/** The academy (round seven): sessions from the habit, growth from kept bedtimes, under the moon. */
export function AcademyPage() {
  const w = useWorld();
  if (!w) return null;
  const need = w.rules.promoteSessions;
  return (
    <div className="k-page">
      <div className="kb-lead kw-night">
        <Moon stars={10} />
        <Hero value={w.academy.filter((y) => y.link).length} ink="#ffe27a" label={`of ${w.rules.academy} places`} />
      </div>
      {w.academy.length === 0 && (
        <Empty icon="book" ink="#ffe27a" title="Nobody at the academy yet" line="Trialists come on trial days; tie one to a habit and they start here.">
          <Action wide onClick={() => go('/football/trials')}>Trials</Action>
        </Empty>
      )}
      <div className="kb-rows">
        {w.academy.map((y) => {
          const n = y.sessions?.length ?? 0, g = y.growth ?? 0;
          const tonight = y.lastGrow && y.lastGrow.on === w.save.lastPlayed ? y.lastGrow.n : 0;
          const c = UNIT_COLOUR[y.axis as Unit];
          return (
            <Panel key={y.id} ink={c} className="kw-young">
              <PanelTop name={y.name} c={c} right={STARS(y.potential)} />
              <span className="k-q">{y.axis}{y.link ? '' : ' · not tied to a habit: nothing counts'}</span>
              <Bar pct={(n / need) * 100} c={c} label={`${n} of ${need} sessions`} />
              <Bar pct={(g / PROMOTE_GROWTH) * 100} c="#ffe27a" label={`${g} of ${PROMOTE_GROWTH} growth`} />
              <span className="k-q">{n} of {need} sessions · {g} of {PROMOTE_GROWTH} growth{tonight ? ` · +${tonight} last night` : ''}</span>
              {!y.link && <Action quiet={y.id !== w.academy.find((x) => !x.link)?.id} onClick={() => go('/football/club', { view: 'deals' })}>Tie to a habit</Action>}
            </Panel>
          );
        })}
      </div>
      {w.academy.length > 0 && <p className="kw-key"><span><i style={{ background: '#8fdcb6' }} />Sessions (the habit, in the unit's colour)</span><span><i style={{ background: '#ffe27a' }} />Growth (sleep)</span></p>}
      <Note>They grow overnight on nights you keep your bedtime. Rest days double it. Growth pauses, never goes back. A loan in the same unit makes them grow half as fast again. Only youngsters tied to a habit take a place.</Note>
      {w.academy.length > 0 && <Action quiet onClick={() => go('/football/trials')}>Trials</Action>}
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
    <div className="k-page">
      {view ? <BreakPanel b={view} full /> : (
        <>
          <div className="kb-lead">
            <Hero value={nations.length} ink="#ff7d9c" label={nations.length === 1 ? 'nation in the squad' : 'nations in the squad'} />
            <span className="k-r k-q">no break on now</span>
          </div>
          <Note>Two breaks a season, before days 14 and 30: three days with no league games. Players called up play for their nation; log their habit on {DUTY_NEEDS} of the {BREAK_DAYS} days and they come back with a trait or +{DUTY_ATTR} to an attribute.</Note>
        </>
      )}
      <Sect>Nations</Sect>
      <Panel ink="#ff7d9c">
        {nations.map(([id, code], i) => { const p = byId.get(id)!; return <div key={id} className="k-row" style={{ minHeight: 36 }}><b style={{ color: NATION_HUES[i % NATION_HUES.length] }}>{nationName(code)}</b><span>{p.name}</span></div>; })}
      </Panel>
      <Note>A name that carries a nation plays for it. Everyone else was given one at random, for good.</Note>
      {past.length > 0 && (
        <>
          <Sect>Back from duty</Sect>
          <div className="kb-rows">
            {past.map((d) => {
              const got = byId.get(d.player)?.duty?.find((x) => x.nation === d.nation && d.days.includes(x.on));
              return <Panel key={`${d.season}:${d.n}:${d.player}`} ink="#ff7d9c"><PanelTop name={`${d.name} · ${nationName(d.nation)}`} c="#ff7d9c" /><span className="k-q">Season {d.season}, break {d.n} · {d.days.length} of {BREAK_DAYS} days{d.settled === 'trait' ? ` · trait: ${got?.trait ?? 'new'}` : d.settled === 'attr' ? ` · +${got?.d ?? DUTY_ATTR} ${got?.attr ?? ''}` : ' · quiet trip'}</span></Panel>;
            })}
          </div>
        </>
      )}
    </div>
  );
}
/** The break on Tonight and on the duty page: "International break · 3 days", "On duty", the list. */
export function BreakPanel({ b, full }: { b: BreakView; full?: boolean }) {
  if (full) {
    return (
      <>
        <div className="kb-lead">
          <Hero value={b.rows.length} ink="#ff7d9c" label="on duty" />
          <span className="k-r k-q">day {b.day} of {BREAK_DAYS}</span>
        </div>
        <Note>No league games for {BREAK_DAYS} days. Log a player's habit on {DUTY_NEEDS} of the {BREAK_DAYS} days and they come back with a trait or +{DUTY_ATTR} to an attribute.</Note>
        <div className="kb-rows">
          {b.rows.map((r, i) => {
            const c = NATION_HUES[i % NATION_HUES.length];
            return (
              <Panel key={r.player} ink={c}>
                <PanelTop name={nationName(r.nation)} c={c} right={`${r.days.length} of ${BREAK_DAYS} days`} />
                <Bar pct={(r.days.length / DUTY_NEEDS) * 100} c={c} label={`${r.days.length} of ${DUTY_NEEDS} days needed`} />
                <span className="k-q">{r.name}{fromName(r.name, r.nation) ? '' : ' · drawn for good'}{r.today ? ' · logged today' : ''}</span>
              </Panel>
            );
          })}
        </div>
      </>
    );
  }
  const Title = 'b';
  return (
    <section className="fbt-card fbg-break" style={col('#ff7d9c')}>
      <span className="fbt-lb">International break · day {b.day} of {BREAK_DAYS}</span>
      <Title className="fbt-t2">On duty</Title>
      <span>No league games for {BREAK_DAYS} days. Log a player's habit on {DUTY_NEEDS} of the {BREAK_DAYS} days and they come back with a trait or +{DUTY_ATTR} to an attribute.</span>
      <div className="fbg-duty">
        {b.rows.map((r, i) => (
          <p key={r.player} style={col(NATION_HUES[i % NATION_HUES.length])}>
            <span><b>{nationName(r.nation)}</b><small>{r.name}{fromName(r.name, r.nation) ? '' : ' · drawn for good'}</small></span>
            <em><span><b className="fbt-n">{r.days.length}</b> of {BREAK_DAYS} days</span>{r.today && <small>✓ logged today</small>}</em>
          </p>
        ))}
      </div>
      <button type="button" className="fbt-btn sm" onClick={() => go('/football/duty')}>Who's away</button>
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
      <span className="fbg-pk"><Viewable view={() => loanView(d)}><LoanArt loan={d} size={64} /></Viewable><span><b className="fbt-t2">{d.name}</b><span>Joins {d.unit} as soon as a slot is free.</span></span></span>
      <small>{d.trait.name}: {d.trait.text}</small>
    </div>
  );
}
