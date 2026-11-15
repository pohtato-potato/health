// The manager's desk (desk spec §2–3, §8, §13): the door on Tonight, the desk (d3-home), spending a die (d3-spend),
// the coaching course, and the owner's own questions. Taps write only the desk's own record (store/desk.ts).
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { COURSE_SIZE, eyeChoices, eyeLevel, isRight, PASS_AT, toNextEye } from '../../../football/desk/course';
import { coursePasses, spendsOn, trayOf, unspentResearch } from '../../../football/desk/rules';
import type { Die, JobDef, JobId } from '../../../football/desk/types';
import { speakers, voiceLine } from '../../../football/desk/words';
import { clearMine, courseSheet, saveDraft, finishCourse, freezeDice, importMine, jobById, jobsForDesk, loadDesk, spendAt, useMineCount, type CourseSheet, type DeskModel } from '../../../football/store/desk';
import { useTonight, type Tonight } from '../../../football/store/hooks';
import { go, useRoute } from '../../../router';
import { AXIS_INK } from '../../../ui/inks';
import { FootballHome } from '../FootballHome';
import { Action, Empty, Hero, Panel, Sect } from '../../../ui/kit/Kit';
import type { HowThisWorks } from '../../../ui/kit/Kit';
import { CORAL, DESK_HOW, GREEN, Note, PanelTop } from '../club/Bits';
import { liveTalk } from '../../../football/desk/jobs/negotiate';
import { TalkPage } from './Market';
import '../../../styles/matchday.css';
import '../../../styles/desk.css';
import '../../../styles/club.css';

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const SECTION: Record<string, string> = { quant: 'Quant', verbal: 'Verbal', lr: 'Logical reasoning', di: 'Data interpretation' };
const sec = (x?: string) => (x ? SECTION[x] ?? x : '');
/** A long list of targets (the scout's clubs) shows this many until asked for all. */
const TARGETS_SHOWN = 8;
const ink = (axis: Die['axis']) => ({ '--ink': AXIS_INK[axis] }) as CSSProperties;

/** The job's drawing, with its ring when it is a clock (d3-home). */
function JobArt({ id, ring, colour }: { id: JobId; ring?: { filled: number; size: number }; colour: string }) {
  const r = 17, c = 2 * Math.PI * r;
  const share = ring ? Math.min(1, ring.filled / Math.max(1, ring.size)) : 0;
  const draw: Partial<Record<JobId, string>> = {
    watch: 'M10 20 Q20 11 30 20 Q20 29 10 20 Z M20 17 a3 3 0 1 0 0.01 0',
    academy: 'M20 29 V18 M20 21 Q14 21 13 15 Q19 15 20 21 M20 18 Q26 18 27 12 Q21 12 20 18',
    project: 'M12 29 H28 M15 29 V16 H25 V29 M15 16 L20 11 L25 16 M18 21 H22',
    column: 'M13 28 L27 14 L29 16 L15 30 Z M13 28 L12 31 L15 30 M24 17 L26 19',
    course: 'M11 14 Q20 11 20 14 Q20 11 29 14 V27 Q20 24 20 27 Q20 24 11 27 Z M20 14 V27',
    scout: 'M12 22 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M20 22 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M14 18 L16 12 H24 L26 18',
    study: 'M13 12 H24 L28 16 V29 H13 Z M24 12 V16 H28 M16 20 H25 M16 24 H22',
    negotiate: 'M10 22 L15 17 L20 20 L25 17 L30 22 M15 17 L12 14 M25 17 L28 14 M17 23 L20 26 L23 23',
  };
  return (
    <svg className="dk-art" viewBox="0 0 40 40" style={{ '--ink': colour } as CSSProperties} aria-hidden="true">
      <circle className="bg" cx="20" cy="20" r={r} strokeDasharray={ring ? undefined : '3 4'} />
      {ring && <circle className="rg" cx="20" cy="20" r={r} strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 20 20)" />}
      <path className="ln" d={draw[id] ?? 'M14 20 H26'} />
    </svg>
  );
}

