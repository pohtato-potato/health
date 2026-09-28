import { addDays, weekday, type DayKey } from './dates';
import { nextFestival } from './festivals';
import { fmtDayMonth, fmtDuration, fmtInt, weekdayName } from './format';
import type { Readiness } from './readiness';

export interface Forecast {
  id: string;
  /** The big value, weather-app style: "84%", "High", "11.5k". */
  value: string;
  title: string;
  text: string;
  /** Higher wins when several apply. */
  weight: number;
}

export interface ForecastInput {
  today: DayKey;
  hour: number;
  readiness?: Readiness;
  beatPct?: number;
  sessionDue: boolean;
  sessionName?: string;
  sleepMin?: number;
  stepsTarget: number;
  stepsToday?: number;
  /** Steps on past days of this weekday. */
  sameWeekday: number[];
  readyToGoHeavier: string[];
  sessionsLast5: number;
  cleanSessions?: number;
  flagGroup?: string;
  nextStop?: { name: string; days: number };
  flatWeeks?: number;
  savedKcal?: number;
}

const k = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : fmtInt(n));

/** Every forecast that applies today, strongest first. CARROT Weather, but for you. */
export function forecasts(f: ForecastInput): Forecast[] {
  const out: Forecast[] = [];
  if (f.sleepMin !== undefined && f.sleepMin < 360 && f.hour < 16) {
    out.push({ id: 'cravings', value: 'High', title: 'Cravings', text: `Short night, ${fmtDuration(f.sleepMin)}, so cravings are likely around 4 pm. Get protein in early and keep a snack ready.`, weight: 90 });
  }
  if (f.sessionsLast5 >= 4) {
    out.push({ id: 'recovery', value: 'Rest', title: 'Recovery', text: `${fmtInt(f.sessionsLast5)} sessions in five days. The plan says sit down, and so do I.`, weight: 85 });
  }
  if (f.sessionDue && f.readiness?.known && f.beatPct !== undefined) {
    const bits = [f.sleepMin !== undefined ? `${fmtDuration(f.sleepMin)} of sleep` : '', f.readiness.parts[1].name.toLowerCase().includes('rested') ? f.readiness.parts[1].name.replace('Felt rested, ', 'rested ') : '', f.readiness.parts[2].points === 15 ? 'a rest day behind you' : ''].filter(Boolean);
    out.push({
      id: 'records',
      value: `${f.beatPct}%`,
      title: 'Record weather',
      text: `${f.beatPct}% chance of beating last time${f.sessionName ? ` in ${f.sessionName}` : ''}. ${bits.length ? `${bits.join(', ')}.`.replace(/^./, (c) => c.toUpperCase()) : ''}`.trim(),
      weight: 70,
    });
  }
  if (f.readyToGoHeavier.length >= 2 && f.sessionDue) {
    out.push({ id: 'scattered', value: String(f.readyToGoHeavier.length), title: 'Scattered records', text: `${f.readyToGoHeavier.length} exercises are at the top of their range. Records likely${f.sessionName ? ` in ${f.sessionName}` : ''}.`, weight: 60 });
  }
  if (f.sameWeekday.length >= 3 && (f.stepsToday ?? 0) < f.stepsTarget && f.hour < 20) {
    const avg = Math.round(f.sameWeekday.reduce((a, b) => a + b, 0) / f.sameWeekday.length / 100) * 100;
    const short = f.stepsTarget - avg;
    const day = weekdayName(f.today);
    out.push({
      id: 'weekday',
      value: k(avg),
      title: `${day} steps`,
      text: short > 0 ? `You average ${fmtInt(avg)} on ${day}s. About ${Math.max(5, Math.round(short / 100))} minutes of walking puts you over the line.` : `You average ${fmtInt(avg)} on ${day}s, over your line. Keep the habit.`,
      weight: short > 0 ? 55 : 30,
    });
  }
  if (f.cleanSessions !== undefined && f.cleanSessions >= 5 && f.flagGroup) {
    out.push({ id: 'joints', value: 'Clear', title: `${f.flagGroup} outlook`, text: `Clear for ${f.cleanSessions} sessions straight. Everything stays in the plan.`, weight: 35 });
  }
  const fest = nextFestival(f.today);
  if (fest && fest.from > f.today && fest.from <= addDays(f.today, 7)) {
    out.push({ id: 'festive', value: 'Festive', title: 'Front moving in', text: `${fest.name} from ${fmtDayMonth(fest.from)}. Sweets likely. Occasion mode is on standby.`, weight: 65 });
  }
  if (f.nextStop && f.nextStop.days <= 5) {
    out.push({
      id: 'next-stop',
      value: f.nextStop.days <= 1 ? 'Today' : `${f.nextStop.days} days`,
      title: 'Next stop',
      text: `${f.nextStop.name}, on your walk across India, ${f.nextStop.days <= 1 ? 'within reach today' : 'at your current pace'}.`,
      weight: 50,
    });
  }
  if (f.flatWeeks !== undefined && f.flatWeeks >= 2) {
    out.push({ id: 'flat', value: 'Flat', title: 'Two-week outlook', text: 'Weight and waist flat for two weeks. Not a plateau yet: stretches like this are normal, and the trend usually moves again.', weight: 45 });
  }
  if (f.savedKcal !== undefined && f.savedKcal >= 300 && weekday(f.today) >= 3) {
    out.push({ id: 'saved', value: fmtInt(f.savedKcal), title: 'kcal saved', text: 'Free-meal conditions look excellent for the weekend.', weight: 40 });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** The day's forecast: the strongest, with ties broken by the date so it holds all day. */
export function pickForecast(list: Forecast[], today: DayKey): Forecast | undefined {
  if (!list.length) return undefined;
  const top = list.filter((x) => x.weight >= list[0].weight - 10);
  let h = 0;
  for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return top[h % top.length];
}
