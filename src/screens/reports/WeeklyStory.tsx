import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { saveBackup } from '../../db/backup';
import { db } from '../../db/db';
import { useAllDays, useAllEntries, useAllSets, useFoods, useSessions, useSettings, useSightings, useToday } from '../../db/hooks';
import { addDays } from '../../domain/dates';
import { backupLine } from '../../domain/dueLines';
import { fmtDayMonth, fmtInt } from '../../domain/format';
import { lastFullWeek, suggestOneThing, weekNumber, weekStats } from '../../domain/weekly';
import { storyChapters, type StoryChapter } from '../../domain/weeklyStory';
import { usualWake } from '../../domain/wake';
import { back, go, useRoute } from '../../router';
import { Icon } from '../../ui/Icon';
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
  const toast = useToast();
  const latest = lastFullWeek(today);
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

  return (
    <RegionFrame className="bare yu-page">
      <div className="yu-stack">
        <button type="button" className="backlink" onClick={() => back('/reports')}><Icon name="left" size={20} stroke={1.8} />Reports</button>
        <h1>Week {weekNumber(week)}, the story</h1>
        <span className="yu-q">{fmtDayMonth(week)} to {fmtDayMonth(end)}</span>
        {!chapters.length && <div className="yu-card"><b>Nothing was logged that week</b><span className="yu-q">A story needs at least one day.</span></div>}
        {chapters.map((c) => <Chapter key={c.id} c={c} />)}
        <WeekLine start={week} />
        {note?.oneThing && (
          <section className="yu-sec"><h2>The one thing you picked</h2>
            <div className="yu-card">
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
            <div className="yu-card">
              <textarea className="yu-note" rows={2} aria-label="One thing for this week" value={text} onChange={(e) => setDraft(e.target.value)} />
              <button type="button" className="btn sm" onClick={async () => {
                await db.weeks.put({ ...(nextNote ?? { id: nextWeek }), oneThing: text });
                toast({ text: 'Saved for this week', sub: "Next week's story asks how it went." });
              }}>{nextNote?.oneThing === text ? 'Saved' : 'Keep this'}</button>
            </div>
          </section>
        )}
        <CorrectionNotes from={week} to={end} list={corrections} />
        {backup?.id === 'backup' && (
          <section className="yu-sec"><h2>Backup</h2>
            <div className="yu-card">
              <span>{backup.text}</span>
              {line && <button type="button" className="btn sm" onClick={async () => {
                try {
                  const r = await saveBackup();
                  if (r !== 'cancelled') toast({ text: 'Backup saved', tone: 'sage' });
                } catch (e) {
                  toast({ text: (e as Error).message });
                }
              }}>Back up now</button>}
            </div>
          </section>
        )}
        <button type="button" className="link" onClick={() => go('/reports/archive')}>Every past week and month</button>
      </div>
    </RegionFrame>
  );
}
