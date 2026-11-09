// The season run (spec §12, §16): boons, bounties, the board's objectives and the season track.
// Boons last one season only, the one thing a new season resets. Bounties are real-habit tasks,
// three picked of six each Sunday. Nothing here rewards eating less, and nothing scolds.
import type { BoardObjective, BoonDef, BountyDef, Reward, TrackStep } from './types';

/** Picks on days 1, 15 and 29: choose 1 of 3. */
export const BOON_DAYS = [1, 15, 29];
export const BOON_CHOICES = 3;

export const BOONS: BoonDef[] = [
  { id: 'away-sleepers', name: 'Away-day sleepers', text: '+2 Rest on defence on away days.', effects: [{ kind: 'axis', axis: 'Rest', d: 2, side: 'def', when: 'away' }] },
  { id: 'quick-feet', name: 'Quick feet', text: 'The first goal each match builds chemistry.', effects: [{ kind: 'chemistry', d: 1, when: 'after-goal' }] },
  { id: 'late-shift', name: 'Late shift', text: '+1 Fuel both ways after 75′.', effects: [{ kind: 'axis', axis: 'Fuel', d: 1, side: 'both', when: 'late' }] },
  { id: 'fortress', name: 'Fortress', text: '+1 Shape on defence at home.', effects: [{ kind: 'axis', axis: 'Shape', d: 1, side: 'def', when: 'home' }] },
  { id: 'road-warriors', name: 'Road warriors', text: '+1 Routine on defence away from home.', effects: [{ kind: 'axis', axis: 'Routine', d: 1, side: 'def', when: 'away' }] },
  { id: 'flying-start', name: 'Flying start', text: '+2 Pace in the first half.', effects: [{ kind: 'axis', axis: 'Pace', d: 2, side: 'atk', when: 'first-half' }] },
  { id: 'never-say-die', name: 'Never say die', text: '+2 Power once the other side scores.', effects: [{ kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'after-concede' }] },
  { id: 'giant-killers', name: 'Giant killers', text: '+2 Power against a higher division.', effects: [{ kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'vs-higher' }] },
  { id: 'derby-day', name: 'Derby day', text: '+2 Shape on defence in derbies.', effects: [{ kind: 'axis', axis: 'Shape', d: 2, side: 'def', when: 'derby' }] },
  { id: 'cup-fever', name: 'Cup fever', text: '+1 Fuel on attack in cup matches.', effects: [{ kind: 'axis', axis: 'Fuel', d: 1, side: 'atk', when: 'cup' }] },
  { id: 'dead-ball-season', name: 'Dead-ball season', text: '+2 Power on set pieces.', effects: [{ kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'set-piece' }] },
  { id: 'hold-the-line', name: 'Hold the line', text: '+2 Routine on defence while you’re ahead.', effects: [{ kind: 'axis', axis: 'Routine', d: 2, side: 'def', when: 'ahead' }] },
  { id: 'chasing-it', name: 'Chasing it', text: '+2 Fuel on attack while you’re behind.', effects: [{ kind: 'axis', axis: 'Fuel', d: 2, side: 'atk', when: 'behind' }] },
  { id: 'night-owls', name: 'Night owls', text: '+2 Rest on defence when the match plays itself.', effects: [{ kind: 'axis', axis: 'Rest', d: 2, side: 'def', when: 'auto' }] },
  { id: 'second-wind-boon', name: 'Second half people', text: '+1 Pace on attack in the second half.', effects: [{ kind: 'axis', axis: 'Pace', d: 1, side: 'atk', when: 'second-half' }] },
  { id: 'river-end-roar', name: 'River End roar', text: '+1 Routine both ways in the last 15 at home.', effects: [{ kind: 'axis', axis: 'Routine', d: 1, side: 'both', when: 'home-late' }] },
  { id: 'long-range', name: 'Long-range season', text: '+2 Power on long shots.', effects: [{ kind: 'axis', axis: 'Power', d: 2, side: 'atk', when: 'long' }] },
  { id: 'level-heads', name: 'Level heads', text: '+1 Shape both ways while the score is level.', effects: [{ kind: 'axis', axis: 'Shape', d: 1, side: 'both', when: 'level' }] },
  { id: 'big-stage', name: 'Big stage', text: 'In a final, once a match, a missed chance of 30% or more is retaken.', effects: [{ kind: 'retake', when: 'final' }] },
  { id: 'open-door', name: 'Open door', text: 'Three boons offered at the next pick become four.', effects: [{ kind: 'rule', rule: 'boon-choices', value: 4 }] },
  { id: 'bigger-packs', name: 'Bigger packs', text: 'Packs hold six items this season, not five.', effects: [{ kind: 'rule', rule: 'packs-items', value: 6 }] },
  { id: 'tight-knit', name: 'Tight-knit', text: 'Chemistry rises after 5 days of the same starters, not 7.', effects: [{ kind: 'rule', rule: 'chemistry-days', value: 5 }] },
  { id: 'every-lesson', name: 'Every lesson', text: 'A draw brings 1 more lesson point.', effects: [{ kind: 'rule', rule: 'lesson-draw', value: 1 }] },
  { id: 'loan-window', name: 'Loan window', text: 'Loans stay 9 days this season.', effects: [{ kind: 'rule', rule: 'loan-days', value: 9 }] },
];

