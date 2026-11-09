import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ReactNode } from 'react';
import { saveBackup } from '../../db/backup';
import { db } from '../../db/db';
import { saveMeasurement } from '../../db/actions';
import { useAllDays, useAllEntries, useAllSets, useFoods, useMeasurements, useSessions, useSettings, useSightings, useToday } from '../../db/hooks';
import { addDays, weekStart, type DayKey } from '../../domain/dates';
import type { Measurement } from '../../domain/types';
import { backupLine } from '../../domain/dueLines';
import { fmtDayMonth, fmtInt } from '../../domain/format';
import { storyWeek, suggestOneThing, weekNumber, weekStats } from '../../domain/weekly';
import { storyChapters, type StoryChapter } from '../../domain/weeklyStory';
import { usualWake } from '../../domain/wake';
import { back, go, useRoute } from '../../router';
import { Story, type StoryCard } from '../../ui/Story';
import { RegionFrame } from '../../ui/live/RegionFrame';
import { useToast } from '../../ui/Toasts';
import { HUE, GOLD } from '../../ui/you/palette';
import { Reveal } from '../../ui/you/Reveal';
import { WalkVista } from '../../walk/WalkVista';
import { STORY_SEEN_KEY } from '../you/DueLines';
import { CorrectionNotes } from './CorrectionNotes';
import { WeekLine } from '../football/HabitLine';

const km = (n: number) => `${fmtInt(n)} km`;

function Chapter({ c }: { c: StoryChapter }) {
  switch (c.id) {
    case 'road':
      return (
        <section className="yu-sec"><h2>On the road</h2>
          <div className="yu-story">
            <WalkVista km={c.toKm} todayKm={0} />
            <div className="yu-story-b">
              <div className="yu-h2">{c.km >= 1 ? `${km(c.km)} this week` : 'A short week on the road'}</div>
              <span className="yu-q">Around {c.reached}.{c.ahead && c.aheadKm !== undefined ? ` ${c.ahead} is ${km(c.aheadKm)} ahead.` : ''}</span>
            </div>
          </div>
        </section>
      );
    case 'tally':
      return (
        <section className="yu-sec"><h2>The tally</h2>
          <Reveal className="yu-spread">
            {c.steps !== undefined && <div><b style={{ color: HUE.steps }}>{fmtInt(c.steps)}</b><span>steps</span></div>}
            {c.sessions > 0 && <div><b style={{ color: HUE.train }}>{c.sessions}</b><span>session{c.sessions === 1 ? '' : 's'}</span></div>}
            {c.records > 0 && <div><b style={{ color: GOLD }}>{c.records}</b><span>record{c.records === 1 ? '' : 's'}</span></div>}
            {c.perfect > 0 && <div><b style={{ color: GOLD }}>{c.perfect}</b><span>perfect day{c.perfect === 1 ? '' : 's'}</span></div>}
          </Reveal>
        </section>
      );
    case 'swing':
      return (
        <section className="yu-sec"><h2>The swing</h2>
          <div className="yu-card"><b>{c.what}: {c.now}</b><span className="yu-q">{c.up ? 'Up' : 'Down'} from {c.was} the week before.</span></div>
        </section>
      );
    case 'food':
      return (
        <section className="yu-sec"><h2>Food</h2>
          <div className="yu-card yu-tint" style={{ '--c': HUE.food } as React.CSSProperties}>
            <b>{c.proteinAvg !== undefined ? `${fmtInt(c.proteinAvg)} g protein a day` : `${c.foodDays} days logged`}</b>
            <span className="yu-q">{c.foodDays} day{c.foodDays === 1 ? '' : 's'} logged, {c.inRange} in range.</span>
          </div>
        </section>
      );
    case 'sleep':
      return (
        <section className="yu-sec"><h2>Sleep</h2>
          <div className="yu-card yu-tint" style={{ '--c': HUE.sleep } as React.CSSProperties}>
            <b>{c.avg} a night</b><span className="yu-q">Over {c.nights} logged night{c.nights === 1 ? '' : 's'}.</span>
          </div>
        </section>
      );
    case 'training': {
      const names = [...new Set(c.records.map((r) => r.exercise).filter(Boolean))];
      return (
        <section className="yu-sec"><h2>Training</h2>
          <div className="yu-card yu-tint" style={{ '--c': HUE.train } as React.CSSProperties}>
            <b>{c.sessions} of {c.perWeek} sessions</b>
            <span className="yu-q">{fmtInt(c.sets)} sets, {c.restDays} rest day{c.restDays === 1 ? '' : 's'}.{names.length ? ` Records: ${names.join(', ')}.` : ''}</span>
          </div>
        </section>
      );
    }
    case 'finding':
      return (
        <section className="yu-sec"><h2>One finding</h2>
          <div className="yu-card"><span>{c.finding.text}</span><span className="yu-q">{c.finding.working}</span></div>
        </section>
      );
    case 'next':
      return (
        <section className="yu-sec"><h2>Next week</h2>
          <div className="yu-card yu-tint" style={{ '--c': HUE.walk } as React.CSSProperties}>
            {c.stop && c.stepsPerDay !== undefined && c.by
              ? <><b>{c.stop} is next</b><span className="yu-q">{fmtInt(c.stepsPerDay)} steps a day gets you there by {fmtDayMonth(c.by)}.</span></>
              : <b>The road is walked. Carry on as you like.</b>}
          </div>
        </section>
      );
    case 'backup':
      return null;
  }
}

