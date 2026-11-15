// Look pass L4: the "how this works" sheets on Football's daily path (Tonight, the parcel, the match, a call, Story).
// Four short steps and the key numbers, each number read from the rules it describes.
import { KEEP_STOP } from '../../football/engine';
import { CARD_MAX } from '../../football/matchday';
import { PARCEL_MAX } from '../../football/parcel';
import { BOUNTIES_PICKED, TRACK } from '../../football/content/season';
import { AXIS_INK } from '../../ui/inks';
import type { HowThisWorks } from '../../ui/kit/Kit';

const OR = '#ff9a4d', GOLD = '#f2c46d', BLUE = '#93c3dc', LAV = '#c2b2ff', GREEN = '#8fdcb6', PINK = '#f4aedb', CORAL = '#ff9a76';
const keep = Math.round(KEEP_STOP * 100);
/** The season track's big rewards (anything but the small album-card marks), read from the track itself. */
const bigs = TRACK.filter((s) => s.reward && s.reward.kind !== 'album-card').length;

export const TONIGHT_HOW: HowThisWorks = {
  title: 'How tonight works',
  steps: [
    { icon: 'trend', ink: GREEN, head: 'Your day is the team', line: 'Each habit you log fills one of six axes. The shape is fixed when you close the day.' },
    { icon: 'swap', ink: OR, head: 'The plan', line: 'Press, Hold or Counter, with tempo and width. It can change until kick-off.' },
    { icon: 'scope', ink: BLUE, head: 'The read', line: 'Against a scouted club, the plan that answers them and their weak side are worth +1 each.' },
    { icon: 'moon', ink: LAV, head: 'Played overnight', line: 'The match is set up at 4 am and waits in the morning parcel, to watch or skip.' },
  ],
  chips: [{ text: '6 axes', ink: GREEN }, { text: 'Good read +1, at most +2', ink: BLUE }, { text: `Up to ${CARD_MAX} tactic cards`, ink: GOLD }, { text: 'Not logged: plays low and wild', ink: PINK }],
};

export const PARCEL_HOW: HowThisWorks = {
  title: 'How the parcel works',
  steps: [
    { icon: 'pack', ink: GOLD, head: 'Sealed overnight', line: 'At 4 am last night’s match, the scouts, the academy, the dice and any pack are sealed in.' },
    { icon: 'play', ink: OR, head: 'Last night first', line: 'The match leads. Watch it with your calls, or skip it, before any score shows.' },
    { icon: 'list', ink: BLUE, head: 'One at a time', line: 'Each thing opens in turn, in its own colour. “Tap to go on” moves to the next.' },
    { icon: 'moon', ink: LAV, head: 'Shut at night', line: 'After Close the day only packs and results are held. The table, squad and cup runs stay open.' },
  ],
  chips: [{ text: `Up to ${PARCEL_MAX} things`, ink: GOLD }, { text: 'Opens after 4 am', ink: OR }, { text: 'Once a day', ink: BLUE }],
};

export const MATCH_HOW: HowThisWorks = {
  title: 'How a match works',
  steps: [
    { icon: 'play', ink: OR, head: 'It waits for you', line: 'Last night’s match stops before kick-off until you watch it or skip it.' },
    { icon: 'bolt', ink: GREEN, head: 'Every chance on your shape', line: 'Each chance is sized by tonight’s numbers. The odds you see are the odds used.' },
    { icon: 'swap', ink: LAV, head: 'Calls and half-time', line: 'It stops one to three times for a call. At half-time the plan can change for the second half.' },
    { icon: 'clock', ink: BLUE, head: 'Left alone', line: 'Not opened by the next 4 am, your assistant finishes it and takes the best odds.' },
  ],
  chips: [{ text: '1 to 3 calls', ink: LAV }, { text: `Keep the ball: ${keep} points`, ink: AXIS_INK.Routine }, { text: 'Good read +1, at most +2', ink: BLUE }, { text: 'Quick: +1 chance each way', ink: OR }],
};

export const CALL_HOW: HowThisWorks = {
  title: 'How a call works',
  steps: [
    { icon: 'bolt', ink: AXIS_INK.Pace, head: 'Take it on', line: 'The chance goes to the axis the moment favours, at that axis’s odds tonight.' },
    { icon: 'arrow', ink: AXIS_INK.Power, head: 'Shoot on sight', line: 'A long-range chance with low odds. One under 20% that goes in is a screamer.' },
    { icon: 'shield', ink: AXIS_INK.Routine, head: 'Keep the ball', line: `No chance now, and their next attack is ${keep} points easier to stop.` },
    { icon: 'check', ink: GOLD, head: 'Honest dice', line: 'One draw decides: an option scores if the draw is under its odds. A call never changes the luck of later chances.' },
  ],
  chips: [{ text: 'Shown odds are the odds used', ink: GOLD }, { text: `Keep: ${keep} points`, ink: AXIS_INK.Routine }, { text: 'Your assistant: the best odds', ink: BLUE }],
};

export const storyHow = (legend: string): HowThisWorks => ({
  title: 'How the story works',
  steps: [
    { icon: 'calendar', ink: GOLD, head: 'The season track', line: `${TRACK.length} steps, one for each day you log anything; good days aren’t needed. ${bigs} big rewards along the way.` },
    { icon: 'list', ink: GREEN, head: 'Bounties', line: `Six real-habit jobs a week. Pick ${BOUNTIES_PICKED}; each lasts until Sunday.` },
    { icon: 'shield', ink: CORAL, head: 'Rivals', line: `A club becomes a rival by beating you on a big night, three times running, or by a single goal. Beat one five times in a row and it fades. ${legend} never fades.` },
    { icon: 'book', ink: LAV, head: 'Seasons and Old Selves', line: 'Every season keeps its finish, cups, kit, crest and Wrapped. Your finished months play on as Old Selves; each season the weakest retires to their cup.' },
  ],
  chips: [{ text: `${TRACK.length} steps`, ink: GOLD }, { text: `Pick ${BOUNTIES_PICKED} bounties`, ink: GREEN }],
});
