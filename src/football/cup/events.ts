// Story events (spec §7): thirty short scenes for the "?" stops. Each has two or three choices that say plainly what
// they cost and give (the words are made from the effect, so they never drift from it). Two of the six axes may speak
// up in their own voice: Rest tired and dry, Power blunt, Pace restless, Fuel practical, Routine fussy, Shape vain
// about numbers. The cast have no names or faces yet. Football only: no real people beyond club names, nothing
// religious, no betting or drinking.
import type { Axis } from '../types';
import { titleOf } from './cards';
import type { AnyKind, Level } from './types';

export type Cast = 'physio' | 'chairman' | 'academy' | 'kit man' | 'rival manager' | 'federation official' | 'supporters' | 'groundsman' | 'scout';

export interface EventFx {
  coins?: number; fitness?: number;
  /** A card for this run. */
  card?: { kind: AnyKind; level: Level };
  /** A random card from the pool at this level. */
  randomCard?: Level;
  heirloom?: boolean;
  removePunt?: boolean;
  /** One random card in the deck goes up a level. */
  upgrade?: boolean;
  /** The next match: first finish +shot, first spell +cover, their attacks seen two spells ahead. */
  firstShot?: number; firstCover?: number; see?: boolean;
  /** A line of lore kept with the run. */
  lore?: string;
}
export interface EventChoice { label: string; fx: EventFx; after: string }
export interface EventDef { id: string; title: string; cast: Cast | null; text: string; voices?: [Axis, string][]; choices: EventChoice[] }

/** The plain cost and gain of a choice, made from its effect. */
export function fxWords(f: EventFx): string {
  const out: string[] = [];
  if (f.coins) out.push(f.coins > 0 ? `Gain ${f.coins} coins` : `Pay ${-f.coins} coins`);
  if (f.fitness) out.push(f.fitness > 0 ? `Recover ${f.fitness} fitness` : `Lose ${-f.fitness} fitness`);
  if (f.card) out.push(`A ${f.card.level} ${titleOf(f.card.kind)} for this run`);
  if (f.randomCard) out.push(`A ${f.randomCard} card for this run`);
  if (f.heirloom) out.push('An heirloom');
  if (f.removePunt) out.push('One hopeful punt out of the deck');
  if (f.upgrade) out.push('One card up a level');
  if (f.firstShot) out.push(`Next match: first finish +${f.firstShot} shot`);
  if (f.firstCover) out.push(`Next match: ${f.firstCover} cover in the first spell`);
  if (f.see) out.push('Next match: their attacks shown two spells ahead');
  if (!out.length) out.push(f.lore ? 'Nothing changes. You keep the story' : 'Nothing changes');
  return out.join('. ') + '.';
}

const E = (id: string, title: string, cast: Cast | null, text: string, voices: [Axis, string][], choices: EventChoice[]): EventDef => ({ id, title, cast, text, voices, choices });
const C = (label: string, fx: EventFx, after: string): EventChoice => ({ label, fx, after });