/** The Sunday waist, inside the story: one number in inches. The trend is shown, never a target. */
function WaistCard({ today, week, measurements }: { today: DayKey; week: DayKey; measurements: Measurement[] }) {
  const toast = useToast();
  const ws = weekStart(today);
  const thisWeek = measurements.filter((m) => m.waistStanding !== undefined && m.date >= ws && m.date <= today).sort((a, b) => b.at - a.at)[0];
  const before = measurements.filter((m) => m.waistStanding !== undefined && m.date < (thisWeek?.date ?? ws)).sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at)[0];
  const [val, setVal] = useState<string>(thisWeek?.waistStanding !== undefined ? String(thisWeek.waistStanding) : '');
  const n = Number(val);
  const ok = val !== '' && Number.isFinite(n) && n >= 20 && n <= 70;
  const save = async () => {
    if (!ok) return;
    await saveMeasurement({ id: thisWeek?.id, date: thisWeek?.date ?? today, waistStanding: Math.round(n * 4) / 4 });
    toast({ text: `Waist saved · ${n} in`, tone: 'sage' });
  };
  return (
    <section className="yu-sec"><h2>Sunday waist</h2>
      <div className="yu-card ws-live">
        <label className="ws-waist">
          <span>Standing, stomach tucked in, at the navel</span>
          <span className="ws-in"><input type="number" inputMode="decimal" step="0.25" min="20" max="70" value={val} placeholder="—" aria-label="Waist in inches" onChange={(e) => setVal(e.target.value)} /><em>in</em></span>
        </label>
        <button type="button" className="btn lg block" disabled={!ok} onClick={() => void save()}>{thisWeek && Number(val) === thisWeek.waistStanding ? 'Saved' : 'Save the waist'}</button>
        {before?.waistStanding !== undefined && <span className="yu-q">Last time: {before.waistStanding} in on {fmtDayMonth(before.date)}. Waist moves slowly; the trend over weeks is what counts.</span>}
        <span className="yu-q">For week {weekNumber(week)}’s story.</span>
      </div>
    </section>
  );
}

