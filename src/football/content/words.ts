// Words for engine 2, in the back page's voice: dry, warm, never scolding.
// Placeholders: {opp} the opponent, {key} the opponent's key player, {player} our player,
// {minute} the minute, {name} a youngster's habit name, {nation} a nation, {club} Brabo United.
import type { EraId, Unit } from './types';
import { ERAS } from './tree';

/** The night before a match (spec §9.5): the opponent's strongest unit and its key player, and the habit that answers it. A clear target, not a forecast. */
export const SCOUT_LINES: Record<Unit, string[]> = {
  Pace: [
    '{opp}’s wingers are quick, {key} quickest of all. Tomorrow’s steps matter.',
    '{key} will run at us all night. Our answer is in tomorrow’s step count.',
    '{opp} love a counter-attack, and {key} leads it. Walk tomorrow; we’ll need the legs.',
    'Fast wide men at {opp}: watch {key}. A good steps day keeps up with them.',
  ],
  Power: [
    '{opp} have a big striker in {key}. A training session tomorrow gives us something to hit back with.',
    '{key} scores from anywhere for {opp}. Tomorrow’s session is our reply.',
    '{opp} shoot on sight, {key} most of all. Get a session in tomorrow.',
    'Expect {key} to try from distance. Lift tomorrow, and we can too.',
  ],
  Fuel: [
    '{opp}’s midfield never stops running; {key} is the engine. Protein tomorrow keeps ours going.',
    '{key} wins everything in the middle for {opp}. Tomorrow’s meals decide our midfield.',
    '{opp} out-run people. {key} especially. Eat well tomorrow, inside the range, and we’ll match them.',
    'A busy midfield at {opp}, led by {key}. Protein and three logged meals tomorrow.',
  ],
  Rest: [
    '{opp} have a keeper in {key} who saves everything. A good night’s sleep and we’ll find a way past.',
    '{key} marshals {opp}’s back line. Bedtime tonight matters more than usual.',
    '{opp} defend deep, and {key} reads it all. Sleep well; patience needs it.',
    '{key} in goal for {opp}: a wall. Our keeper needs a full night too.',
  ],
  Routine: [
    '{opp} keep the ball for ages; {key} sets the tempo. A full checklist tomorrow keeps us in shape.',
    '{key} pulls the strings for {opp}. Tick every slot tomorrow and we can press them.',
    '{opp} are tidy, {key} tidiest of all. A tidy day of ticks is the answer.',
    'Patient passers at {opp}, through {key}. Keep the routine tomorrow.',
  ],
  Shape: [
    '{opp}’s full-backs push high, {key} highest. A weigh-in tomorrow keeps our shape.',
    '{key} presses from the front for {opp}. Log the scale tomorrow and we hold our line.',
    '{opp} squeeze the pitch, led by {key}. Keep the body log going tomorrow.',
    'A compact side at {opp}; {key} holds it together. Our shape needs tomorrow’s log.',
  ],
};

/** Shown on the new-era moment (spec §16: it should feel like a grand achievement). */
export const ERA_INTROS: Record<EraId, string> = Object.fromEntries(ERAS.map((e) => [e.id, e.intro])) as Record<EraId, string>;

