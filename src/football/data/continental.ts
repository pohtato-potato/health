// Clubs from outside the pyramid: the continental field (mostly real, some invented) and the
// Club World Cup's champions from other continents (invented). They never join the league.
import type { ClubDef } from './load';

type Row = [id: string, name: string, short: string, city: string, country: string, rating: number, style: string, colours: [string, string], ground: string, lore: string];
const make = (kind: 'real' | 'quirky') => ([id, name, short, city, country, rating, style, colours, ground, lore]: Row): ClubDef => ({
  id, name, short, nickname: name, city, country, founded: '', ground, colours, crest: '', tier: 1, rating, elite: false, style, kind, lore,
  sponsor: '', kitMaker: '', sponsorReal: false, kitReal: false, known: [], shrinks: {}, presses: {},
});

/** Real clubs from leagues outside the pyramid. */
export const CONT_REAL: ClubDef[] = ([
  ['ct-ben', 'Benfica', 'BEN', 'Lisbon', 'PT', 84, 'possession', ['#e30613', '#ffffff'], 'Estádio da Luz', 'An eagle flies a lap of the ground before kick-off. The football after is usually just as tidy.'],
  ['ct-por', 'Porto', 'POR', 'Porto', 'PT', 83, 'press', ['#00428c', '#ffffff'], 'Estádio do Dragão', 'Sells a star every summer and somehow wins anyway.'],
  ['ct-spo', 'Sporting CP', 'SCP', 'Lisbon', 'PT', 83, 'counter', ['#008057', '#ffffff'], 'Estádio José Alvalade', 'Green and white hoops, and an academy that never seems to run dry.'],
  ['ct-cel', 'Celtic', 'CEL', 'Glasgow', 'SC', 78, 'press', ['#018749', '#ffffff'], 'Celtic Park', 'Wins at home in a noise you can feel in your teeth.'],
  ['ct-ran', 'Rangers', 'RAN', 'Glasgow', 'SC', 76, 'direct', ['#1b458f', '#ffffff'], 'Ibrox', 'Big crowd, big men, and crosses that keep on coming.'],
  ['ct-psv', 'PSV', 'PSV', 'Eindhoven', 'NL', 82, 'possession', ['#ed1c24', '#ffffff'], 'Philips Stadion', 'Quick wingers and quicker passing. Hates a muddy pitch.'],
  ['ct-fey', 'Feyenoord', 'FEY', 'Rotterdam', 'NL', 80, 'press', ['#e30613', '#000000'], 'De Kuip', 'A bowl of a stadium that makes every chance sound like a goal.'],
  ['ct-gal', 'Galatasaray', 'GAL', 'Istanbul', 'TR', 81, 'direct', ['#a90432', '#fdb912'], 'RAMS Park', 'Welcome to hell, the banners used to say. They still do, a bit.'],
  ['ct-fen', 'Fenerbahçe', 'FEN', 'Istanbul', 'TR', 79, 'counter', ['#ffed00', '#00205b'], 'Şükrü Saracoğlu', 'Yellow and navy, and a crowd that sings the whole ninety.'],
  ['ct-bru', 'Club Brugge', 'BRU', 'Bruges', 'BE', 79, 'press', ['#0057a8', '#000000'], 'Jan Breydel', 'The neighbours from up the road. They know exactly who Brabo are.'],
  ['ct-sal', 'Salzburg', 'SAL', 'Salzburg', 'AT', 78, 'press', ['#e2001a', '#ffffff'], 'Wals-Siezenheim', 'Runs further than anyone. Ask them to stop and they run faster.'],
  ['ct-sha', 'Shakhtar Donetsk', 'SHA', 'Donetsk', 'UA', 76, 'possession', ['#f26522', '#000000'], 'A borrowed ground', 'Plays every home game far from home, and still plays beautifully.'],
  ['ct-din', 'Dinamo Zagreb', 'DIN', 'Zagreb', 'HR', 75, 'possession', ['#0057a8', '#ffffff'], 'Maksimir', 'Every few years a teenager here becomes world famous.'],
  ['ct-oly', 'Olympiacos', 'OLY', 'Piraeus', 'GR', 77, 'grit', ['#e30613', '#ffffff'], 'Karaiskakis', 'A harbour club with a harbour temper.'],
  ['ct-cop', 'Copenhagen', 'FCK', 'Copenhagen', 'DK', 75, 'counter', ['#ffffff', '#0a1f44'], 'Parken', 'Calm, organised, and annoyingly good on cold nights.'],
  ['ct-yb', 'Young Boys', 'YB', 'Bern', 'CH', 74, 'direct', ['#ffd700', '#000000'], 'Wankdorf', 'Plastic pitch, yellow shirts, no fear.'],
  ['ct-red', 'Red Star Belgrade', 'RSB', 'Belgrade', 'RS', 76, 'grit', ['#e30613', '#ffffff'], 'Rajko Mitić', 'Flares, drums, and once upon a time the whole continent.'],
  ['ct-sla', 'Slavia Prague', 'SLA', 'Prague', 'CZ', 77, 'press', ['#e30613', '#ffffff'], 'Fortuna Arena', 'Red and white halves and a star. Presses like it owes them money.'],
] as Row[]).map(make('real'));

