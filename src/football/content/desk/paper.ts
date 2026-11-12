// The column and fan mail (spec §3: "Pick a line; it runs in tomorrow's paper and nudges morale,
// or needles a rival"). Lines only, no points. Placeholders: `{club}` Brabo United, `{opp}` a rival
// or tonight's opponent, `{player}` one of ours, `{motion}` a congress motion's name.
import type { ColumnLine, FanLetter } from './types';

const C = (aim: ColumnLine['aim'], line: string, headline: string): ColumnLine => ({ aim, line, headline });

export const COLUMN_LINES: ColumnLine[] = [
  // morale: for the squad
  C('morale', 'This squad was built from people nobody else picked. Look at it now.', 'Manager: "Look at this squad now"'),
  C('morale', 'We rent our ground and we own our football. That\'s the right way round.', '{club} boss: "We own our football"'),
  C('morale', 'I watched {player} stay behind to practise first touches against a wall. That\'s the club.', 'Wall practice is "the club", says manager'),
  C('morale', 'Nobody in this dressing room is here by accident, except the dryer, which fell off a lorry.', 'Manager praises squad, and a dryer'),
  C('morale', 'We have nine bibs now. A year ago we had one. Progress is a pile of bibs.', '"Progress is a pile of bibs"'),
  C('morale', 'Some days you win, some days you learn, and on the best days Kemal does lentils.', 'Manager credits lentils'),
  // needle: for a rival
  C('needle', '{opp} have a lovely ground. It must be nice, having a ground.', 'Brabo boss on {opp}: "Must be nice"'),
  C('needle', 'I hear {opp} have a new tactics board. We\'ll send them our old one; it still works.', 'Manager offers {opp} a spare tactics board'),
  C('needle', '{opp} say we\'re a small club. We are. We\'re also a quick one.', '"Small, but quick": {club} reply to {opp}'),
  C('needle', 'Respect to {opp}. Their kit man told ours the secret to drying socks. It was wrong.', 'Sock-drying row reaches the back page'),
  C('needle', 'We\'ll treat {opp} like any other match. Except we\'ll want this one more.', 'Manager "wants this one more"'),
  C('needle', '{opp} are welcome at ours any time. Bring your own chairs; we\'re still renting ours.', 'Bring chairs, Brabo tell {opp}'),
  // fans: for the supporters
  C('fans', 'To everyone who walked to the ground in the rain on Tuesday: you were the twelfth player and the thirteenth umbrella.', 'Manager thanks the umbrella end'),
  C('fans', 'The fox under the away end has more season tickets than some clubs. Thank you all.', 'Fox and fans thanked in column'),
  C('fans', 'Write in. I read every letter. Gust reads the good ones on the radio at midnight.', 'Write in, says manager'),
  C('fans', 'You sang for ninety minutes in a ground that isn\'t ours. One day it will be. Keep singing.', '"One day it will be ours"'),
  C('fans', 'Whoever brought the drum: it was in time. Mostly. Thank you.', 'Drummer thanked, mostly'),
  C('fans', 'Our crowd fits in one stand. It is the loudest stand in Antwerp.', 'Loudest stand in Antwerp, claims manager'),
  // ambition: scrappy and ambitious
  C('ambition', 'We started with one ball and a borrowed bib. I\'d like a trophy cabinet. Then a trophy.', 'Manager wants a cabinet, then a trophy'),
  C('ambition', 'Every club at the top started somewhere small. Ours started on a Tuesday.', '"Ours started on a Tuesday"'),
  C('ambition', 'The Crown League is a long way up. Good. We like stairs.', 'Brabo "like stairs", says boss'),
  C('ambition', 'One day a kid from the car park will play in Europe in our shirt. Write it down.', 'Manager predicts a European night'),
  C('ambition', 'We\'re not here to make up the numbers. We\'re here to change them.', '"Here to change the numbers"'),
  C('ambition', 'Today Division Six. Tomorrow, if the scout is right, the world.', 'Division Six today, the world tomorrow'),
  // after-loss: calm and honest
  C('after-loss', 'We lost. It stung. Good: it means we cared. Back to it on Monday.', 'Manager: "It stung. Good."'),
  C('after-loss', '{opp} were better on the night. We\'ll be better on the next one.', '"Better on the next one"'),
  C('after-loss', 'Losses teach. This one taught a lot. I\'ve taken notes; Ines underlined them.', 'Loss "taught a lot", says manager'),
  C('after-loss', 'Nobody walks off our pitch with their head down. Walk off with it up and the plan in it.', 'Heads up, says manager after defeat'),
  C('after-loss', 'Not our night. The fox was disappointed too. We go again.', 'Fox and manager regroup'),
  C('after-loss', 'Football is long. A bad night is short. We\'ll see you Saturday.', '"Football is long"'),
  // congress: before a vote
  C('congress', 'We\'ll be voting for {motion}. Small clubs need rules too.', '{club} back {motion}'),
  C('congress', 'We vote against {motion}. Ask the clubs it\'s for who asked for it.', '{club} oppose {motion}'),
  C('congress', 'One vote isn\'t much. It\'s one more than we had last year.', 'Brabo to use their one vote "loudly"'),
  C('congress', 'The federation should hear from the clubs that rent. We\'ll be there, with headings.', 'Tenants will be heard, vows manager'),
  C('congress', 'We\'re open to talks with anyone before the congress. Bring biscuits.', 'Manager open to talks (and biscuits)'),
  C('congress', 'However it goes, we\'ll play by the rules we\'re given. And win anyway.', '"Play by the rules, win anyway"'),
];