/** Each Sunday: six offered, pick three, each lasts the week. */
export const BOUNTIES_OFFERED = 6;
export const BOUNTIES_PICKED = 3;

const b = (id: string, name: string, text: string, what: BountyDef['target']['what'], count: number, reward: Reward, withinDays = 7): BountyDef =>
  ({ id, name, text, target: { what, count, withinDays, text }, reward });

export const BOUNTIES: BountyDef[] = [
  b('b-steps-5', 'Five on the goal', 'The step goal on 5 days this week.', 'steps', 5, { kind: 'research', n: 5 }),
  b('b-steps-7', 'Every single day', 'The step goal on all 7 days this week.', 'steps', 7, { kind: 'pack' }),
  b('b-big-day', 'A big day out', 'One day of 18,000 steps or more.', 'big-day', 1, { kind: 'album-card' }),
  b('b-big-days', 'Two big days', 'Two days of 18,000 steps or more.', 'big-day', 2, { kind: 'research', n: 8 }),
  b('b-long-walk', 'The long way round', 'One walk of 5 km or more.', 'long-walk', 1, { kind: 'track-catchup' }),
  b('b-km-60', 'Sixty kilometres', 'Walk 60 km this week.', 'km', 60, { kind: 'research', n: 6 }),
  b('b-route-leg', 'Next stop', 'Finish a leg of a Walk route.', 'route-leg', 1, { kind: 'album-card' }),
  b('b-sessions-3', 'Three in the book', 'Three training sessions this week.', 'training', 3, { kind: 'research', n: 5 }),
  b('b-sessions-4', 'The full plan', 'Four training sessions this week.', 'training', 4, { kind: 'pack' }),
  b('b-form', 'Clean reps', 'Every form check ok in 2 sessions.', 'form-ok', 2, { kind: 'research', n: 4 }),
  b('b-rest-day', 'Rest is training', 'Keep a planned rest day as rest.', 'rest-day', 1, { kind: 'track-catchup' }),
  b('b-protein-4', 'Protein four', 'The protein target on 4 days.', 'protein', 4, { kind: 'research', n: 5 }),
  b('b-protein-6', 'Protein six', 'The protein target on 6 days.', 'protein', 6, { kind: 'pack' }),
  b('b-range-4', 'In the range', 'Calories inside the range on 4 days.', 'kcal', 4, { kind: 'research', n: 5 }),
  b('b-breakfast', 'Breakfast club', 'Breakfast logged on 5 days.', 'breakfast', 5, { kind: 'album-card' }),
  b('b-three-meals', 'Three a day', 'Breakfast, lunch and dinner logged on 4 days.', 'three-meals', 4, { kind: 'research', n: 6 }),
  b('b-bedtime-3', 'Lights out', 'Bedtime kept on 3 nights.', 'bedtime', 3, { kind: 'track-catchup' }),
  b('b-bedtime-5', 'Night shift off', 'Bedtime kept on 5 nights.', 'bedtime', 5, { kind: 'pack' }),
  b('b-sleep-5', 'Full nights', 'The sleep target on 5 nights.', 'sleep', 5, { kind: 'research', n: 6 }),
  b('b-rested', 'Woke up ready', 'Rated rested 4 or 5 on 3 mornings.', 'rested', 3, { kind: 'album-card' }),
  b('b-checklist-5', 'Ticked off', 'Every checklist slot ticked on 5 days.', 'checklist-full', 5, { kind: 'research', n: 5 }),
  b('b-checklist-7', 'Clockwork week', 'Every checklist slot ticked on all 7 days.', 'checklist-full', 7, { kind: 'pack' }),
  b('b-meds', 'Doctor’s orders', 'Every medicine kept on 7 days.', 'meds', 7, { kind: 'research', n: 4 }),
  b('b-weigh-4', 'On the scale', 'Weigh-ins on 4 days.', 'weigh-in', 4, { kind: 'research', n: 4 }),
  b('b-waist', 'The tape', 'One standing waist measurement, in inches.', 'waist', 1, { kind: 'album-card' }),
  b('b-close-6', 'Close it out', 'Close the day on 6 days.', 'closed', 6, { kind: 'track-catchup' }),
  b('b-all-units', 'Whole squad', 'Something logged for every unit on 4 days.', 'all-units', 4, { kind: 'pack' }),
  b('b-logged-7', 'Every day counts', 'Anything logged on all 7 days.', 'logged', 7, { kind: 'research', n: 7 }),
  b('b-commute', 'Office legs', 'Two office or away days at the eased step goal.', 'commute', 2, { kind: 'album-card' }),
  b('b-youth', 'Academy week', 'Three sessions logged for academy-linked habits.', 'youth', 3, { kind: 'research', n: 5 }),
];

