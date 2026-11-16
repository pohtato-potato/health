// The week's plan: what kind of day each one is. The days vary on purpose, so the app meets each shape of day the
// owner has. Numbers are relative to the save (its step goal and best day), so the plan holds no personal figures.

/** Kinds of day. */
export const KINDS = {
  usual: 'A usual day: morning log, every meal, steps a little over the goal, the checklist, training if due, closed at 10:45 pm',
  record: 'A record step day: everything as usual, steps 15% over the best day on record',
  rest: 'A rest day with nothing logged: the app is opened and looked at, nothing entered, not closed',
  late: 'A day closed late: logged as usual, closed at 1:30 am the next morning',
  sleepOnly: 'Only sleep logged: the morning log and nothing else',
  perfect: 'A perfect day: every ring closed, every checklist row, training, closed on time',
  missed: 'A missed day: the app is not opened at all; the next morning catches it up (steps and meals for that day)',
};

/**
 * Seven days from `start`. `train` marks days a session is done. Once-off actions are spread over days 3 and 4,
 * when the week is under way and the save has had a night or two to move.
 */
export function weekPlan(start, days = 7) {
  const kinds = ['usual', 'record', 'rest', 'late', 'sleepOnly', 'perfect', 'missed'];
  const train = new Set([0, 3, 5]);
  // O42: day 4 also brings a building one day short (a labelled test nudge), so day 5's night finishes it.
  const onceOff = { 2: ['sponsor', 'building', 'research', 'kit', 'title', 'theme'], 3: ['trialist', 'dice', 'cup', 'plan', 'finishBuilding'] };
  return Array.from({ length: days }, (_, i) => ({
    i, date: addDays(start, i), kind: kinds[i % kinds.length], train: train.has(i % 7), onceOff: onceOff[i] ?? [],
    // A live match is watched once in the week; the others are skipped, as the owner does on busy mornings.
    watch: i === 2,
  }));
}

export function addDays(date, n) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Steps for a day of this kind: `goal` is the save's step target, `best` the best day on record. */
export function stepsFor(kind, goal, best) {
  if (kind === 'record') return Math.round((best * 1.15) / 10) * 10 + 7;
  if (kind === 'perfect') return Math.round(goal * 1.3) + 13;
  if (kind === 'usual' || kind === 'late') return Math.round(goal * 1.1) + 21;
  return undefined;
}