/** The dice in their tray (board two, "The desk"): six across, a spent die greyed, the held one lifted and filled. */
function Tray({ tray, held, onPick }: { tray: ReturnType<typeof trayOf>; held?: Die; onPick: (d: Die) => void }) {
  if (!tray.dice.length) return <Note>No dice today: nothing was logged yesterday.</Note>;
  return (
    <div className="kd-tray" role="group" aria-label="Your dice">
      {tray.dice.map(({ die: d, spent }) => {
        const free = !spent;
        return (
          <button key={d.axis} type="button" className={`kd-die${free ? '' : ' spent'}`} style={ink(d.axis)} disabled={!free}
            aria-pressed={held?.axis === d.axis} aria-label={`${d.axis} ${d.value}${free ? '' : ', spent'}: ${d.reason}`} onClick={() => onPick(d)}>{d.value}</button>
        );
      })}
    </div>
  );
}

/** Tonight's door to the desk, beside the cups. */
export function DeskDoor({ t }: { t: Tonight }) {
  const m = useLiveQuery(() => loadDesk(t), [t]);
  if (!m || (!m.dice.length && !m.desk.spends.length)) return null;
  return (
    <section className="fb-card" style={{ '--k': '#93c3dc' } as CSSProperties} aria-labelledby="desk-door-h">
      <h2 id="desk-door-h" className="cup-h">The desk</h2>
      <p className="fb-s">{m.shut ? 'Closed for the night. Dice left became research.' : m.left.length ? `${WORDS[m.left.length] ?? m.left.length} ${m.left.length === 1 ? 'die' : 'dice'} from yesterday to spend.` : 'Every die spent today.'}</p>
      <button type="button" className="fb-btn pri" onClick={() => go('/football/desk')}>{m.shut ? 'Look at the desk' : 'To the desk'}</button>
    </section>
  );
}

/** p3-dice: today's dice in the morning parcel, each with the reason for its number. */
export function DiceTile({ dice, date, onNext, last }: { dice: Die[]; date: string; onNext: () => void; last: boolean }) {
  useEffect(() => { void freezeDice(date, dice); }, [date, dice]);
  return (
    <>
      <h2 className="dk-h">What yesterday gives you to spend</h2>
      {dice.map((d) => (
        <div key={d.axis} className="dk-dice-row">
          <span className="dk-die" style={ink(d.axis)} aria-hidden="true">{d.value}</span>
          <span style={{ flex: 1 }}><b style={{ color: AXIS_INK[d.axis] }}>{d.axis}</b>{d.form ? <span className="md-q"> · 28-day form</span> : null}<br /><span className="md-q">{d.reason}</span></span>
        </div>
      ))}
      <p className="md-q" style={{ margin: 0 }}>A 5 or 6 does a job well. A 1 or 2 does it badly, or with a risk you see first.</p>
      <div className="md-btns">
        <button type="button" className="md-btn" onClick={() => go('/football/desk')}>To the desk</button>
        <button type="button" className="md-btn ghost" onClick={onNext}>{last ? 'Done' : 'Next'}</button>
      </div>
    </>
  );
}

/** Every desk page: one way back and the page's name in the header, the "?" where the page has rules. */
function Page({ title, back = 'The desk', to = '/football/desk', help, children }: { title: string; back?: string; to?: string; help?: HowThisWorks; children: React.ReactNode }) {
  return <FootballHome section="club" inner={{ title, back, to, help }}><div className="k-page">{children}</div></FootballHome>;
}

/** /football/desk, /football/desk/job?id=, /football/desk/course?spend=, /football/desk/questions */
export function DeskRoute() {
  const t = useTonight();
  const { path, params } = useRoute();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  if (!t || !m) return <Page title="The desk" back="Club" to="/football/club"><Empty icon="desk" ink="#93c3dc" title="No desk yet" line="Football starts once you found the club." /></Page>;
  if (path === '/football/desk/questions') return <QuestionsPage />;
  if (path === '/football/desk/talk') return <TalkPage m={m} talk={params.get('talk') ?? ''} />;
  if (path === '/football/desk/course') return <CoursePage m={m} spend={params.get('spend') ?? m.courseOpen ?? ''} />;
  if (path === '/football/desk/job') {
    const def = jobById((params.get('id') ?? '') as JobId);
    if (def) return <SpendPage m={m} def={def} first={params.get('die') ?? undefined} pick={params.get('target') ?? undefined} />;
  }
  return <DeskHome m={m} />;
}