/** Two a season, set from the squad's strength against its division. Each met: 10 research. */
export const BOARD_PER_SEASON = 2;
export const BOARD_RESEARCH = 10;

export const BOARD: BoardObjective[] = [
  { id: 'o-survive', text: 'Stay clear of the bottom three.', for: ['low'], goal: { kind: 'position', atBest: 15 },
    met: '“Safe. We’ll take it, and we’ll say no more.”', missed: '“The bottom three. Noted. Tea is still in the boardroom.”' },
  { id: 'o-top-half', text: 'Finish in the top half.', for: ['low', 'mid'], goal: { kind: 'position', atBest: 9 },
    met: '“Top half. The chairman bought a second biscuit.”', missed: '“Bottom half. The minutes record it without comment.”' },
  { id: 'o-top-six', text: 'Finish in the top six.', for: ['mid'], goal: { kind: 'position', atBest: 6 },
    met: '“Top six. Somebody frame the table.”', missed: '“Outside the six. We move on.”' },
  { id: 'o-playoffs', text: 'Reach the playoffs.', for: ['mid', 'high'], goal: { kind: 'playoffs' },
    met: '“The playoffs. The board will attend in its good coats.”', missed: '“No playoffs. The coats stay in the wardrobe.”' },
  { id: 'o-promotion', text: 'Win promotion.', for: ['high'], goal: { kind: 'promotion' },
    met: '“Promoted. The board has asked for a bigger table.”', missed: '“Not this year. The board has seen longer roads.”' },
  { id: 'o-top-two', text: 'Finish in the top two.', for: ['high'], goal: { kind: 'position', atBest: 2 },
    met: '“Top two. Somebody tell the printers.”', missed: '“Not the top two. The printers have been told to wait.”' },
  { id: 'o-cup-r3', text: 'Reach round three of the big cup.', for: ['low', 'mid'], goal: { kind: 'cup-round', cup: 'bigcup', round: 'r3' },
    met: '“Round three. A day out we’ll talk about.”', missed: '“Out early. More Saturdays free for the league.”' },
  { id: 'o-cup-qf', text: 'Reach the big cup quarter-final.', for: ['mid', 'high'], goal: { kind: 'cup-round', cup: 'bigcup', round: 'qf' },
    met: '“A quarter-final. The scarf sellers are delighted.”', missed: '“Round three. We’ll say no more about it.”' },
  { id: 'o-tiercup-sf', text: 'Reach the division cup semi-final.', for: ['mid', 'high'], goal: { kind: 'cup-round', cup: 'tiercup', round: 'sf' },
    met: '“A semi-final. The minibus has been booked.”', missed: '“Not this time. The minibus stays parked.”' },
  { id: 'o-tiercup-win', text: 'Win the division cup.', for: ['high'], goal: { kind: 'cup-round', cup: 'tiercup', round: 'win' },
    met: '“Silverware. The cabinet finally earns its keep.”', missed: '“No silverware. The cabinet will keep.”' },
  { id: 'o-goals', text: 'Score 60 goals in the league.', for: ['mid', 'high'], goal: { kind: 'goals', n: 60 },
    met: '“Sixty goals. The scoreboard operator asks for a raise.”', missed: '“Fewer goals than hoped. The nets are still in good condition.”' },
  { id: 'o-clean-sheets', text: 'Keep 12 clean sheets.', for: ['low', 'mid'], goal: { kind: 'clean-sheets', n: 12 },
    met: '“Twelve clean sheets. The laundry has noticed.”', missed: '“Fewer clean sheets than hoped. The laundry copes.”' },
  { id: 'o-derby', text: 'Beat Antigoon at least once.', for: ['low', 'mid', 'high'], goal: { kind: 'derby', wins: 1 },
    met: '“Antigoon beaten. Nobody in the boardroom will stop smiling.”', missed: '“No derby win. Next season, then.”' },
  { id: 'o-home', text: 'Go 8 home matches unbeaten.', for: ['mid', 'high'], goal: { kind: 'home-unbeaten', matches: 8 },
    met: '“Eight unbeaten at home. The quay is a hard place to visit.”', missed: '“Home form wobbled. The groundsman blames the wind.”' },
  { id: 'o-above-rival', text: 'Finish above Antigoon.', for: ['low', 'mid', 'high'], goal: { kind: 'above-rival' },
    met: '“Above Antigoon. Print the table twice.”', missed: '“Below Antigoon. We have all seen the table.”' },
  { id: 'o-continental', text: 'Get out of the continental group.', for: ['high'], goal: { kind: 'continental', round: 'r16' },
    met: '“Out of the group. Passports stay in pockets a while longer.”', missed: '“Out in the group. A fine trip, all the same.”' },
];

