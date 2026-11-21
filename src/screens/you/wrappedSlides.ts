import { fmt1, fmtDayMonth, fmtDuration, fmtInt, lowerFirst } from '../../domain/format';
import { WEEKDAY_NAMES } from '../../domain/insights';
import type { PeriodStats } from '../../domain/period';

export interface WrappedSlide { g: string; title: string; big: string; say: string; chips?: string[]; road?: boolean; wordy?: boolean }
interface Ctx { title: string; place?: string; laps?: number; names: string[]; caught: { yes: number; answered: number }; kept: { n: number; yes: number } }

/** The journey wrapped (board W7): one colour wash and one huge number per slide; a slide with nothing to say is left out. */
export function wrappedSlides(s: PeriodStats, c: Ctx): WrappedSlide[] {
  const out: WrappedSlide[] = [
    { g: 'linear-gradient(160deg,#3b1f5e,#8a2f6b)', title: `${c.title}, wrapped`, big: `${fmtInt(s.logged)} days`, say: `logged between ${fmtDayMonth(s.from)} and ${fmtDayMonth(s.to)}.` },
    {
      g: 'linear-gradient(160deg,#12443a,#2f8a63)', title: 'The road so far', big: fmtInt(s.km), road: true,
      say: `kilometres walked since ${fmtDayMonth(s.from)}.${c.place ? ` That is Delhi to ${c.place} on foot.` : ''}`,
      chips: [`${fmtInt(s.steps)} steps`, ...(c.laps ? [`${fmtInt(c.laps)} laps of home`] : [])],
    },
  ];
  if (s.topFoods.length) out.push({ g: 'linear-gradient(160deg,#5e2f12,#c2622f)', title: 'Your top foods', big: s.topFoods[0].name, wordy: true, say: `${s.topFoods[0].n} times.`, chips: s.topFoods.slice(1).map((f) => `${f.name} · ${f.n} times`) });
  if (s.sleepAvg) out.push({ g: 'linear-gradient(160deg,#16244f,#3a5bb5)', title: 'You slept', big: fmtDuration(Math.round(s.sleepAvg)), say: `a night on average.${s.bestNight ? ` The longest: ${fmtDuration(s.bestNight.minutes)}, on ${fmtDayMonth(s.bestNight.date)}.` : ''}` });
  if (c.caught.answered) out.push({ g: 'linear-gradient(160deg,#0b0f22,#3a5b8a)', title: 'Caught the window', big: `${c.caught.yes} of ${c.caught.answered}`, say: `mornings you said you went to bed when sleepy.${c.kept.n ? ` Lights-out pledges kept: ${c.kept.yes} of ${c.kept.n}.` : ''}` });
  if (s.sessions) out.push({ g: 'linear-gradient(160deg,#3d3212,#9c7c2a)', title: 'You trained', big: `${fmtInt(s.sessions)} sessions`, say: `${fmtInt(s.kgMoved)} kg moved over ${fmtInt(s.sets)} sets.`, chips: s.records.map((r) => `Record: ${lowerFirst(r)}`) });
  out.push({ g: 'linear-gradient(160deg,#2d2150,#6b55b5)', title: 'Perfect days', big: fmtInt(s.perfect), say: `with every ring closed.${s.busiestWeekday !== undefined ? ` ${WEEKDAY_NAMES[s.busiestWeekday]} were your busiest days on foot.` : ''}` });
  if (c.names.length) out.push({ g: 'linear-gradient(160deg,#1f3a44,#4a8a9c)', title: 'Unlocked', big: `${c.names.length} achievement${c.names.length === 1 ? '' : 's'}`, say: 'along the way.', chips: [...c.names.slice(0, 6), ...(c.names.length > 6 ? [`and ${c.names.length - 6} more`] : [])] });
  if (s.trendStart !== undefined && s.trendEnd !== undefined) {
    out.push({ g: 'linear-gradient(160deg,#20262f,#4a5566)', title: 'The trend', big: `${s.trendEnd <= s.trendStart ? '−' : '+'}${fmt1(Math.abs(s.trendEnd - s.trendStart))} kg`, say: s.waistStart !== undefined && s.waistEnd !== undefined ? `and ${fmt1(Math.abs(s.waistEnd - s.waistStart))} in ${s.waistEnd <= s.waistStart ? 'off' : 'on'} the waist.` : 'on the weight trend.' });
  }
  return out;
}