/** d3-home, on board two's "The desk": the dice lead, in their tray, then the jobs. Everything is in the page's flow: the
 * fifth job never sits under the tray, and nothing is pinned over the list. */
function DeskHome({ m }: { m: DeskModel }) {
  const [held, setHeld] = useState<Die | undefined>();
  const jobs = jobsForDesk(m.view);
  // One list for the count and the tray, so a dimmed die and the number always agree.
  const tray = trayOf(m.dice, spendsOn(m.desk, m.date));
  const open = (j: JobDef) => {
    // Talks have their own screen (w3-haggle): straight back into the open talk, else the market to pick one.
    if (j.id === 'negotiate') { const live = liveTalk(m.view); go(live ? '/football/desk/talk' : '/football/market', live ? { talk: live.talk } : undefined); return; }
    go('/football/desk/job', { id: j.id, ...(held ? { die: held.axis } : {}) });
  };
  const yesterday = WEEKDAY[(new Date(`${m.date}T12:00:00`).getDay() + 6) % 7];
  const left = tray.left.length;
  return (
    <Page title="The desk" back="Club" to="/football/club" help={DESK_HOW}>
      <div className="kb-lead">
        <Hero value={m.shut ? 'Shut' : left} ink="#93c3dc" label={m.shut ? 'for the night' : left === 1 ? 'die left' : 'dice left'} />
        <span className="k-r k-q">from {yesterday}</span>
      </div>
      {m.shut ? (
        <Note>{m.left.length ? `${WORDS[m.left.length]} ${m.left.length === 1 ? 'die' : 'dice'} left over: ${unspentResearch(m.left.length) ? `+${unspentResearch(m.left.length)} research when the night plays` : 'it takes two for a point of research'}.` : 'Every die was spent.'} New dice come with the morning.</Note>
      ) : (
        <>
          <Tray tray={tray} held={held} onPick={(d) => setHeld(held?.axis === d.axis ? undefined : d)} />
          <Note>{held ? `Holding ${held.axis} · ${held.value}. Now pick a job.` : left ? 'Pick up a die, then a job. Greyed dice are spent.' : 'Every die is spent. New dice come with the morning.'}</Note>
        </>
      )}
      {m.courseOpen && <Action wide onClick={() => go('/football/desk/course', { spend: m.courseOpen! })}>Finish today’s course</Action>}
      <Sect>On your desk</Sect>
      <div className="kb-rows">
        {jobs.map((j) => {
          const c = j.card(m.view), blocked = j.blocked?.(m.view);
          return (
            <Panel key={j.id} ink={j.ink} className="kd-job" onClick={() => open(j)} label={`${c.title}: ${blocked ?? c.line}. ${c.chip}`}>
              <span className="kb-mrow">
                <JobArt id={j.id} ring={c.ring} colour={j.ink} />
                <span style={{ flex: 1, minWidth: 0 }}><b style={{ color: j.ink }}>{c.title}</b><br /><span className="k-q">{blocked ?? c.line}</span></span>
                <b className="kb-right" style={{ color: j.ink }}>{c.chip}</b>
              </span>
            </Panel>
          );
        })}
      </div>
    </Page>
  );
}

