import type { CSSProperties } from 'react';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useToday } from '../../db/hooks';
import { spokenLine } from '../../domain/voice';
import { fmtDayMonth, fmtInt } from '../../domain/format';
import { addDays } from '../../domain/dates';
import { monthLabel } from '../../domain/goTo';
import { monthsWithData } from '../../domain/monthReport';
import { storySlides } from '../../domain/monthStory';
import { useMonthInput } from './useMonthInput';
import { headline, weekNumber, weekStats } from '../../domain/weekly';
import { weeksWithData } from '../../domain/weeklyStory';
import { kmFromSteps, setStride } from '../../domain/walk';
import { back, go } from '../../router';
import { Icon } from '../../ui/Icon';
import { Door, Empty, FamilyDoors, PageHead, type HowThisWorks } from '../../ui/kit/Kit';
import { FAMILIES } from '../../ui/kit/families';

const BACK = FAMILIES.back.ink;

const HOW: HowThisWorks = {
  title: 'Reports',
  steps: [
    { icon: 'sheet', ink: '#ff9a76', head: 'The week, as a story', line: 'Ready on Sunday: cards you tap through, the road, the tally and one thing for next week.' },
    { icon: 'calendar', ink: '#c2b2ff', head: 'The month on a page', line: 'Each finished month, graded, with its best days.' },
    { icon: 'play', ink: '#f2c46d', head: 'The film', line: 'The month told in a few screens, to play in the first week after.' },
    { icon: 'edit', ink: '#ede6da', head: 'Corrections', line: 'Anything changed after a report was read is noted on it.' },
  ],
};

/** Reports (board three): the week's story as a poster you tap into, the month and its film, then older ones. */
export function ReportsHome() {
  const settings = useSettings();
  const today = useToday();
  const days = useAllDays();
  const sessions = useSessions();
  const entries = useAllEntries();
  const sets = useAllSets();
  const input = useMonthInput();
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
      {month && (
        <div className="k-doors two">
          <button type="button" className="k-panel k-tap" style={{ '--ink': BACK } as CSSProperties} onClick={() => go('/reports/month', { m: month })}>
            <span className="k-lb">{mName}</span>
            <b className="k-num ink">{fmtInt(monthKm)} km</b>
            <span className="k-q">The month on a page</span>
            <Icon name="right" size={18} stroke={2.2} className="k-arrow" />
          </button>
          <button type="button" className="k-panel k-tap" style={{ '--ink': BACK } as CSSProperties} onClick={() => go('/film', { m: month })}>
            <span className="k-lb">{mName}’s film</span>
            <b className="k-num ink k-row" style={{ justifyContent: 'flex-start', gap: 6 }}><Icon name="play" size={22} stroke={2.4} color={BACK} />Play</b>
            <span className="k-q">{screens ? `${screens} screens` : 'The month in screens'}</span>
            <Icon name="right" size={18} stroke={2.2} className="k-arrow" />
          </button>
        </div>
      )}
      <FamilyDoors two label="Older" groups={{
        back: [
          <Door key="archive" line icon="sheet" name="The archive" value="Every past week and month" family="back" onClick={() => go('/reports/archive')} />,
          <Door key="year" line icon="calendar" name="Your year" value="The year so far" family="back" onClick={() => go('/year')} />,
          // Ledger O40: the journey page was reached only from a celebration; this is its door.
          <Door key="journey" line icon="journey" name="The journey" value="Start to reveal day" family="back" onClick={() => go('/journey')} />,
        ],
        upkeep: [<Door key="fix" line icon="edit" name="Corrections" value="Put a past number right" family="upkeep" onClick={() => go('/reports/corrections')} />],
      }} />
    </div>
  );
}
