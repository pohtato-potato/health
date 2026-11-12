// Owners and regions (spec §6): who owns each club in the pyramid and where its pride lives. These
// decide how a club leans at the congress (motions.ts `leans` and `regions`). Every club in
// league.json has a seat, Brabo included.
import type { ClubSeat, OwnerKindDef, RegionDef } from './types';

export const OWNER_KINDS: OwnerKindDef[] = [
  { id: 'fan-owned', name: 'Fan-owned', text: 'Members own the club, one vote each, and turn up to meetings with opinions.', cares: 'Cheap tickets, the old ground, and never being bought.' },
  { id: 'state-fund', name: 'A state fund', text: 'Owned by a fund that answers to a government far away. Patient, enormous, and careful about headlines.', cares: 'Prestige, and no rule that limits spending.' },
  { id: 'old-family', name: 'An old family', text: 'The same family for three generations, with a portrait of the founder in the boardroom.', cares: 'Tradition, and keeping the club in the family.' },
  { id: 'data-company', name: 'A data company', text: 'Run by a company that sells models of things. Every decision has a spreadsheet, and so does every spreadsheet.', cares: 'Efficiency, young players, and rules that reward cleverness.' },
  { id: 'billionaire', name: 'A billionaire', text: 'One very rich person who arrives by helicopter or boat and leaves by the other.', cares: 'Winning soon, and a bigger stage to win on.' },
  { id: 'investment-fund', name: 'An investment fund', text: 'Owned by a fund of funds. The chairman has never been to a match and has a lot of slides.', cares: 'Revenue, broadcast deals and a breakaway, if it pays.' },
  { id: 'works-team', name: 'A works team', text: 'Founded by a factory, a port, a railway or a trade, and still run by the people in it.', cares: 'Fair rules, working people\'s kick-off times, and solidarity money.' },
  { id: 'celebrity', name: 'A celebrity', text: 'Bought by famous people, filmed for a documentary, and promoted twice since.', cares: 'Attention, a good story, and anything that makes good television.' },
  { id: 'municipal', name: 'The city', text: 'Owned by the town hall. Board meetings are public and very long.', cares: 'Local players, local grounds and keeping things fair for small places.' },
  { id: 'old-self', name: 'Your own past', text: 'Nobody owns a memory. These clubs vote the way you would have, that month.', cares: 'Whatever you cared about then.' },
];

export const REGIONS: RegionDef[] = [
  { id: 'flanders', name: 'Flanders', country: 'BE', pride: 'Ports, pigeons and a stubborn belief that Antwerp and Ghent are the centre of football.' },
  { id: 'netherlands', name: 'The Netherlands', country: 'NL', pride: 'Total football, and land taken back from the sea.' },
  { id: 'london', name: 'London', country: 'EN', pride: 'Money, noise and six derbies a season.' },
  { id: 'north-england', name: 'The North of England', country: 'EN', pride: 'The game was built here, and they would like everyone to remember.' },
  { id: 'south-england', name: 'The South, the Midlands and the coast', country: 'EN', pride: 'Seaside grounds, small towns, night shifts and long journeys north.' },
  { id: 'wales', name: 'Wales', country: 'WA', pride: 'Small, loud and sure of itself.' },
  { id: 'castile', name: 'Castile and Madrid', country: 'ES', pride: 'The capital, the plain and the old kingdom; a little too sure of being the centre.' },
  { id: 'catalonia', name: 'Catalonia', country: 'ES', pride: 'More than a club: a language, a flag and an old argument with the capital.' },
  { id: 'basque', name: 'The Basque Country', country: 'ES', pride: 'Local players, local rules and a fierce independence.' },
  { id: 'andalusia', name: 'Andalusia', country: 'ES', pride: 'Joy, heat and taking their time.' },
  { id: 'spain-east', name: 'Valencia and Murcia', country: 'ES', pride: 'Oranges, tiles, and punching above their weight.' },
  { id: 'spain-north', name: 'Green Spain', country: 'ES', pride: 'Rain, caves and the end of the map.' },
  { id: 'canaries', name: 'The Canaries', country: 'ES', pride: 'An island that travels further than anyone for every away match.' },
  { id: 'bavaria', name: 'Bavaria', country: 'DE', pride: 'Mountains, money and winning, mostly in that order.' },
  { id: 'rhine-ruhr', name: 'The Rhine and the Ruhr', country: 'DE', pride: 'Coal, steel and members who vote.' },
  { id: 'germany-north', name: 'The North German coast', country: 'DE', pride: 'Harbours, wind and a dry sense of humour.' },
  { id: 'germany-east', name: 'Berlin and the East', country: 'DE', pride: 'Grounds built by hand and long memories.' },
  { id: 'germany-south-west', name: 'Swabia and the Saar', country: 'DE', pride: 'Engineering, thrift and border towns.' },
  { id: 'italy-north', name: 'Northern Italy', country: 'IT', pride: 'Industry, lakes, mountains and three of the oldest giants.' },
  { id: 'italy-centre-south', name: 'Rome and the South', country: 'IT', pride: 'Passion, volcanoes and a feeling that the north gets everything.' },
  { id: 'paris', name: 'Paris', country: 'FR', pride: 'The capital, with all that comes with it.' },
  { id: 'france-south', name: 'The French South', country: 'FR', pride: 'The sea, the wind and the loudest crowds in France.' },
  { id: 'france-north', name: 'The French North', country: 'FR', pride: 'Mining towns, post offices and cheese.' },
  { id: 'rhone-alps', name: 'Lyon and the Alps', country: 'FR', pride: 'Old champions and mountain roads.' },
  { id: 'alps-danube', name: 'The Alps and the Danube', country: 'AT', pride: 'Waltzes, lakes and six bridges.' },
  { id: 'nordic', name: 'The Nordic North', country: 'NO', pride: 'Saunas, midnight sun and absolutely no complaints about the cold.' },
  { id: 'portugal', name: 'Portugal', country: 'PT', pride: 'Longing, and very good wingers.' },
  { id: 'memory', name: 'Memory', country: 'BE', pride: 'Your own past months; they are from wherever you were.' },
];

