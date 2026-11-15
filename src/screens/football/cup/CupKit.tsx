// Cup runs on the kit (look pass, fork L7): the tactics-board world keeps its board, slabs, chalk and coaching-board
// cards, and takes the kit's rules: one way back and the page's name (on its slab), rules behind a "?", one glowing
// action a page (a slanted slab in the action colour, its glow falling below it), quiet outlined ones for the rest.
import type { ReactNode } from 'react';
import { BackLink, HelpButton, type HowThisWorks } from '../../../ui/kit/Kit';
import { AXIS_INK } from '../../../ui/inks';
import { TUNE } from '../../../football/cup/match';
import { RUN_TUNE } from '../../../football/cup/run';
import { Slab } from './CupArt';

/** The header of every cup page: one way back, the page's name on its slab, and the "?" when the page has rules. */
export function CupHead({ back, onBack, title, help, right }: { back?: string; onBack?: () => void; title: ReactNode; help?: HowThisWorks; right?: ReactNode }) {
  return (
    <header className="cup-head">
      {back && onBack ? <BackLink label={back} onClick={onBack} /> : null}
      <h1 className="cup-head-t"><Slab>{title}</Slab></h1>
      <span className="cup-head-r">{right}{help && <HelpButton how={help} />}</span>
    </header>
  );
}

/** The one glowing action. `quiet` makes it an outline (any other button on the page). */
export function CupAct({ children, onClick, quiet, disabled, on, className }: { children: ReactNode; onClick: () => void; quiet?: boolean; disabled?: boolean; on?: boolean; className?: string }) {
  return (
    <button type="button" className={`cup-btn${quiet ? ' ghost' : ' lit'}${on ? ' on' : ''}${className ? ` ${className}` : ''}`} disabled={disabled} aria-pressed={on} onClick={onClick}>
      <span>{children}</span>
    </button>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The match's "?": how a cup match works. Every number comes from the rules. */
export const MATCH_HOW: HowThisWorks = {
  title: 'How a cup match works',
  steps: [
    { icon: 'route', ink: AXIS_INK.Pace, head: 'Build a move', line: `Passes and carries take the ball up three zones. Each pass adds ×${TUNE.pass} build-up.` },
    { icon: 'bolt', ink: AXIS_INK.Power, head: 'Finish in the final third', line: 'Shot times build-up against their defence. At or above it is a goal; half of it or more is a near miss that lowers it.' },
    { icon: 'shield', ink: AXIS_INK.Rest, head: 'Cover their attack', line: `At the end of each spell their attack meets your cover. Short by 1 to ${TUNE.shortMax} costs fitness; by more, they score.` },
    { icon: 'swap', ink: AXIS_INK.Routine, head: 'Tap to read, tap again to play', line: `Press and hold for the full text. Recycle drops a card and draws another for ${TUNE.recycleCost} stamina.` },
  ],
  chips: [
    { ink: AXIS_INK.Pace, text: `${TUNE.hand} cards a spell` },
    { ink: AXIS_INK.Fuel, text: `${TUNE.stamina} stamina` },
    { ink: AXIS_INK.Shape, text: `${TUNE.spells} spells, level goes to pens` },
    { ink: AXIS_INK.Power, text: `A goal: their defence +${pct(TUNE.reform)}` },
  ],
};

/** The map's "?": how the map and its stops work. */
export const MAP_HOW: HowThisWorks = {
  title: 'How the map works',
  steps: [
    { icon: 'map', ink: '#ede6da', head: 'Pick a lit stop', line: 'Lines show where each stop leads. You see the whole map from the start.' },
    { icon: 'play', ink: '#d9e8f3', head: 'Win matches to go on', line: 'A loss ends the run. After a win, take one of three cards for the run. An elite club also pays an heirloom.' },
    { icon: 'plus', ink: '#93c3dc', head: 'Rest, shop, or choose', line: 'The physio restores fitness or drills a card. A stall sells cards for coins. A story asks you to choose.' },
    { icon: 'tempo', ink: '#f2c46d', head: 'Fitness carries', line: 'Fitness goes from stop to stop. At zero your cover counts for half; the run goes on.' },
  ],
  chips: [
    { ink: '#93c3dc', text: `${TUNE.fitness} fitness to start` },
    { ink: '#f2c46d', text: `Coins for a win, +${RUN_TUNE.goalCoins} a goal` },
    { ink: '#ede6da', text: 'Saved after every stop' },
  ],
};

/** The cups' "?": how cup runs work. */
export const CUPS_HOW: HowThisWorks = {
  title: 'How cup runs work',
  steps: [
    { icon: 'deal', ink: AXIS_INK.Pace, head: 'Your week deals the deck', line: 'Your last seven nights, as the league match scored them: 15 or more great, 11 to 14 good, under 11 basic.' },
    { icon: 'map', ink: '#ede6da', head: 'Choose a path', line: 'A map of matches, rests, stalls and stories up to the final.' },
    { icon: 'play', ink: AXIS_INK.Power, head: 'Play card matches', line: 'Six spells a match, a hand of five. Lose a match and the run ends.' },
    { icon: 'win', ink: '#f2c46d', head: 'Win a cup, open the next', line: 'Each cup adds a twist and keeps the earlier ones.' },
  ],
  chips: [
    { ink: '#f2c46d', text: '12 cups' },
    { ink: '#ede6da', text: 'One run at a time' },
    { ink: AXIS_INK.Fuel, text: 'The first run each day pays research' },
    { ink: AXIS_INK.Rest, text: 'Never league points' },
  ],
};
