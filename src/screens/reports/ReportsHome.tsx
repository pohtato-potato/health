import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useToday } from '../../db/hooks';
import { spokenLine } from '../../domain/voice';
import { fmtDayMonth, fmtInt } from '../../domain/format';
import { addDays } from '../../domain/dates';
import { monthLabel } from '../../domain/goTo';
import { monthsWithData } from '../../domain/monthReport';
import { monthCells, storySlides } from '../../domain/monthStory';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { LivingMonth } from './LivingMonth';
import { useMonthInput } from './useMonthInput';
import { headline, weekNumber, weekStats } from '../../domain/weekly';
import { weeksWithData } from '../../domain/weeklyStory';
import { kmFromSteps, setStride } from '../../domain/walk';
import { back, go } from '../../router';
import { Door, Empty, FamilyDoors, PageHead, type HowThisWorks } from '../../ui/kit/Kit';

const HOW: HowThisWorks = {
  title: 'Reports',
  steps: [
    { icon: 'sheet', ink: '#ff9a76', head: 'The week, as a story', line: 'Ready on Sunday: cards you tap through, the road, the tally and one thing for next week.' },
    { icon: 'calendar', ink: '#c2b2ff', head: 'The month on a page', line: 'Each finished month, graded, with its best days.' },
    { icon: 'play', ink: '#f2c46d', head: 'The story', line: 'The month told in a few slides, so far or once it is done.' },
    { icon: 'edit', ink: '#ede6da', head: 'Corrections', line: 'Anything changed after a report was read is noted on it.' },
  ],
};

/** Reports (board W5): the week's story as a poster you tap into, this month living as a calendar, then older ones. */
export function ReportsHome() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const entries = useAllEntries();
  const sets = useAllSets();
  const input = useMonthInput();
  const moments = useLiveQuery(() => db.moments.toArray(), []);
  if (!days || !sessions || !entries || !sets || !settings) return <div className="page bare k-page k-light you" />;
  setStride(settings.strideM);
  const week = weeksWithData(days, sessions, today)[0];
  const month = monthsWithData(days, today)[0];
  const perWeek = settings.targets.at(-1)?.targets.sessionsPerWeek ?? 3;
  const story = week ? (() => {
    const all = Array.from({ length: 8 }, (_, i) => weekStats(settings, addDays(week, -7 * i), days, entries, sessions, sets));
    return headline(all[0], all[1], all, perWeek);
  })() : undefined;
  const monthKm = month ? Math.round(kmFromSteps(days.filter((d) => d.date.startsWith(month)).reduce((n, d) => n + (d.steps ?? 0), 0))) : 0;
  const screens = month && input ? storySlides(month, input).length : 0;
  const mName = month ? monthLabel(month).replace(/ \d{4}$/, '') : '';
  const now = today.slice(0, 7);
  const line = spokenLine(settings, today, 'report', today);
  return (
    <div className="page bare k-page k-light you">
      <PageHead back="You" onBack={() => back('/you')} title="Reports" help={HOW} family="back" />
      {line && <div className="voice">{line}</div>}
      {!week && !month && <Empty icon="sheet" ink="#c2b2ff" title="Nothing to report yet" line="Your first story comes after your first full week." />}
      {week && (
        <button type="button" className="k-poster" onClick={() => go('/reports/week', { w: week })}>
          <span>Week {weekNumber(week)} · {fmtDayMonth(week)} to {fmtDayMonth(addDays(week, 6))}</span>
          <b className="k-poster-t">{story}</b>
          <span>The week as a story. Tap to read.</span>
        </button>
      )}
      {input && (
        <LivingMonth
          month={now}
          cal={monthCells(now, input)}
          records={new Set(input.sets.filter((x) => x.date.startsWith(now) && x.mark === '!!' && !x.skipped).map((x) => x.date))}
          frames={(moments ?? []).filter((m) => m.date.startsWith(now) && typeof m.payload?.text === 'string').sort((x, y) => x.at - y.at).slice(-6).map((m) => ({ id: m.id, text: m.payload.text as string, date: m.date }))}
          onPlay={() => go('/film', { m: now })}
        />
      )}
      <div className="k-drench">
      <FamilyDoors two label="Older" groups={{
        back: [
          ...(month ? [
            <Door key="month" line icon="calendar" name={`${mName} on a page`} value={`${fmtInt(monthKm)} km, graded`} family="back" onClick={() => go('/reports/month', { m: month })} />,
            <Door key="story" line icon="play" name={`${mName}’s story`} value={screens ? `${screens} slides` : 'The month in slides'} family="back" onClick={() => go('/film', { m: month })} />,
          ] : []),
          <Door key="archive" line icon="sheet" name="The archive" value="Every past week and month" family="back" onClick={() => go('/reports/archive')} />,
          <Door key="year" line icon="calendar" name="Your year" value="The year so far" family="back" onClick={() => go('/year')} />,
          // Ledger O40: the journey page was reached only from a celebration; this is its door.
          <Door key="journey" line icon="journey" name="The journey" value="Start to reveal day" family="back" onClick={() => go('/journey')} />,
        ],
        upkeep: [<Door key="fix" line icon="edit" name="Corrections" value="Put a past number right" family="upkeep" onClick={() => go('/reports/corrections')} />],
      }} />
      </div>
    </div>
  );
}