/** 42 steps, one for each day anything is logged. The big rewards land on every seventh step. */
const at = (step: number): { reward: Reward | null; label: string } => {
  const big: Record<number, { reward: Reward; label: string }> = {
    7: { reward: { kind: 'pack' }, label: 'Pack' },
    14: { reward: { kind: 'boon-pick' }, label: 'Boon' },
    21: { reward: { kind: 'kit-piece', id: 'season-trim' }, label: 'Kit' },
    28: { reward: { kind: 'pack', size: 'big' }, label: 'Big pack' },
    35: { reward: { kind: 'theme', id: 'season-theme' }, label: 'Theme' },
    42: { reward: { kind: 'icon-odds', pct: 2 }, label: 'Icon odds' },
  };
  if (big[step]) return big[step];
  if (step % 7 === 4) return { reward: { kind: 'album-card' }, label: 'Album card' };
  return { reward: null, label: '' };
};
export const TRACK: TrackStep[] = Array.from({ length: 42 }, (_, i) => ({ step: i + 1, ...at(i + 1) }));

/** The kit pieces the season track's day-21 step gives, in order, one a season. */
export const TRACK_KIT_PIECES = [
  { id: 'collar-quay', name: 'Quay collar', text: 'A thin river-blue line round the collar.' },
  { id: 'cuffs-crane', name: 'Crane cuffs', text: 'Cuffs striped like the old crane’s arm.' },
  { id: 'socks-ferry', name: 'Ferry socks', text: 'Socks with a wave at the top.' },
  { id: 'hem-programme', name: 'Programme hem', text: 'The season’s number stitched inside the hem.' },
  { id: 'sleeve-lantern', name: 'Lantern sleeve', text: 'A small lantern on the left sleeve.' },
  { id: 'number-gold', name: 'Gold numbers', text: 'Shirt numbers outlined in gold.' },
];
/** The themes the day-35 step gives, in order, one a season. Layer 3 maps them to the app's themes. */
export const TRACK_THEMES = [
  { id: 'floodlight', name: 'Floodlight', text: 'White light on a dark pitch.' },
  { id: 'quay-dusk', name: 'Quay at dusk', text: 'Orange sky over the river.' },
  { id: 'away-end', name: 'Away end', text: 'The visitors’ colours, for a change.' },
  { id: 'ferry-night', name: 'Ferry night', text: 'Lanterns on black water.' },
  { id: 'programme-paper', name: 'Programme paper', text: 'Cream paper and old print.' },
  { id: 'kaai-mist', name: 'Kaai mist', text: 'Soft grey with a gold edge.' },
];