/** d3-spend: two axes have their say, then exactly what this die would do. */
/** `pick`: a target chosen elsewhere (the atlas, a club's page), picked here first. A long list shows its first few. */
function SpendPage({ m, def, first, pick }: { m: DeskModel; def: JobDef; first?: string; pick?: string }) {
  const best = useMemo(() => [...m.left].sort((a, b) => b.value - a.value)[0], [m.left]);
  const [held, setHeld] = useState<Die | undefined>(() => m.left.find((d) => d.axis === first) ?? best);
  const targets = def.targets?.(m.view) ?? [];
  const [target, setTarget] = useState<string | undefined>(() => (targets.some((x) => x.id === pick) ? pick : targets[0]?.id));
  const [all, setAll] = useState(false);
  const shown = all || targets.length <= TARGETS_SHOWN ? targets : [...targets.filter((x) => x.id === target), ...targets.filter((x) => x.id !== target).slice(0, TARGETS_SHOWN - 1)];
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | undefined>();
  const card = def.card(m.view);
  const blocked = m.shut ? 'Closed for the night' : def.blocked?.(m.view);
  const p = held ? def.preview(held, m.view, target) : undefined;
  const voices = held ? speakers(held, m.dice).map((a) => m.dice.find((d) => d.axis === a)!).map((d, i) => ({ d, line: voiceLine(def.id, d, i) })) : [];
  const spend = async () => {
    if (!held) return;
    setBusy(true);
    try {
      const err = await spendAt(m.date, held, def.id, target);
      if (err) { setSaid(err === 'shut' ? 'The day is closed: the dice became research.' : 'That die can’t go there now.'); return; }
      if (def.id === 'course') { go('/football/desk/course', { spend: `${m.date}:${held.axis}` }, { replace: true }); return; }
      setSaid(`${p?.head ?? ''} ${p?.line ?? ''}`.trim());
    } finally { setBusy(false); }
  };
  const tray = trayOf(m.dice, spendsOn(m.desk, m.date));
  if (said) {
    return (
      <Page title={card.title}>
        <Panel ink={held ? AXIS_INK[held.axis] : GREEN}>
          <span className="kb-mrow">
            {held && <span className="kd-die" aria-hidden="true" style={{ ...ink(held.axis), background: AXIS_INK[held.axis], color: '#0d0f20', width: 48, flex: 'none' }}>{held.value}</span>}
            <span style={{ flex: 1 }}>{said}</span>
          </span>
        </Panel>
        {def.id !== 'watch' && <Note>{def.id === 'column' ? 'It runs in tomorrow’s paper.' : def.id === 'scout' ? 'A scout’s report comes with the morning parcel.' : def.id === 'study' ? 'It shows in the loan market now.' : 'It counts when the day plays, at 4 am. The desk shows it now.'}</Note>}
        <Action wide onClick={() => go('/football/desk', undefined, { replace: true })}>Back to the desk</Action>
      </Page>
    );
  }
  return (
    <Page title={card.title} help={DESK_HOW}>
      <h2 className="kd-q">{card.ask ?? `${card.title}?`}</h2>
      {voices.map(({ d, line }) => line && <p key={d.axis} className="kd-say"><b style={{ color: AXIS_INK[d.axis] }}>{d.axis.toUpperCase()}</b> — {line}</p>)}
      <Sect>Your dice</Sect>
      <Tray tray={tray} held={held} onPick={setHeld} />
      {targets.length > 0 && <Sect>Pick one</Sect>}
      {targets.length > 0 && (
        <div className="kb-rows" role="group" aria-label="Pick one">
          {shown.map((x) => (
            <button key={x.id} type="button" className="k-panel k-tap kd-target" style={{ '--ink': def.ink } as CSSProperties} aria-pressed={target === x.id} onClick={() => setTarget(x.id)}>
              <b>{x.name}</b>{x.line && <span className="k-q">{x.line}</span>}
            </button>
          ))}
          {shown.length < targets.length && <Action quiet onClick={() => setAll(true)}>Show all {targets.length}</Action>}
        </div>
      )}
      {held && p ? (
        <Panel ink={AXIS_INK[held.axis]}>
          <PanelTop name={`${held.axis} · ${held.value}`} c={AXIS_INK[held.axis]} right={<span className="k-num" style={{ fontSize: 22 }}>{p.gain}</span>} />
          <span>{p.head} {p.line}</span>
          {(p.others || p.risk) && <span className="k-q">{p.others}{p.risk ? ` Chance: ${p.risk.pct}%, ${p.risk.line}` : ''}</span>}
        </Panel>
      ) : (
        <Note>{m.left.length ? 'Pick up a die to see what it would do.' : 'Every die is spent today.'}</Note>
      )}
      {blocked && <Panel ink={CORAL} flat><span>{blocked}.</span></Panel>}
      {def.id === 'course' && <EyeNote passes={coursePasses(m.desk)} />}
      <Action wide disabled={!held || busy || Boolean(blocked) || (targets.length > 0 && !target)} onClick={() => void spend()}>
        {held ? `Spend the ${held.value}` : 'Pick up a die'}
      </Action>
    </Page>
  );
}

