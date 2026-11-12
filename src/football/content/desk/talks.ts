// Loan and sponsor talks (desk-and-world spec §5, w3-haggle). Written by the market fork in the writing chat's voice:
// specific, a little dry, never generic, no gendered pronouns. Tokens: {player} the loan target, {club} their club,
// {days} the length, {division} Brabo's division, {unit} the player's axis, {until} a date in words, {brand} a sponsor.
import type { LoanPush, SponsorPush } from '../../market/market';

/** Their opening. A line is picked by the talk's seed. */
export const TALK_OPEN: string[] = [
  '“{days} days, and {player} starts every match. We are not sending our best to sit on a bench in {division}.”',
  '“{player} needs games, not a scarf and a good view. {days} days, every match, and the fee on the table.”',
  '“We’ve had three calls about {player} this week. Two were wrong numbers. You’re the third. {days} days, every match.”',
  '“The chairman says {days} days. The physio says {player} plays or sulks. I say pay the fee and we all go home.”',
];

/** Your replies: the button. */
export const REPLY_LABEL: Record<LoanPush | 'agree', string> = {
  agree: 'Agree: {player} starts every match',
  fee: 'Ask for a smaller fee',
  days: 'Offer {days} days at the same fee',
  promise: 'No promise of minutes',
};
export const SPONSOR_LABEL: Record<SponsorPush | 'agree', string> = {
  agree: 'Sign on these terms',
  more: 'Ask for more a season',
  longer: 'Ask for another season',
  bonus: 'Ask for a signing bonus',
};

/** What they say after a push comes off. */
export const PUSH_HIT: Record<LoanPush, string[]> = {
  fee: ['“Fine. Our treasurer will cry into the receipt book, but fine.”', '“That much? … That much. Don’t tell the board it was this easy.”'],
  days: ['“Longer, then. {player} likes your place; something about the pitch having a nice slope to it.”', '“{days} days. That’s a second suitcase. We won’t invoice you for it, as a treat.”'],
  promise: ['“No promise, then. {player} will earn it, and says that’s how it always goes. Mostly true.”', '“Fair. If your {unit} turns up, so does {player}. That’s football.”'],
};
/** What they say when a push fails. */
export const PUSH_MISS: Record<LoanPush, string[]> = {
  fee: ['“The fee is the fee. It was the fee yesterday and it will be the fee at your retirement do.”', '“Our accountant just made a noise I’ve never heard before. No.”'],
  days: ['“Seven means seven. We have a cup tie on the eighth and one left back, mostly bandage.”', '“Any longer and {player} changes postcode. No.”'],
  promise: ['“Nobody moves clubs to watch your {unit} from the bench. Every match, or nothing.”', '“No minutes, no {player}. The family have already been told: starting.”'],
};
export const SPONSOR_HIT: Record<SponsorPush, string> = {
  more: '“A little more a season. Our marketing lead says you have “an authentic regional energy”. Nobody knows what that means.”',
  longer: '“Another season. We’d already printed the mugs anyway.”',
  bonus: '“A bonus on signing. The finance team will need a lie-down, but yes.”',
};
export const SPONSOR_MISS: Record<SponsorPush, string> = {
  more: '“That’s the number. It went through four committees and one of them was mostly lunch.”',
  longer: '“One season at a time. The last club we signed for three went down twice in the first.”',
  bonus: '“A bonus. For a sleeve. Have you met our finance director?”',
};
export const SPONSOR_OPEN = '“{brand} would love to be part of the Brabo story. For a fixed fee. Per season. Non-negotiable, we say, negotiating.”';

/** How it ends. */
export const TALK_WALKED: string[] = [
  '“We’re done. Call us in a week, when you’ve found your manners and your chequebook.”',
  'They hang up mid-sentence. The scout says they do that. The scout also says: give it a week.',
];
export const TALK_DEAL: string[] = [
  '“Done. {player} will be on the morning bus. Feed them; they forget.”',
  '“Shake on it. Look after {player}: the only one here who knows where the corner flags are kept.”',
];
export const TALK_SHORT = 'The money isn’t there. They’re polite about it, which is somehow worse. The target stays in the market.';

/** What the scout's study turned up: their soft spot, and their sore one. {until}: a date in words. */
export const SCOUT_SOFT: Record<LoanPush, string> = {
  fee: 'Your scout says their books need any fee at all, not a big one.',
  days: 'Your scout says they need {player} gone till {until}.',
  promise: 'Your scout says {player} only wants to play, and won’t count the minutes.',
};
export const SCOUT_SORE: Record<LoanPush, string> = {
  fee: 'Your scout says the fee is the chairman’s pride. Don’t touch it.',
  days: 'Your scout says they want {player} back for a cup tie. Don’t ask for longer.',
  promise: 'Your scout says the minutes are in the contract. They won’t move.',
};