/** Named-goal commentary per unit (spec §8 named credit). Signature moves have their own lines in traits.ts. */
export const GOAL_LINES: Record<Unit, string[]> = {
  Pace: [
    '{minute}′. {player} beats the full-back for pace and slides it in. {club} lead.',
    '{player} is gone. Nobody at {opp} can catch it. Goal, {minute}′.',
    'A counter from nowhere: {player} runs half the pitch and finishes.',
    '{player} down the wing, to the byline, and in off the near post!',
    'Breakaway! {player} takes one touch to set, one to score.',
    '{player} outruns the whole {opp} defence. {minute}′, and the quay is up.',
  ],
  Power: [
    '{player} hits it from twenty-five yards and the net bulges. {minute}′.',
    'A thunderbolt! {player} doesn’t so much shoot as launch it.',
    '{player} rises highest and heads it home. Goal, {minute}′.',
    'Set piece, {player}, top corner. The wall didn’t move. Nor did the keeper.',
    '{player} holds off two of {opp} and drives it low into the corner.',
    '{minute}′. {player} takes the shot nobody else would and it flies in.',
  ],
  Fuel: [
    '{player} wins it in midfield, carries it forty yards and finishes. {minute}′.',
    'Box to box: {player} starts the move and ends it.',
    '{player} arrives late in the box, unmarked, and side-foots it home.',
    'Still running at {minute}′, {player} gets on the end of it. Goal.',
    '{player} pinches it off {opp}’s midfield and is through. In!',
    'That’s the engine room: {player}, a tackle, a run, a goal.',
  ],
  Rest: [
    '{player} saves, and the counter ends in a goal. {minute}′.',
    'A goal from a goal kick: {player} launches it, and {opp} never recover.',
    '{player} stops one at one end; {club} score at the other.',
    'Calm as anything, {player} plays out from the back and the move ends in the net.',
  ],
  Routine: [
    'Twenty passes, then {player} rolls it in. {minute}′.',
    '{player} threads it through, and the finish is easy from there.',
    'Patient, patient, then {player} and in. {opp} touched it twice.',
    '{player} finds the gap nobody else saw. Goal, {minute}′.',
    'Tick, tick, tick, {player}. One–nil to the routine.',
  ],
  Shape: [
    '{player} overlaps, cuts it back, and finishes it too. {minute}′.',
    'The press works: {player} steals it high up and scores.',
    '{player} wins it on the edge of their box and curls it in.',
    'From the back line to the net: {player} keeps going, and so does the ball.',
    '{player} hunts down a {opp} defender, takes it, scores.',
  ],
};

/** Saves and blocks get credited too (spec §8). */
export const SAVE_LINES: Record<'Rest' | 'Shape' | 'Routine', string[]> = {
  Rest: ['{player} saves with a strong hand. {minute}′.', 'Brilliant from {player}, low to the left.', '{player} gets a fingertip to it. Over.'],
  Shape: ['{player} throws a body in the way. Blocked.', 'Last-ditch from {player}: the shot goes nowhere.', '{player} reads it and steps across. Blocked, {minute}′.'],
  Routine: ['{player} is exactly where the ball goes. Cleared.', 'A tidy interception by {player}. Nothing doing for {opp}.', '{player} keeps the shape and the chance dies.'],
};

/**
 * A youngster not promoted by the season's end leaves (spec §9.2). Never a penalty, never shaming:
 * the habit was tried, and the door stays open.
 */
export const FAREWELLS: string[] = [
  '{name} heads off for pastures new, with a handshake and a scarf. The academy door stays open.',
  '{name} leaves the academy for a season elsewhere. Everyone at the quay wishes it well.',
  '{name} signs for a club near home. Come back and visit any time.',
  '{name} moves on. Some habits find their time later; this one might yet.',
  '{name} is off to see the world. The Portakabin keeps its peg.',
  'A warm send-off for {name}, who learned a lot and taught us something too.',
  '{name} leaves on good terms. The trials are every Sunday, if it ever wants another go.',
  '{name} takes the ferry out. The coaches wave from the pier.',
  'Farewell to {name}: not this season, but nobody here forgets a trialist.',
  '{name} heads off with the academy’s best wishes and a signed programme.',
  '{name} steps away from football for now. The shirt will keep.',
  '{name} leaves, and the kit man folds the shirt carefully, just in case.',
  'The academy says goodbye to {name}. Good luck out there.',
  '{name} moves on. There’s no bad blood, only a standing invitation.',
];

/** International duty (spec §9.4): logged on 2 of the 3 days, a player comes back with something. */
export const DUTY_LINES: string[] = [
  '{player} is back from {nation} duty with a new trick.',
  '{player} played well for {nation} and came back sharper.',
  'A good week with {nation} for {player}: back with something to show.',
  '{player} returns from {nation}, a little taller in the dressing room.',
];
/** On duty, but logged on fewer than 2 days: no change, said kindly. */
export const DUTY_QUIET: string[] = [
  '{player} is back from {nation}. A quiet trip, and a rested one.',
  '{player} returns from {nation} duty, ready to go again.',
];

/** The running-low notice (spec §16): one notice, once, at 80–85% collected. */
export const RUNNING_LOW = {
  title: 'Running low on new {pool}',
  line: 'You’ve collected most of the {pool}. It’s a good time to ask Claude for more content.',
};