export const EVENTS: EventDef[] = [
  E('scout-coat', 'A knock at the dressing-room door', 'scout',
    'A man in a long coat says he scouts for a club two divisions up. He has watched your last three matches from the back row. He wants ten minutes with your striker, alone.',
    [['Rest', 'You have had four hours of sleep. You are in no state to judge anyone\'s coat.'], ['Power', 'He wrote something down every time we shot. Count the pages.']],
    [C('Let him talk', { coins: 20 }, 'He leaves an envelope "for the kit fund" and a business card with no phone number on it.'),
     C('Show him the door', { firstShot: 2 }, 'The striker heard all of it through the wall. They will play angry.'),
     C('Ask what he saw', { fitness: -4, see: true }, 'He talks for forty minutes about the next club\'s left-back. Your legs go stiff on the bench.')]),
  E('kit-wash', 'The kit is still wet', 'kit man',
    'The dryer at the ground gave up overnight. The kit man has the shirts laid out on the radiators of three changing rooms and is turning them every ten minutes, like toast.',
    [['Routine', 'Number seven is on the wrong radiator. It always goes on the second one.'], ['Fuel', 'Warm shirts. Fine. Has anyone eaten?']],
    [C('Play in damp shirts', { fitness: -5 }, 'Clammy for the first spell. Nobody mentions it, everybody feels it.'),
     C('Pay for the launderette', { coins: -10, firstCover: 4 }, 'Folded, warm, smelling faintly of someone else\'s fabric softener. Calm heads.'),
     C('Wear last season\'s away kit', { lore: 'The night you played in the old away kit, the one with the shoulders.' }, 'It still fits. Mostly. The photographers love it.')]),
  E('chairman-budget', 'The chairman has a spreadsheet', 'chairman',
    'The chairman catches you in the corridor with a printout. Cup money is "an unexpected line in the budget" and he would like it to stay unexpected, ideally in his account.',
    [['Shape', 'Column F is wrong. It says 14 and the total says 41. I would know.'], ['Power', 'Tell him no.']],
    [C('Hand over half', { coins: -15, heirloom: true }, 'He is so pleased he gives you the old trophy cabinet key. And something from inside it.'),
     C('Point out column F', { coins: 10 }, 'He goes quiet, then pale, then finds you ten coins he "forgot about".'),
     C('Say you will think about it', {}, 'He nods slowly. You will be thinking about it for the rest of the run.')]),
  E('academy-kid', 'Someone from the academy', 'academy',
    'The academy head brings a sixteen-year-old to the training ground. The kid has done kick-ups in the car park for an hour waiting for you. Their shoes are the wrong shoes.',
    [['Pace', 'Put them on. Now. Let them run at somebody.'], ['Rest', 'An hour of kick-ups in a car park. In those shoes. Admirable. Ice.']],
    [C('Give them a run-out', { randomCard: 'good' }, 'They nutmeg your captain in the rondo and apologise for ten minutes.'),
     C('Send them home with a signed ball', { fitness: 3 }, 'The kid walks off holding the ball like it is a cake. The squad is in a good mood.')]),
  E('floodlight', 'Floodlight failure', 'groundsman',
    'Half the floodlights go out ten minutes before the warm-up. The groundsman is up a ladder with a torch in his mouth. He says, through the torch, that it is fine.',
    [['Rest', 'Darkness. At last.'], ['Routine', 'We warm up at minus forty. It is minus thirty-two. Everything is late now.']],
    [C('Warm up in the half-dark', { fitness: -3, firstCover: 5 }, 'Everyone stays close to everyone else. It turns out to be a decent shape.'),
     C('Pay an electrician', { coins: -12, fitness: 4 }, 'Light. Warmth. A proper warm-up. The groundsman pretends he had nearly fixed it.')]),
  E('rival-handshake', 'The other manager wants a word', 'rival manager',
    'Their manager finds you in the tunnel and shakes your hand for slightly too long. He says he has "heard a lot" about your system. He smiles like he has heard all of it.',
    [['Shape', 'Of course he has heard about the system. It is a very good system.'], ['Pace', 'Can we just start? Why are we standing in a tunnel?']],
    [C('Change something small', { upgrade: true, fitness: -3 }, 'An extra session on the morning of the match. One drill sticks.'),
     C('Change nothing', { firstShot: 3 }, 'Let him prepare for what he heard. You play exactly that, only faster.')]),
  E('federation-form', 'A form from the federation', 'federation official',
    'A federation official in a lanyard arrives with a form about the length of your grass. The grass is fine. The form is eleven pages and needs a stamp you do not own.',
    [['Routine', 'Page four, box C. You put a tick. They wanted a cross.'], ['Fuel', 'Eleven pages. We will need sandwiches.']],
    [C('Fill it in properly', { fitness: -2, coins: 8 }, 'He is so surprised that he mentions a small grant for "grassroots compliance".'),
     C('Pay the fine and move on', { coins: -8 }, 'He takes the coins and gives you a receipt that is also eleven pages long.'),
     C('Ask him to measure the grass himself', { lore: 'The night a federation official measured your grass with his own ruler.' }, 'He does. With a ruler from his inside pocket. It is within regulations.')]),
  E('supporters-coach', 'The supporters\' coach broke down', 'supporters',
    'Forty of your supporters are stranded at a service station two hours away. Their group chat has your number. It is a lot of messages.',
    [['Pace', 'Send something. Anything. A bus. Go.'], ['Fuel', 'Two hours at a service station. They will have eaten everything. Bring more.']],
    [C('Pay for a second coach', { coins: -15, firstCover: 6 }, 'They arrive at half-time of the warm-up, hoarse already. The away end is full.'),
     C('Promise them the shirts after', { lore: 'Forty shirts, given away after the match, still damp.' }, 'They listen on the radio. They are very loud on the radio.')]),
  E('physio-knee', 'The physio has a look', 'physio',
    'The physio presses on a knee, asks "does that hurt", and is told "no" in a voice that means yes. She writes something down and underlines it twice.',
    [['Rest', 'It hurts. It is fine. It hurts.'], ['Power', 'Strap it.']],
    [C('Rest the knee properly', { fitness: 10, firstShot: -2 }, 'The knee is grateful. The finishing is a bit careful for a match.'),
     C('Strap it and play', { fitness: -6, firstShot: 3 }, 'Taped from shin to thigh. Plays like it has something to prove.')]),
  E('rain', 'It has rained for a week', 'groundsman',
    'The pitch is less a pitch and more a suggestion. The groundsman has put down sand, more sand, and a plank. The ball stops where it lands.',
    [['Pace', 'I hate this. I hate everything about this.'], ['Power', 'Good. Hit it hard and low.']],
    [C('Play it long', { card: { kind: 'long-range', level: 'good' } }, 'Nobody passes. Everybody shoots. Somehow it works.'),
     C('Fork the pitch at half-time', { fitness: -4, firstCover: 4 }, 'The whole squad with garden forks. Character-building, says the groundsman.')]),
  E('old-programme', 'A box of old programmes', 'kit man',
    'Clearing the boot room, the kit man finds a box of programmes from the club\'s first cup run. On page nine, a team photo, everyone squinting into the sun.',
    [['Shape', 'Four at the back, 1981. Someone drew arrows on it in biro. Bad arrows.'], ['Routine', 'They are in date order except for March. Who did March?']],
    [C('Pin one up in the dressing room', { heirloom: true }, 'Players touch it on the way out. Nobody says why.'),
     C('Sell them at the stall', { coins: 18 }, 'Collectors appear from nowhere. One drives three hours for a single issue.')]),
  E('chairman-speech', 'The chairman wants to give a speech', 'chairman',
    'Before kick-off, the chairman asks to "say a few words" in the dressing room. He has notes. The notes have headings.',
    [['Fuel', 'Keep it short. They need to eat a banana before the bell.'], ['Pace', 'Headings. He has headings.']],
    [C('Let him speak', { fitness: -3, coins: 12 }, 'Heading three is about the new roof. The players stand very still. He doubles the bonus.'),
     C('Say there is no time', { firstShot: 1 }, 'He takes it well, then gives the speech to the press instead. Nobody minds.')]),
  E('nutritionist', 'A note on the team sheet', 'physio',
    'Someone has stuck a note on the team sheet: "pasta at 12, not 1". It is in the physio\'s handwriting but she says she did not write it.',
    [['Fuel', 'Pasta at twelve is correct. I wrote it. Fine. I wrote it.'], ['Routine', 'Twelve. Not one. Twelve.']],
    [C('Lunch at twelve', { card: { kind: 'carb-load', level: 'good' } }, 'Everyone is fuelled and slightly smug about it.'),
     C('Lunch at one, as always', { fitness: 2 }, 'Tradition holds. The note goes missing.')]),
  E('training-ground-fox', 'A fox on the training ground', 'groundsman',
    'A fox has moved under the groundsman\'s shed. It has taken four balls, a cone and one glove. It watches training with its head on one side.',
    [['Pace', 'It is faster than our left-back. Sign it.'], ['Rest', 'It sleeps all day under a shed. I feel seen.']],
    [C('Leave it be', { lore: 'The fox under the shed, who kept one of the gloves.' }, 'It starts sitting on the halfway line for the last ten minutes of every session.'),
     C('Buy a new set of balls', { coins: -6, upgrade: true }, 'New balls bounce true. One drill finally clicks.')]),
  E('wrong-hotel', 'The wrong hotel', null,
    'The coach pulls up outside a hotel with your club\'s name on the board. It is the right name and the wrong hotel. The right one is across the motorway.',
    [['Rest', 'This one has beds. That is all I ask.'], ['Routine', 'The booking says the other one. We go to the other one.']],
    [C('Stay here', { coins: -10, fitness: 8 }, 'Expensive, quiet, enormous pillows. Everyone sleeps.'),
     C('Cross the motorway', { fitness: -3, coins: 5 }, 'Forty minutes and a refund for the mix-up.')]),
  E('veteran-retires', 'The oldest player in the squad', null,
    'Your oldest player says this cup is their last. They ask to take the warm-up, the way it was done when they were young: long, loud, with a lot of star jumps.',
    [['Power', 'Let them. They earned it.'], ['Shape', 'Star jumps are not in the plan. Fine. Fine.']],
    [C('Let them run the warm-up', { fitness: -4, randomCard: 'great' }, 'Everyone is out of breath and grinning. Something from the old days makes it into the deck.'),
     C('Give them the armband instead', { firstCover: 5 }, 'They lead the team out holding the armband like it is made of glass.')]),
  E('rival-mind-games', 'A rumour in the paper', 'rival manager',
    'A local paper says your best finisher has asked to leave. Your best finisher learns this from the local paper, at breakfast, and puts the paper in the toast rack.',
    [['Power', 'Rubbish.'], ['Shape', 'The photo they used is from two seasons ago. We were a 4-4-2 then.']],
    [C('Say nothing', { firstShot: 3 }, 'The finisher has a point to make. It is a large point.'),
     C('Call the paper', { fitness: -2, coins: 6 }, 'They print a correction and a half-page advert for the next home match.')]),
  E('stall-sale', 'Closing-down sale at the club shop', 'supporters',
    'The club shop is clearing last season\'s stock. There is a bin of scarves, a bin of mugs, and one large foam hand that nobody has ever bought.',
    [['Fuel', 'The mugs are fine. Take a mug.'], ['Pace', 'The foam hand. Buy the foam hand.']],
    [C('Buy the foam hand', { coins: -5, lore: 'The foam hand, waved from the dugout for a whole cup run.' }, 'It goes on the dugout roof. Supporters wave back.'),
     C('Rummage in the scarf bin', { coins: -10, heirloom: true }, 'At the bottom, an old one in colours the club has not worn for decades.'),
     C('Walk past', {}, 'The foam hand watches you go.')]),
  E('youth-tournament', 'Under-twelves need a referee', 'academy',
    'The academy\'s under-twelves have a tournament on the back pitch and their referee has not turned up. Twenty children look at you. One is holding the whistle out.',
    [['Routine', 'Fourteen-minute halves. Rolling subs. I have the rules.'], ['Rest', 'Twenty children. All at once. On my day off.']],
    [C('Referee it', { fitness: -5, upgrade: true }, 'You learn more about a back three from ten-year-olds than from a month of video.'),
     C('Find a parent to do it', { coins: 4 }, 'A grateful parent leaves a tin of biscuits and a few coins for the kit fund.')]),
  E('boot-deal', 'A boot company calls', null,
    'A boot company offers a crate of new boots for the squad, provided everyone wears them in the next match. They are bright green. Very bright green.',
    [['Shape', 'They clash with the kit. Visually, the numbers are wrong.'], ['Pace', 'They are light. They are so light.']],
    [C('Wear them', { coins: 15, fitness: -3 }, 'Blisters by the second spell, and a cheque by the end of the week.'),
     C('Wear your own boots', { fitness: 2 }, 'Broken in, comfortable, slightly ugly. Fine.')]),
  E('long-coach-ride', 'Six hours on the coach', null,
    'The coach to the next ground takes six hours. The wifi stops after twenty minutes. Someone has brought a card game with no instructions.',
    [['Rest', 'Six hours. I can do six hours. Wake me in six hours.'], ['Routine', 'We should do the tactics talk now. While they cannot leave.']],
    [C('Sleep the whole way', { fitness: 7 }, 'You wake up with a crease from the seat on your face and fresh legs.'),
     C('Tactics talk, aisle by aisle', { card: { kind: 'training-move', level: 'good' } }, 'By the services, the back row can draw the move from memory.')]),
  E('sprinkler', 'The sprinklers come on', 'groundsman',
    'Twenty minutes before kick-off the sprinklers come on, by themselves, across the whole pitch. The groundsman swears he did not touch the timer.',
    [['Pace', 'A wet pitch is a fast pitch. Yes.'], ['Rest', 'Thank you, sprinklers, for this cold, cold gift.']],
    [C('Play it quick', { card: { kind: 'first-time', level: 'good' } }, 'The ball skids and your passes zip. Everyone wants it to feet.'),
     C('Wait for it to drain', { fitness: 3, firstCover: 3 }, 'A slower start. Careful, organised, dry socks.')]),
  E('trophy-polish', 'The trophy has come back from the engraver', 'chairman',
    'The cup you won last time comes back from the engraver. Your club\'s name is on it, spelt with one letter wrong. The chairman wants it on display anyway.',
    [['Shape', 'One letter. It is the wrong letter. I will see it every day.'], ['Power', 'We won it. That is what it says.']],
    [C('Send it back', { coins: -6, upgrade: true }, 'The fixed one is perfect. The squad is weirdly motivated by a correct letter.'),
     C('Keep it as it is', { lore: 'The trophy with the misspelt name, which the supporters now spell that way on purpose.' }, 'The misspelling becomes a chant. Of course it does.')]),
  E('injury-scare', 'A bad tackle in training', 'physio',
    'A tackle in training goes wrong and two of your players are on the floor. They are fine. They are both fine. They are both looking at each other.',
    [['Rest', 'Stop training. Everyone. Go home.'], ['Fuel', 'Ice, water, food. In that order.']],
    [C('End training early', { fitness: 6 }, 'Everyone goes home early. The two players share a lift.'),
     C('Finish the session', { fitness: -4, card: { kind: 'last-ditch', level: 'good' } }, 'Tempers settle into something useful: a sharper back line.')]),
  E('press-conference', 'A press conference that goes long', 'federation official',
    'The pre-match press conference was supposed to take ten minutes. It is forty in. A journalist is asking about your system, the 1974 World Cup, and the price of a pie.',
    [['Shape', 'Tell them about the system. Use the diagram. Yes, that one.'], ['Pace', 'We could have played a whole match in this time.']],
    [C('Answer everything', { fitness: -3, coins: 10 }, 'The clip goes round. The club shop sells out of a scarf nobody remembers making.'),
     C('Walk out politely', { firstShot: 1 }, 'You say "thank you" and leave. Clear head for the match.')]),
  E('kit-man-superstition', 'The kit man has a system', 'kit man',
    'The kit man lays out every shirt in the same order he did the night of the last big win: left to right, numbers face down, socks rolled, not folded.',
    [['Routine', 'Rolled. Not folded. Finally, someone understands.'], ['Power', 'It is socks.']],
    [C('Let him do it his way', { firstCover: 4 }, 'Calm dressing room. Everything where it should be.'),
     C('Ask him to teach the youngsters', { fitness: -2, randomCard: 'good' }, 'Order spreads through the whole squad, one rolled sock at a time.')]),
  E('fan-letter', 'A letter in the post', 'supporters',
    'A handwritten letter from a supporter who has been to every home match for forty years. It is two pages, mostly about one goal in 1998 and how it was offside.',
    [['Pace', 'It was not offside. Level is onside.'], ['Shape', 'Two pages. Neat margins. I approve of the margins.']],
    [C('Write back', { lore: 'A letter about an offside goal in 1998, answered.' }, 'They frame your reply. You have now been asked about 1998 three more times.'),
     C('Invite them to the next match', { coins: -4, firstCover: 5 }, 'They sit behind the dugout and tell you where to stand all night. They are usually right.')]),
  E('foreign-tour', 'An invitation to a friendly abroad', 'chairman',
    'A club abroad invites you for a friendly with all costs paid. It is in the middle of the cup. The chairman has already said yes on the phone.',
    [['Rest', 'A flight. In the middle of the cup. Lovely.'], ['Fuel', 'Their food will be different. Pack ours.']],
    [C('Go', { coins: 20, fitness: -8 }, 'Good money, tired legs, and a squad that now knows how to say thank you in three languages.'),
     C('Send the reserves', { coins: 8 }, 'The reserves come back with a draw and a lot of photographs of an airport.')]),
  E('local-derby-noise', 'The neighbours are loud', 'supporters',
    'The ground next door is having a big night and you can hear every chant through the walls of your dressing room. Some of them are about you.',
    [['Power', 'Let them sing.'], ['Pace', 'Can we go out early? Can we go out now?']],
    [C('Close the windows', { firstCover: 3 }, 'Quiet and focus. The chants go on, faintly, like weather.'),
     C('Open them and listen', { firstShot: 3 }, 'Twenty players walk out with something to prove.')]),
  E('referee-assessor', 'The pitch inspection', 'federation official',
    'A federation official walks the pitch with a clipboard and a long stick, poking the turf in eleven places. He looks unhappy at place nine.',
    [['Routine', 'Place nine is where the sprinkler leaks. We have a form for it.'], ['Rest', 'He is poking the grass with a stick. I could do that job.']],
    [C('Show him the form', { coins: 6 }, 'He is delighted. A form! He signs it with a flourish and approves a small grant.'),
     C('Fix place nine yourself', { fitness: -3, card: { kind: 'hold-shape', level: 'good' } }, 'You re-turf it at dawn. The whole back line helps and talks shape the whole time.')]),
];

export const eventById = (id: string) => EVENTS.find((e) => e.id === id);
