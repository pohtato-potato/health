import { fmtDayMonth, fmtDuration, fmtInt } from './format';

export interface HeadlineCtx {
  today: string;
  laps?: number;
  waistChange?: number;
  stepsChangePct?: number;
  topFoods: string[];
  nextCity?: string;
  nextCityEta?: string;
  road?: { from: string; to: string; kmPerDay: number };
  sessions: number;
  sessionNames?: [string, string];
  perfectToday: boolean;
  perfectThisMonth: number;
  proteinYesterday?: number;
  proteinClosedYesterday: boolean;
  sleepAvg?: number;
  waterL?: number;
  waterHitRecently: boolean;
  bedBeforeMidnight: boolean;
  streak: number;
  shields: number;
  recordsThisWeek: number;
  morningBest?: number;
  unlocked: number;
  benchSessions?: number;
  season: 'wedding' | 'other';
}

/** Tapping this one is a secret achievement. */
export const RICKROLL = 'Never gonna give you up: the step streak refuses to let you down, run around or desert you.';

const EVERGREEN = [
  'Scale caught inventing 0.6 kg overnight. Trend line declines to comment.',
  'Experts confirm resting counts as training. Local legend remains suspicious.',
  'Study finds 7 hours of sleep improves everything. Local legend demands peer review.',
  "Free meal passes without incident. Weekly deficit ‘shaken but fine’.",
  "Resistance band enters counselling after being described as ‘easy’.",
  'Belt industry braces for sharp rise in demand for new notches.',
  'Local legend opens app to check one number, reads eleven charts.',
  'Local dumbbells unionise, demand heavier colleagues.',
  "Scientists confirm ‘just one more lap’ has never once been just one more lap.",
  'Antimatter Dimensions player discovers real-life progress bar, responds extremely well.',
  'Gremlin voice denies being impressed. Sources say it was very impressed.',
  'Tapping headlines does nothing. Probably.',
  "Rest timer files complaint: ‘I say two minutes, they hear four.’",
  'Ring closes itself out of sheer peer pressure, witnesses say.',
  'Report: morning log now faster than making tea. Tea unavailable for comment.',
  'MARKETS: protein up, excuses down, sofa futures volatile.',
  "Local legend and the step counter ‘just friends’, sources insist.",
  'Weather service issues gentle warning: the stairs are still there.',
  "Local water bottle promoted to ‘essential worker’.",
  "Spreadsheet reports feeling ‘very full’ after latest export.",
  'Tapping the ticker 25 times achieves nothing. Or does it?',
  'Error 404: headline not found.',
  'Confetti cannon on standby. Union rules require a perfect day first.',
  "Trend line calls daily weigh-ins ‘noise’, asks to be judged on its body of work.",
];

/** Today's ticker: headlines built from your own numbers, mixed with the evergreens. */
export function headlines(c: HeadlineCtx): string[] {
  const data: string[] = [];
  if (c.laps && c.laps >= 10) data.push(`BREAKING: Local legend walks ${fmtInt(c.laps)} laps of home, arrives nowhere, feels fantastic.`);
  if (c.waistChange !== undefined || c.stepsChangePct !== undefined) {
    const w = c.waistChange === undefined ? '' : `WAIST ${c.waistChange <= 0 ? '▼' : '▲'}${Math.abs(c.waistChange).toFixed(1)} · `;
    const s = c.stepsChangePct === undefined ? '' : `STEPS ${c.stepsChangePct >= 0 ? '▲' : '▼'}${Math.abs(c.stepsChangePct)}% · `;
    data.push(`MARKETS: ${w}${s}EXCUSES ▼▼▼`);
  }
  if (c.topFoods.length >= 2) data.push(`Weather: 100% chance of ${c.topFoods[0].toLowerCase()}, with scattered ${c.topFoods[1].toLowerCase()}.`);
  if (c.nextCity && c.nextCityEta) data.push(`${c.nextCity} tourism board expecting a visitor around ${fmtDayMonth(c.nextCityEta)}.`);
  if (c.road) data.push(`Traffic on the ${c.road.from}–${c.road.to} road: one pedestrian, moving at ${c.road.kmPerDay.toFixed(1)} km a day.`);
  if (c.sessionNames) data.push(`Sources: ${c.sessionNames[1]} has ‘heard things’ about ${c.sessionNames[0]}.`);
  if (c.sessions >= 5) data.push(`${fmtInt(c.sessions)} sessions logged. The floor has stopped asking questions.`);
  if (c.perfectToday) data.push('This headline only appears to people who closed all three rings today.');
  if (c.perfectThisMonth >= 3) data.push(`${c.perfectThisMonth} perfect days this month. Confetti suppliers put on overtime.`);
  if (c.proteinClosedYesterday && c.proteinYesterday) data.push(`Protein desk: ${Math.round(c.proteinYesterday)} g yesterday. Muscles send a thank-you note.`);
  if (c.sleepAvg) data.push(`Sleep desk: ${fmtDuration(c.sleepAvg)} a night this week. Analysts ‘cautiously rested’.`);
  if (c.waterHitRecently) data.push('Houseplants protest after being out-drunk for the first time.');
  if (c.waterL) data.push(`Hydration index at ${c.waterL.toFixed(1)} L a day. Local plants concede.`);
  if (c.bedBeforeMidnight) data.push("Sleep scientists stunned by bedtime before midnight. ‘We had a sweepstake.’");
  if (c.streak >= 3) data.push(`Step streak enters day ${c.streak}. Calendar considering a restraining order.`);
  if (c.shields > 0) data.push(`Shields up: ${c.shields} in the bank. Analysts calm.`);
  if (c.recordsThisWeek > 0) data.push(`Chess federation investigates ${c.recordsThisWeek} suspicious ‘!!’ marks this week.`);
  if (c.morningBest) data.push(`Morning log record stands at ${c.morningBest.toFixed(1)} seconds. Rivals ‘not close’.`);
  if (c.unlocked >= 10) data.push(`Achievement hunters report ${c.unlocked} of 223 unlocked. Completionists sweating.`);
  if (c.benchSessions && c.benchSessions >= 20) data.push(`Improvised bench celebrates session ${c.benchSessions}, requests union representation.`);
  if (c.waistChange !== undefined && c.waistChange < 0) data.push("Local tape measure reports ‘a lot less work lately’.");
  if (c.season === 'wedding') data.push('Wedding season forecast: heavy buffets, isolated dessert showers. Occasion mode advised.');

  // A different mix every day, the same all day.
  let h = 0;
  for (const ch of c.today) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return h / 2 ** 32;
  };
  const shuffle = <T,>(xs: T[]) => xs.map((x) => [rnd(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const out = [...shuffle(data).slice(0, 6), ...shuffle(EVERGREEN).slice(0, 4)];
  if (rnd() < 0.34) out.splice(Math.floor(rnd() * out.length), 0, RICKROLL);
  return shuffle(out);
}