export const FAN_MAIL: FanLetter[] = [
  { id: 'nine-year-old', from: 'Lotte, aged nine, Berchem', letter: 'Dear manager, can the fox be our mascot? It already comes to every match.', replies: ['The fox has been consulted and has said nothing, which we take as yes.', 'The fox is too busy, but you can be our mascot for one home match.', 'We\'ll put it to the congress.'] },
  { id: 'tram-driver', from: 'A tram driver, line 10', letter: 'I drive past your training ground every morning. Please tell the left-back I can see them practising and they\'re getting better.', replies: ['Told them. They waved at the next tram, so watch out.', 'Thank you. We\'ll practise facing the tram stop from now on.', 'You\'re on the guest list for the next home match.'] },
  { id: 'old-fan', from: 'A season-ticket holder since the first week', letter: 'Please don\'t become one of those clubs. Stay scrappy.', replies: ['Scrappy is in the constitution. Marcel has laminated it.', 'We\'ll grow, but we\'ll always rent our manners from nobody.', 'Promise. And if we ever forget, write again.'] },
  { id: 'chess-club', from: 'SC Schachmatt supporters\' club', letter: 'We admired your midfield on Saturday. We\'d like to discuss it over a game of chess.', replies: ['Gladly. Our midfield only knows how to move forward, like pawns.', 'Our analyst accepts; our manager is bad at chess.', 'Bring the board. Kemal will bring soup.'] },
  { id: 'baker', from: 'A baker from Los Panaderos', letter: 'Your club plays our sort of football: early, stubborn and warm. Here is a loaf.', replies: ['The loaf was excellent. The squad ate it before the warm-up.', 'Thank you. We\'ll send Kemal\'s lentil soup in return.', 'Early, stubborn, warm: we\'re putting it on the scarf.'] },
  { id: 'student', from: 'A student in Ghent', letter: 'I\'m writing my thesis on your club. Can I interview the kit man?', replies: ['Fons agreed, then asked for a copy of the thesis in pencil.', 'Yes, but budget three hours for the 1980s.', 'Come on a Thursday. The dryer is quieter.'] },
  { id: 'rival-fan', from: 'An Antigoon fan, anonymously', letter: 'You lot are fine, I suppose. Don\'t tell anyone I wrote.', replies: ['Your secret is safe. Mostly.', 'We\'ll keep this letter in Marcel\'s binder under "Classified".', 'See you at the derby. We\'ll pretend we never met.'] },
  { id: 'grandparent', from: 'A grandparent in Merksem', letter: 'My grandchild wants to join your academy. They\'re seven and only kick with their left foot.', replies: ['Nadia says left feet are the best kind. Wednesday trials, six o\'clock.', 'Bring them along. Nadia will find their right foot too.', 'Wrong shoes are fine. Nadia has spares.'] },
  { id: 'night-listener', from: 'A Radio Stroom listener', letter: 'Does your night watchman take requests? There are about forty of us.', replies: ['Gust takes requests, but plays the whole album. Be patient.', 'Forty-two, Gust says. Gust counts.', 'Yes. Write the album, not the song.'] },
  { id: 'groundhopper', from: 'A groundhopper from Hull', letter: 'Visited your ground. Lovely atmosphere. Why does the kit room have a sign saying "property of Zurenborg"?', replies: ['Long story. Short version: we\'re working on it.', 'Because it is. For now.', 'We\'re saving up. Buy a scarf; it helps.'] },
  { id: 'pigeon', from: 'Duivenbond Gent', letter: 'One of our pigeons landed on your crossbar during training. Please return it if it\'s still there.', replies: ['Returned. It watched a full session first and seemed impressed.', 'It left on its own. Very professional bird.', 'The fox had opinions. The pigeon left in a hurry.'] },
  { id: 'teacher', from: 'A maths teacher', letter: 'I use your league table to teach percentages. Can you please win more so the numbers are nicer?', replies: ['We\'ll try. Rounding is on our side.', 'Our coaching course would like your worksheets.', 'Fifty per cent of us agree. The other half are doing the maths.'] },
  { id: 'walker', from: 'Someone who walks the river every evening', letter: 'I see your floodlights come on from the quay. It looks like the club is thinking.', replies: ['Gust says that\'s exactly what it is.', 'It\'s thinking about promotion, mostly.', 'Wave next time. Gust will blink a tower back.'] },
  { id: 'kit-complaint', from: 'A supporter with opinions', letter: 'The third kit is a crime against orange.', replies: ['Fons agrees and has hidden it in the dryer.', 'We\'ll put it to the members. Bring a pencil.', 'Noted, and filed under "Misc." by the chairman.'] },
  { id: 'cook-fan', from: 'A dock worker who ate at Kemal\'s grill', letter: 'Tell Kemal the soup is still the best in Antwerp.', replies: ['Kemal read it twice and pinned it next to the egg apology.', 'Kemal says thank you and that the lemon wedge is non-negotiable.', 'Come to the canteen. Kemal insists.'] },
  { id: 'wrexham', from: 'A Wrexham fan', letter: 'Your club should get a documentary. Ours has three.', replies: ['We have a radio show with forty-two listeners. It\'s basically the same.', 'Our cameraman is the fox. It doesn\'t share footage.', 'We\'ll wait until we\'re in Division Five. Then watch out.'] },
];