/** The manager's eye, and the owner's own questions: shown with the coaching course. */
function EyeNote({ passes }: { passes: number }) {
  const mine = useMineCount();
  const more = eyeChoices(passes), next = toNextEye(passes);
  return (
    <>
      <Note>Your eye for a player: level {eyeLevel(passes)}{more ? `, ${more} more card ${more === 1 ? 'choice' : 'choices'} after a cup win` : ''}.{next !== undefined ? ` ${next} more ${next === 1 ? 'pass' : 'passes'} to the next level.` : ''}</Note>
      <Action quiet onClick={() => go('/football/desk/questions')}>Your own questions{mine ? ` (${mine})` : ''}</Action>
    </>
  );
}

/** The coaching course: five questions, one at a time; a pass at 3 levels up the manager's eye. */
function CoursePage({ m, spend }: { m: DeskModel; spend: string }) {
  const sheet = useLiveQuery(() => courseSheet(m.desk, spend), [m.desk, spend]);
  if (sheet === undefined) return null;
  if (!sheet) return <Page title="Coaching course"><Empty icon="book" ink="#c2b2ff" title="No course here" line="Spend a die on the coaching course to start one." /></Page>;
  return <Course key={spend} sheet={sheet} date={m.date} passes={coursePasses(m.desk)} />;
}

function Course({ sheet, date, passes }: { sheet: CourseSheet; date: string; passes: number }) {
  const [answers, setAnswers] = useState<(string | null)[]>(() => sheet.done?.answers ?? sheet.draft?.answers ?? sheet.questions.map(() => null));
  const [at, setAt] = useState(() => { if (!sheet.draft) return 0; const i = sheet.draft.answers.findIndex((x) => x == null); return i < 0 ? sheet.questions.length - 1 : i; });
  const [helped, setHelped] = useState<string | undefined>(sheet.draft?.helped);
  const [done, setDone] = useState(sheet.done);
  const n = sheet.questions.length;
  if (done) {
    return (
      <Page title="Coaching course">
        <Hero value={`${done.right} of ${n}`} ink={done.passed ? GREEN : CORAL} label={done.passed ? 'right · passed' : 'right'} />
        <Note>{done.passed ? `Your eye for a player is at level ${eyeLevel(passes)}.` : `${PASS_AT} right passes. The questions stay in the pool for another day.`}</Note>
        <div className="kb-rows">
          {sheet.questions.map((q, i) => {
            const ok = isRight(q, done.answers[i] ?? null);
            return (
              <Panel key={q.id} ink={ok ? GREEN : CORAL}>
                <PanelTop name={`${i + 1}. ${ok ? 'Right' : `Answer: ${q.answer}`}`} c={ok ? GREEN : CORAL} right={q.year || q.section ? [sec(q.section), q.year].filter(Boolean).join(' ') : undefined} />
                <span>{q.prompt}</span>
                <span className="k-q">{q.explanation}</span>
              </Panel>
            );
          })}
        </div>
        <Action wide onClick={() => go('/football/desk', undefined, { replace: true })}>Back to the desk</Action>
      </Page>
    );
  }
  const q = sheet.questions[at];
  const a = answers[at];
  const set = (v: string | null) => { const next = answers.map((x, i) => (i === at ? v : x)); setAnswers(next); void saveDraft(sheet.spend, { answers: next, helped }); };
  const help = () => { setHelped(q.id); void saveDraft(sheet.spend, { answers, helped: q.id }); };
  const strikes = helped === q.id ? sheet.strikes[q.id] ?? [] : [];
  const hand = async () => { const r = await finishCourse(sheet.spend, answers, date); if (r) setDone(r); };
  return (
    <Page title={`Question ${at + 1} of ${n}`} back="Later">
      <span className="k-q">Coaching course{q.section ? ` · ${sec(q.section)}` : ''}{q.year ? ` · ${q.year}` : ''}</span>
      <div className="kd-pips" aria-hidden="true">{sheet.questions.map((x, i) => <i key={x.id} className={answers[i] != null ? 'on' : ''} />)}</div>
      {q.passage && <Passage title={q.passageTitle} text={q.passage} />}
      <p className="kd-q">{q.prompt}</p>
      {q.options ? (
        <div className="kb-rows" role="group" aria-label="Options">
          {q.options.map((o) => <button key={o} type="button" className="k-panel k-tap kd-target kd-choice" style={{ '--ink': '#c2b2ff' } as CSSProperties} aria-pressed={a === o} disabled={strikes.includes(o)} onClick={() => set(o)}>{o}</button>)}
        </div>
      ) : (
        <label className="k-col" style={{ gap: 6 }}><span className="k-q">Type your answer</span>
          <input className="kb-input" inputMode="decimal" value={a ?? ''} onChange={(e) => set(e.target.value || null)} />
        </label>
      )}
      {sheet.lifeline && q.options && !helped && <Action quiet onClick={help}>Lifeline: strike out two wrong options</Action>}
      <div className="kb-btns">
        {at > 0 ? <Action quiet onClick={() => setAt(at - 1)}>Back</Action> : <span />}
        {at < n - 1 ? <Action onClick={() => setAt(at + 1)}>Next</Action>
          : <Action disabled={answers.filter((x) => x != null).length === 0} onClick={() => void hand()}>Hand it in</Action>}
      </div>
      <Note>{COURSE_SIZE} questions, {PASS_AT} right to pass. A blank counts as wrong.</Note>
    </Page>
  );
}

