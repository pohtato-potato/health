// The manager's desk (desk spec §2–3, §8, §13): the door on Tonight, the desk (d3-home), spending a die (d3-spend),
// the coaching course, and the owner's own questions. Taps write only the desk's own record (store/desk.ts).
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { COURSE_SIZE, eyeChoices, eyeLevel, isRight, PASS_AT, toNextEye } from '../../../football/desk/course';
import { coursePasses, unspentResearch } from '../../../football/desk/rules';
import type { Die, JobDef, JobId } from '../../../football/desk/types';
import { speakers, voiceLine } from '../../../football/desk/words';
import { clearMine, courseSheet, saveDraft, finishCourse, freezeDice, importMine, jobById, jobsForDesk, loadDesk, spendAt, useMineCount, type CourseSheet, type DeskModel } from '../../../football/store/desk';
import { useTonight, type Tonight } from '../../../football/store/hooks';
import { go, useRoute } from '../../../router';
import { AXIS_INK } from '../../../ui/inks';
import { FootballHome } from '../FootballHome';
import '../../../styles/matchday.css';
import '../../../styles/desk.css';

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (d: string) => WEEKDAY[new Date(`${d}T12:00:00`).getDay()];
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const SECTION: Record<string, string> = { quant: 'Quant', verbal: 'Verbal', lr: 'Logical reasoning', di: 'Data interpretation' };
const sec = (x?: string) => (x ? SECTION[x] ?? x : '');
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
  };
  return (
    <svg className="dk-art" viewBox="0 0 40 40" style={{ '--ink': colour } as CSSProperties} aria-hidden="true">
      <circle className="bg" cx="20" cy="20" r={r} strokeDasharray={ring ? undefined : '3 4'} />
      {ring && <circle className="rg" cx="20" cy="20" r={r} strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 20 20)" />}
      <path className="ln" d={draw[id] ?? 'M14 20 H26'} />
    </svg>
  );
}