const S = (owner: ClubSeat['owner'], region: ClubSeat['region']): ClubSeat => ({ owner, region });

export const SEATS: Record<string, ClubSeat> = {
  bra: S('fan-owned', 'flanders'),
  // the Crown League
  bay: S('fan-owned', 'bavaria'), mci: S('state-fund', 'north-england'), rma: S('fan-owned', 'castile'), bar: S('fan-owned', 'catalonia'),
  liv: S('investment-fund', 'north-england'), ars: S('billionaire', 'london'), atm: S('old-family', 'castile'), lev: S('works-team', 'rhine-ruhr'),
  int: S('investment-fund', 'italy-north'), nap: S('billionaire', 'italy-centre-south'), psg: S('state-fund', 'paris'),
  alt: S('old-family', 'spain-north'), cal: S('billionaire', 'france-south'), wol: S('old-family', 'bavaria'), ser: S('old-family', 'italy-north'),
  haf: S('works-team', 'germany-north'), dol: S('municipal', 'italy-north'), rib: S('old-family', 'spain-north'),
  // Division Two
  che: S('investment-fund', 'london'), tot: S('investment-fund', 'london'), bri: S('data-company', 'south-england'), ath: S('fan-owned', 'basque'),
  rso: S('fan-owned', 'basque'), bvb: S('fan-owned', 'rhine-ruhr'), vfb: S('fan-owned', 'germany-south-west'), ata: S('old-family', 'italy-north'),
  rom: S('billionaire', 'italy-centre-south'), om: S('billionaire', 'france-south'), asm: S('billionaire', 'france-south'), aja: S('fan-owned', 'netherlands'),
  kin: S('billionaire', 'south-england'), lum: S('works-team', 'rhone-alps'), zwe: S('municipal', 'alps-danube'), ves: S('old-family', 'italy-centre-south'),
  bia: S('municipal', 'france-south'), nor: S('fan-owned', 'germany-north'),
  // Division Three
  lee: S('investment-fund', 'north-england'), vil: S('old-family', 'spain-east'), bet: S('fan-owned', 'andalusia'), fcu: S('fan-owned', 'germany-east'),
  juv: S('old-family', 'italy-north'), bol: S('billionaire', 'italy-north'), ol: S('investment-fund', 'rhone-alps'), rcl: S('old-family', 'france-north'),
  far: S('municipal', 'spain-north'), ste: S('works-team', 'north-england'), pas: S('old-family', 'italy-north'), gre: S('municipal', 'germany-south-west'),
  cha: S('municipal', 'rhone-alps'), clb: S('data-company', 'south-england'), atl: S('municipal', 'canaries'), ost: S('fan-owned', 'flanders'),
  dan: S('data-company', 'alps-danube'),
  // Division Four
  hul: S('old-family', 'north-england'), sun: S('billionaire', 'north-england'), ray: S('old-family', 'castile'), stp: S('fan-owned', 'germany-north'),
  fca: S('investment-fund', 'bavaria'), com: S('billionaire', 'italy-north'), her: S('works-team', 'south-england'), mol: S('municipal', 'castile'),
  ber: S('works-team', 'rhine-ruhr'), cic: S('fan-owned', 'italy-north'), fro: S('works-team', 'france-north'), fog: S('fan-owned', 'south-england'),
  alf: S('fan-owned', 'portugal'), mos: S('works-team', 'netherlands'), ins: S('works-team', 'netherlands'), loy: S('fan-owned', 'nordic'),
  // Division Five
  wre: S('celebrity', 'wales'), s04: S('fan-owned', 'rhine-ruhr'), ase: S('investment-fund', 'rhone-alps'), zur: S('old-family', 'flanders'),
  owl: S('fan-owned', 'flanders'), pan: S('works-team', 'castile'), whi: S('works-team', 'south-england'), iso: S('municipal', 'italy-centre-south'),
  fac: S('works-team', 'france-north'), sch: S('data-company', 'germany-east'), dog: S('fan-owned', 'south-england'), car: S('old-family', 'andalusia'),
  vel: S('fan-owned', 'rhine-ruhr'), non: S('old-family', 'italy-centre-south'), gdn: S('works-team', 'paris'), wan: S('fan-owned', 'south-england'),
  // Division Six
  ant: S('municipal', 'flanders'), ker: S('works-team', 'flanders'), hng: S('fan-owned', 'north-england'), tre: S('data-company', 'north-england'),
  duv: S('fan-owned', 'flanders'), laa: S('municipal', 'netherlands'), des: S('works-team', 'spain-east'), she: S('works-team', 'wales'),
  lun: S('municipal', 'italy-north'), wal: S('old-family', 'alps-danube'), por: S('works-team', 'south-england'), del: S('fan-owned', 'netherlands'),
  mid: S('municipal', 'nordic'), clf: S('celebrity', 'south-england'), mur: S('data-company', 'spain-east'),
  // old selves
  os1: S('old-self', 'memory'), os2: S('old-self', 'memory'), os3: S('old-self', 'memory'), os4: S('old-self', 'memory'),
  os5: S('old-self', 'memory'), os6: S('old-self', 'memory'), os7: S('old-self', 'memory'),
};