/** The owner's own question file: imported on this phone, kept only here (and in your own backups). */
function QuestionsPage() {
  const count = useMineCount();
  const [msg, setMsg] = useState<{ added: number; errors: string[] } | undefined>();
  const [sure, setSure] = useState(false);
  const read = async (f: File | undefined) => {
    if (!f) return;
    const r = await importMine(await f.text(), f.name);
    setMsg({ added: r.added, errors: r.errors });
  };
  const tops = useLiveQuery(async () => {
    const all = await db.deskQuestions.toArray();
    const by = new Map<string, number>();
    for (const q of all) { const k = [q.section, q.year].filter(Boolean).join(' ') || 'No section or year'; by.set(k, (by.get(k) ?? 0) + 1); }
    return [...by.entries()].sort();
  }, []);
  return (
    <Page title="Your own questions" back="The desk">
      <Hero value={count ?? 0} ink="#c2b2ff" label={count === 1 ? 'of your own in the course' : 'of your own in the course'} />
      <span>A JSON or CSV file you prepared. Each question needs the question, the options (or none, for a typed answer), the answer and an explanation; year and section are optional. They mix into the coaching course.</span>
      <Note>Kept only on this phone, in your own backups, never in the app’s code.</Note>
      <label className="k-act wide kd-file">Choose a file
        <input type="file" accept=".json,.csv,application/json,text/csv" style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} onChange={(e) => void read(e.target.files?.[0])} />
      </label>
      {msg && (
        <Panel ink={msg.added ? GREEN : CORAL}>
          <b>{msg.added ? `${msg.added} added.` : 'Nothing new added.'}</b>
          {msg.errors.length > 0 && <ul className="dk-errs">{msg.errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}{msg.errors.length > 12 && <li>and {msg.errors.length - 12} more.</li>}</ul>}
        </Panel>
      )}
      {tops && tops.length > 0 && (
        <Panel ink="#c2b2ff">
          {tops.map(([k, n]) => <div key={k} className="k-row" style={{ minHeight: 32 }}><span>{k}</span><b>{n}</b></div>)}
        </Panel>
      )}
      {count ? (sure
        ? <div className="kb-btns"><Action onClick={() => { void clearMine(); setSure(false); setMsg(undefined); }}>Remove all {count}</Action><Action quiet onClick={() => setSure(false)}>Keep them</Action></div>
        : <Action quiet onClick={() => setSure(true)}>Remove my questions</Action>) : null}
    </Page>
  );
}

/** A reading passage or a data set: paragraphs, and Markdown tables drawn as tables. */
function Passage({ title, text }: { title?: string; text: string }) {
  const blocks = text.split(/\n\s*\n/);
  return (
    <div className="dk-passage">
      {title && <b className="dk-ptitle">{title}</b>}
      {blocks.map((b, i) => {
        const rows = b.trim().split('\n');
        if (!rows.every((r) => r.trim().startsWith('|'))) return <p key={i}>{b}</p>;
        const cells = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r.trim())).map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
        const [head, ...body] = cells;
        return (
          <table key={i} className="dk-table">
            <thead><tr>{head.map((c, j) => <th key={j} scope="col">{c}</th>)}</tr></thead>
            <tbody>{body.map((r, k) => <tr key={k}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>)}</tbody>
          </table>
        );
      })}
    </div>
  );
}