/** Invented continental clubs, so a draw abroad can still surprise you. */
export const CONT_INVENTED: ClubDef[] = ([
  ['ct-fjo', 'Fjordvik IL', 'FJO', 'Fjordvik', 'NO', 75, 'counter', ['#2b6cb0', '#f3eee6'], 'Fjellbanen', 'Artificial grass under a mountain. Visitors slip; they don’t.'],
  ['ct-kam', 'FK Kamenný Most', 'KAM', 'Kamenný Most', 'CZ', 73, 'grit', ['#7b2d26', '#f3eee6'], 'U Mostu', 'Named after a stone bridge older than football. Plays like it.'],
  ['ct-gle', 'SC Gletscherbach', 'GLE', 'Gletscherbach', 'AT', 72, 'low-block', ['#9fd3e6', '#1c2b3a'], 'Eisstadion', 'Kick-off at altitude. Your lungs find out before your legs do.'],
  ['ct-ilh', 'CD Ilhas Atlânticas', 'ILH', 'Horta', 'PT', 71, 'direct', ['#1f8a70', '#f2f2f2'], 'Campo do Porto', 'Every away team arrives seasick. They count on it.'],
  ['ct-del', 'FC Delta Dunării', 'DEL', 'Tulcea', 'RO', 72, 'counter', ['#3d7a3a', '#f0c75e'], 'Stadionul Deltei', 'Pelicans circle the floodlights. Nobody knows why.'],
  ['ct-dzi', 'FK Dzintarkrasts', 'DZI', 'Jūrmala', 'LV', 70, 'low-block', ['#d9a441', '#22313f'], 'Kāpu Stadions', 'The amber coast. Ten men behind the ball and a tall one up front.'],
] as Row[]).map(make('quirky'));

/** The champions of the other continents: the Club World Cup field around Brabo. */
export const WORLD_CHAMPS: ClubDef[] = ([
  ['cw-pam', 'Club Atlético Pampa Alta', 'CAP', 'Pampa Alta', 'AR', 85, 'press', ['#5fa8d3', '#ffffff'], 'El Viento', 'South American champions. Kicks, tricks and a referee who has seen it all.'],
  ['cw-mar', 'Esporte Clube Maré Alta', 'ECM', 'Maré Alta', 'BR', 86, 'possession', ['#ffd23f', '#1b998b'], 'Arena da Maré', 'Plays football like the tide: you never see it coming in.'],
  ['cw-cer', 'Club Cerro Azul', 'CCA', 'Cerro Azul', 'MX', 80, 'direct', ['#1d3557', '#e63946'], 'Estadio del Cerro', 'North and Central American champions, from a ground 2,200 m up.'],
  ['cw-hbr', 'Harbour City FC', 'HCF', 'Harbour City', 'US', 77, 'counter', ['#2a9d8f', '#264653'], 'Pier Nine Park', 'Brand new, very rich and extremely keen to tell you about it.'],
  ['cw-atl', 'Atlas Rovers', 'ATL', 'Atlas', 'MA', 79, 'grit', ['#c1121f', '#2d6a4f'], 'Stade des Cimes', 'African champions. Their keeper has not conceded a penalty in two years.'],
  ['cw-kis', 'Kiso Valley FC', 'KVF', 'Kiso', 'JP', 80, 'possession', ['#3a5a40', '#dad7cd'], 'Valley Field', 'Asian champions. Polite, precise, and quietly ruthless.'],
  ['cw-sxu', 'Southern Cross United', 'SCU', 'Southern Cross', 'AU', 74, 'grit', ['#ffb703', '#023047'], 'The Paddock', 'Oceania champions. Flew 30 hours to get here and still want extra time.'],
] as Row[]).map(make('quirky'));

export const ABROAD: ClubDef[] = [...CONT_REAL, ...CONT_INVENTED, ...WORLD_CHAMPS];