function Tray({ dice, left, held, onPick }: { dice: Die[]; left: Die[]; held?: Die; onPick: (d: Die) => void }) {
  if (!dice.length) return <div className="dk-tray empty">No dice today: nothing was logged yesterday.</div>;
  return (
    <div className="dk-tray" role="group" aria-label="Your dice">
      {dice.map((d) => {
        const free = left.some((x) => x.axis === d.axis);
        return (
          <button key={d.axis} type="button" className={`dk-die${free ? '' : ' spent'}`} style={ink(d.axis)} disabled={!free}
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

const Page = ({ children }: { children: React.ReactNode }) => <main className="md-page desk"><div className="md-in">{children}</div></main>;
const Back = ({ to = '/football', label = 'Back' }: { to?: string; label?: string }) => (
  <button type="button" className="md-q" onClick={() => go(to)} style={{ minHeight: 44, minWidth: 64, background: 'none', border: 0, color: 'inherit', font: 'inherit', cursor: 'pointer', textAlign: 'right' }}>{label}</button>
);

/** /football/desk, /football/desk/job?id=, /football/desk/course?spend=, /football/desk/questions */
export function DeskRoute() {
  const t = useTonight();
  const { path, params } = useRoute();
  const m = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  if (t === undefined || m === undefined) return null;
  if (!t || !m) return <FootballHome section="tonight"><p className="fb-s">Football starts once you found the club.</p></FootballHome>;
  if (path === '/football/desk/questions') return <QuestionsPage />;
  if (path === '/football/desk/course') return <CoursePage m={m} spend={params.get('spend') ?? m.courseOpen ?? ''} />;
  if (path === '/football/desk/job') {
    const def = jobById((params.get('id') ?? '') as JobId);
    if (def) return <SpendPage m={m} def={def} first={params.get('die') ?? undefined} />;
  }
  return <DeskHome m={m} />;
}

/** d3-home: the jobs on top, the dice in a tray at the bottom within reach of the thumb. */
function DeskHome({ m }: { m: DeskModel }) {
  const [held, setHeld] = useState<Die | undefined>();
  const jobs = jobsForDesk(m.view);
  const open = (j: JobDef) => go('/football/desk/job', { id: j.id, ...(held ? { die: held.axis } : {}) });
  return (
    <Page>
      <div className="md-top"><span className="md-cap">The desk · {weekday(m.date)}</span><span className="md-q">Dice left: {m.left.length}</span></div>
      <h1 className="dk-h">{m.shut ? 'The desk is closed for the night' : `${WORDS[jobs.length] ?? jobs.length} ${jobs.length === 1 ? 'thing' : 'things'} on your desk`}</h1>
      {m.shut && <p className="md-q" style={{ margin: 0 }}>{m.left.length ? `${WORDS[m.left.length]} ${m.left.length === 1 ? 'die' : 'dice'} left over: ${unspentResearch(m.left.length) ? `+${unspentResearch(m.left.length)} research when the night plays` : 'it takes two for a point of research'}.` : 'Every die was spent.'} New dice come with the morning.</p>}
      {m.courseOpen && <button type="button" className="md-btn" onClick={() => go('/football/desk/course', { spend: m.courseOpen! })}>Finish today’s course</button>}
      <div className="dk-jobs">
        {jobs.map((j) => {
          const c = j.card(m.view), blocked = j.blocked?.(m.view);
          return (
            <button key={j.id} type="button" className="dk-job" style={{ '--ink': j.ink } as CSSProperties} aria-disabled={Boolean(blocked) || m.shut} onClick={() => open(j)}>
              <JobArt id={j.id} ring={c.ring} colour={j.ink} />
              <span><b>{c.title}</b><br /><span className="md-q">{blocked ?? c.line}</span></span>
              <span className="dk-chip">{c.chip}</span>
            </button>
          );
        })}
      </div>
      <div className="md-fill" />
      {!m.shut && (
        <div className="dk-foot">
          <span className="md-cap">{held ? `Holding ${held.axis} · ${held.value}. Pick a job.` : 'Your dice. Pick one up.'}</span>
          <Tray dice={m.dice} left={m.left} held={held} onPick={(d) => setHeld(held?.axis === d.axis ? undefined : d)} />
        </div>
      )}
    </Page>
  );
}

/** d3-spend: two axes have their say, then exactly what this die would do. */
function SpendPage({ m, def, first }: { m: DeskModel; def: JobDef; first?: string }) {
  const best = useMemo(() => [...m.left].sort((a, b) => b.value - a.value)[0], [m.left]);
  const [held, setHeld] = useState<Die | undefined>(() => m.left.find((d) => d.axis === first) ?? best);
  const targets = def.targets?.(m.view) ?? [];
  const [target, setTarget] = useState<string | undefined>(targets[0]?.id);
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
  if (said) {
    return (
      <Page>
        <div className="md-top"><span className="md-cap">{card.title}</span><Back to="/football/desk" label="The desk" /></div>
        <div className="dk-opt dk-done" style={held ? ink(held.axis) : undefined}>
          {held && <span className="dk-die" aria-hidden="true" style={{ background: AXIS_INK[held.axis], color: '#0d0f20' }}>{held.value}</span>}
          <span style={{ flex: 1 }}>{said}</span>
        </div>
        {def.id !== 'watch' && <p className="md-q" style={{ margin: 0 }}>{def.id === 'column' ? 'It runs in tomorrow’s paper.' : 'It counts when the day plays, at 4 am. The desk shows it now.'}</p>}
        <button type="button" className="md-btn" onClick={() => go('/football/desk', undefined, { replace: true })}>Back to the desk</button>
      </Page>
    );
  }
  return (
    <Page>
      <div className="md-top"><span className="md-cap">{card.title}</span><Back to="/football/desk" label="The desk" /></div>
      <h1 className="dk-h">{card.ask ?? `${card.title}?`}</h1>
      {voices.map(({ d, line }) => line && <p key={d.axis} className="dk-say"><b style={{ color: AXIS_INK[d.axis] }}>{d.axis.toUpperCase()}</b> — {line}</p>)}
      {targets.length > 0 && (
        <div className="dk-targets" role="group" aria-label="Pick one">
          {targets.map((x) => (
            <button key={x.id} type="button" className="dk-target" style={{ '--ink': def.ink } as CSSProperties} aria-pressed={target === x.id} onClick={() => setTarget(x.id)}>
              <span>{x.name}</span>{x.line && <span className="md-q">{x.line}</span>}
            </button>
          ))}
        </div>
      )}
      {held && p ? (
        <>
          <span className="md-cap">With the die you are holding</span>
          <div className="dk-opt" style={ink(held.axis)}>
            <span><b style={{ color: AXIS_INK[held.axis] }}>{held.axis} · {held.value}</b><br /><span className="md-q">{p.head} {p.line}</span></span>
            <b className="n">{p.gain}</b>
          </div>
          <p className="md-q" style={{ margin: 0 }}>{p.others}{p.risk ? ` Chance: ${p.risk.pct}%, ${p.risk.line}` : ''}</p>
        </>
      ) : (
        <p className="md-q" style={{ margin: 0 }}>{m.left.length ? 'Pick up a die to see what it would do.' : 'Every die is spent today.'}</p>
      )}
      {blocked && <p className="md-q" style={{ margin: 0 }}>{blocked}.</p>}
      {def.id === 'course' && <EyeNote passes={coursePasses(m.desk)} />}
      <div className="md-fill" />
      <div className="dk-foot flow">
      <Tray dice={m.dice} left={m.left} held={held} onPick={setHeld} />
      <button type="button" className="md-btn" disabled={!held || busy || Boolean(blocked) || (targets.length > 0 && !target)} onClick={() => void spend()}>
        {held ? `Spend the ${held.value}` : 'Pick up a die'}
      </button>
      </div>
    </Page>
  );
}

/** The manager's eye, and the owner's own questions: shown with the coaching course. */
function EyeNote({ passes }: { passes: number }) {
  const mine = useMineCount();
  const more = eyeChoices(passes), next = toNextEye(passes);
  return (
    <>
      <p className="md-q" style={{ margin: 0 }}>Your eye for a player: level {eyeLevel(passes)}{more ? `, ${more} more card ${more === 1 ? 'choice' : 'choices'} after a cup win` : ''}.{next !== undefined ? ` ${next} more ${next === 1 ? 'pass' : 'passes'} to the next level.` : ''}</p>
      <button type="button" className="md-btn ghost" onClick={() => go('/football/desk/questions')}>Your own questions{mine ? ` (${mine})` : ''}</button>
    </>
  );
}

/** The coaching course: five questions, one at a time; a pass at 3 levels up the manager's eye. */
function CoursePage({ m, spend }: { m: DeskModel; spend: string }) {
  const sheet = useLiveQuery(() => courseSheet(m.desk, spend), [m.desk, spend]);
  if (sheet === undefined) return null;
  if (!sheet) return <Page><div className="md-top"><span className="md-cap">Coaching course</span><Back to="/football/desk" label="The desk" /></div><p>No course here.</p></Page>;
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
      <Page>
        <div className="md-top"><span className="md-cap">Coaching course</span><Back to="/football/desk" label="The desk" /></div>
        <h1 className="dk-h">{done.right} of {n} right{done.passed ? '. Passed.' : '.'}</h1>
        <p className="md-q" style={{ margin: 0 }}>{done.passed ? `Your eye for a player is at level ${eyeLevel(passes)}.` : `${PASS_AT} right passes. The questions stay in the pool for another day.`}</p>
        {sheet.questions.map((q, i) => (
          <div key={q.id} className="dk-opt" style={{ '--ink': isRight(q, done.answers[i] ?? null) ? '#8fdcb6' : '#ff9a76', flexDirection: 'column', alignItems: 'stretch' } as CSSProperties}>
            <span className={`dk-mark ${isRight(q, done.answers[i] ?? null) ? 'right' : 'wrong'}`}>{i + 1}. {isRight(q, done.answers[i] ?? null) ? 'Right' : `Answer: ${q.answer}`}{q.year || q.section ? ` · ${[sec(q.section), q.year].filter(Boolean).join(' ')}` : ''}</span>
            <span>{q.prompt}</span>
            <span className="md-q">{q.explanation}</span>
          </div>
        ))}
        <button type="button" className="md-btn" onClick={() => go('/football/desk', undefined, { replace: true })}>Back to the desk</button>
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
    <Page>
      <div className="md-top"><span className="md-cap">Question {at + 1} of {n}{q.section ? ` · ${sec(q.section)}` : ''}{q.year ? ` · ${q.year}` : ''}</span><Back to="/football/desk" label="Later" /></div>
      <div className="dk-pips" aria-hidden="true">{sheet.questions.map((x, i) => <i key={x.id} className={answers[i] != null ? 'on' : ''} />)}</div>
      {q.passage && <p className="dk-passage">{q.passage}</p>}
      <p className="dk-q">{q.prompt}</p>
      {q.options ? (
        <div className="dk-targets" role="group" aria-label="Options">
          {q.options.map((o) => <button key={o} type="button" className="dk-choice" aria-pressed={a === o} disabled={strikes.includes(o)} onClick={() => set(o)}>{o}</button>)}
        </div>
      ) : (
        <label className="md-q">Type your answer
          <input className="dk-input" inputMode="decimal" value={a ?? ''} onChange={(e) => set(e.target.value || null)} />
        </label>
      )}
      {sheet.lifeline && q.options && !helped && <button type="button" className="md-btn ghost" onClick={help}>Lifeline: strike out two wrong options</button>}
      <div className="md-fill" />
      <div className="md-btns">
        {at > 0 && <button type="button" className="md-btn ghost" onClick={() => setAt(at - 1)}>Back</button>}
        {at < n - 1 ? <button type="button" className="md-btn" onClick={() => setAt(at + 1)}>Next</button>
          : <button type="button" className="md-btn" disabled={answers.filter((x) => x != null).length === 0} onClick={() => void hand()}>Hand it in</button>}
      </div>
      <p className="md-q" style={{ margin: 0 }}>{COURSE_SIZE} questions, {PASS_AT} right to pass. A blank counts as wrong.</p>
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
    <Page>
      <div className="md-top"><span className="md-cap">Your own questions</span><Back to="/football/desk" label="The desk" /></div>
      <h1 className="dk-h">{count ? `${count} of your own in the course` : 'Add your own questions'}</h1>
      <p style={{ margin: 0 }}>A JSON or CSV file you prepared. Each question needs the question, the options (or none, for a typed answer), the answer and an explanation; year and section are optional. They mix into the coaching course.</p>
      <p className="md-q" style={{ margin: 0 }}>Kept only on this phone, in your own backups, never in the app’s code.</p>
      <label className="md-btn dk-file">Choose a file
        <input type="file" accept=".json,.csv,application/json,text/csv" style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} onChange={(e) => void read(e.target.files?.[0])} />
      </label>
      {msg && (
        <div className="dk-opt" style={{ '--ink': msg.added ? '#8fdcb6' : '#ff9a76', flexDirection: 'column', alignItems: 'stretch' } as CSSProperties}>
          <b>{msg.added ? `${msg.added} added.` : 'Nothing new added.'}</b>
          {msg.errors.length > 0 && <ul className="dk-errs">{msg.errors.slice(0, 12).map((e) => <li key={e}>{e}</li>)}{msg.errors.length > 12 && <li>and {msg.errors.length - 12} more.</li>}</ul>}
        </div>
      )}
      {tops && tops.length > 0 && <div className="dk-jobs">{tops.map(([k, n]) => <div key={k} className="md-row"><span>{k}</span><b>{n}</b></div>)}</div>}
      <div className="md-fill" />
      {count ? (sure
        ? <div className="md-btns"><button type="button" className="md-btn" onClick={() => { void clearMine(); setSure(false); setMsg(undefined); }}>Remove all {count}</button><button type="button" className="md-btn ghost" onClick={() => setSure(false)}>Keep them</button></div>
        : <button type="button" className="md-btn ghost" onClick={() => setSure(true)}>Remove my questions</button>) : null}
    </Page>
  );
}