/** The one weekly story. It reads that week's data only, so an old week opens as it was. */
export function WeeklyStory() {
  const { params } = useRoute();
  const today = useToday();
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const sets = useAllSets();
  const foods = useFoods();
  const sightings = useSightings();
  const measurements = useMeasurements();
  const toast = useToast();
  const latest = storyWeek(today);
  const week = params.get('w') ?? latest;
  const nextWeek = addDays(week, 7);
  const note = useLiveQuery(() => db.weeks.get(week), [week]);
  const nextNote = useLiveQuery(() => db.weeks.get(nextWeek), [nextWeek]);
  const corrections = useLiveQuery(() => db.corrections.toArray(), []);
  const [draft, setDraft] = useState<string | null>(null);
  const current = week === latest;

  useEffect(() => {
    if (!current) return;
    void db.weeks.get(week).then((n) => db.weeks.put({ ...(n ?? { id: week }), recapSeenAt: Date.now() }));
    try {
      localStorage.setItem(STORY_SEEN_KEY, week);
    } catch {
      // Then the line stays on the You page a little longer. Nothing is lost.
    }
  }, [week, current]);

  if (!settings || !days || !entries || !sessions || !sets || !foods || !sightings || !corrections) return <RegionFrame className="bare yu-page" />;
  const end = addDays(week, 6);
  const line = current ? backupLine(settings, today, days) : undefined;
  const last = Math.max(settings.backup.lastQuick ?? 0, settings.backup.lastFull ?? 0);
  const chapters = storyChapters(week, { settings, days, entries, sessions, sets, sightings, backupText: current ? line ?? (last ? 'Your backup is up to date.' : undefined) : undefined });
  const backup = chapters.find((c) => c.id === 'backup');
  const suggestion = suggestOneThing(weekStats(settings, week, days, entries, sessions, sets), settings, foods, usualWake(days, end));
  const text = draft ?? nextNote?.oneThing ?? suggestion;

  const byId = (id: StoryChapter['id']) => chapters.find((c) => c.id === id);
  const show = (c: StoryChapter | undefined) => (c ? <Chapter c={c} /> : null);
  const pair = (a: StoryChapter['id'], b: StoryChapter['id']) => (byId(a) || byId(b) ? <>{show(byId(a))}{show(byId(b))}</> : null);
  const backUp = async () => {
    try {
      const r = await saveBackup();
      if (r !== 'cancelled') toast({ text: 'Backup saved', tone: 'sage' });
    } catch (e) {
      toast({ text: (e as Error).message });
    }
  };

  // One Sunday story (R4 6): up to seven tap-through cards. Empty cards drop out; the waist sits inside, Backup is last.
  const cards: StoryCard[] = [];
  const add = (id: string, body: ReactNode, ground?: string) => { if (body) cards.push({ id, body, ground }); };
  add('cover', (
    <>
      <p className="ws-kicker">{fmtDayMonth(week)} to {fmtDayMonth(end)}</p>
      <h1 className="ws-title">Week {weekNumber(week)}, the story</h1>
      {!chapters.length ? <div className="yu-card"><b>Nothing was logged that week</b><span className="yu-q">A story needs at least one day.</span></div> : show(byId('road'))}
      <p className="ws-hint">Tap the right side to go on, the left to go back.</p>
    </>
  ), 'linear-gradient(170deg, #2a2350, #0f1022)');
  add('tally', byId('tally') || byId('swing') ? <>{show(byId('tally'))}{show(byId('swing'))}<WeekLine start={week} /></> : null, 'linear-gradient(170deg, #3a2a12, #120e0a)');
  add('fuel', pair('food', 'sleep'), 'linear-gradient(170deg, #2b1f45, #0e0c1a)');
  add('training', pair('training', 'finding'), 'linear-gradient(170deg, #12304a, #0a1220)');
  if (current) add('waist', <WaistCard today={today} week={week} measurements={measurements ?? []} />, 'linear-gradient(170deg, #173a5a, #0a1626)');
  add('next', (
    <>
      {show(byId('next'))}
      {note?.oneThing && (
        <section className="yu-sec"><h2>The one thing you picked</h2>
          <div className="yu-card ws-live">
            <span>{note.oneThing}</span>
            {current ? (
              <div className="yu-choices" role="group" aria-label="Did it happen?">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" aria-pressed={note.done === v} className={note.done === v ? 'on' : undefined} onClick={() => db.weeks.put({ ...note, done: v })}>{v ? 'It happened' : 'Not this time'}</button>
                ))}
              </div>
            ) : note.done !== undefined && <span className="yu-q">{note.done ? 'It happened.' : 'Not that time.'}</span>}
          </div>
        </section>
      )}
      {current && chapters.length > 0 && (
        <section className="yu-sec"><h2>One thing for this week</h2>
          <div className="yu-card ws-live">
            <textarea className="yu-note" rows={4} aria-label="One thing for this week" value={text} onChange={(e) => setDraft(e.target.value)} />
            <button type="button" className="btn sm" onClick={async () => {
              await db.weeks.put({ ...(nextNote ?? { id: nextWeek }), oneThing: text });
              toast({ text: 'Saved for this week', sub: "Next week's story asks how it went." });
            }}>{nextNote?.oneThing === text ? 'Saved' : 'Keep this'}</button>
          </div>
        </section>
      )}
      <CorrectionNotes from={week} to={end} list={corrections} />
    </>
  ), 'linear-gradient(170deg, #1f3a2a, #0b140f)');
  add('backup', (
    <section className="yu-sec"><h2>{current ? 'Backup, then done' : 'That was the week'}</h2>
      <div className="yu-card ws-live">
        <span>{backup?.id === 'backup' ? backup.text : 'Your data stays on this phone. A backup keeps a copy safe.'}</span>
        {current && <button type="button" className="btn lg block" onClick={() => void backUp()}>Backup</button>}
        <button type="button" className="link" onClick={() => go('/reports/archive')}>Every past week and month</button>
      </div>
    </section>
  ), 'linear-gradient(170deg, #2a2440, #0e0d18)');

  const start = params.get('card') ? Math.max(0, cards.findIndex((c) => c.id === params.get('card'))) : 0;
  return (
    <>
      <RegionFrame className="bare yu-page" />
      <Story key={`${week}:${params.get('card') ?? ''}`} cards={cards} start={start} className="yu-page ws" label={`Week ${weekNumber(week)}, the story`} onClose={() => back('/reports')} />
    </>
  );
}
