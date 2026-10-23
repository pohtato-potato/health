import { SHELF, type ShelfRoute } from './walkSample';

/**
 * Design prototype: what makes each route's page its own. Every route gets one page template; what changes is
 * this data. A route with no entry here still gets a full page from the defaults, so adding a route to the
 * catalogue never needs new screens. Draft text throughout: each line gets a source in the build.
 */

/** The small drawn mark a route's collection is made of. */
export type Mark = 'seal' | 'crystal' | 'minar' | 'station' | 'milecastle' | 'postcard' | 'elephant' | 'walker' | 'island' | 'moon' | 'shield' | 'house' | 'stage' | 'chapter' | 'stone';

/** A route's signature: the thing you collect as you walk it, unique to that road. */
export interface Signature {
  title: string;
  note: string;
  mark: Mark;
  count: number;
  /** Names for the marks you've reached, in order, where the record has them. */
  names?: string[];
}

export interface RouteContent {
  signature: Signature;
  /** Labelled stops on the route map: index into the route's line, and the name. */
  places?: [number, string][];
  /** Where an out-and-home route turns back (index into its line). */
  turn?: number;
  /** Then and you: when the original travellers reached the place you're at, and how long they took in all. */
  then?: { place: string; theirDay: number; yourDay: number; totalDays: number; who: string; source: string };
  /** The whole journey's length for the original travellers, in years (expeditions). */
  years?: { theirs: number; note: string };
  today?: { title: string; line: string; page: string[]; deeper?: { title: string; text: string } };
  chronicle?: { when: string; place: string; text: string }[];
  /** The named milestones in order, with how many are done. */
  milestones?: { names: string[]; done: number };
  /** An optional story layer (a novel or film told alongside the history). */
  layer?: string;
}

export const CONTENT: Record<string, Partial<RouteContent>> = {
  dandi: {
    signature: { title: 'Handfuls of salt', note: 'The march made 24 halts on its way to the sea. Each halt you reach adds a grain to your handful.', mark: 'crystal', count: 24 },
    places: [[0, 'Sabarmati'], [3, 'Nadiad'], [6, 'Kankapura'], [9, 'Broach'], [11, 'Surat'], [13, 'Dandi']],
    then: { place: 'Kareli', theirDay: 8, yourDay: 12, totalDays: 24, who: 'The marchers, 1930', source: "From the march's daily record." },
    today: {
      title: 'Kheda Country',
      line: 'The marchers cross the Mahi and stop at Kareli.',
      page: [
        'Kankapura sits on the Mahi near its mouth, where the river is wide and tidal. The marchers crossed to the far bank and stopped at Kareli, on the edge of Broach district.',
        'By now the march was news across India and abroad. Reporters followed it on foot and by car, and each evening Gandhi spoke to the villages they reached.',
      ],
      deeper: { title: 'Why salt', text: 'The salt tax reached every household, and making salt from the sea needed nothing but a pan and the sun: a law anyone could break, in public, without violence.' },
    },
    milestones: { names: ['Aslali', 'Bareja and Navagam', 'Matar', 'Nadiad', 'Boriavi and Anand', 'Napa and Borsad', 'Kankapura, on the Mahi', 'Kareli', 'Gajera', 'Jambusar'], done: 7 },
    chronicle: [
      { when: 'Day 11', place: 'Kankapura', text: 'At the Mahi the tide decides when the river can be crossed.' },
      { when: 'Day 8', place: 'Borsad', text: 'Village officials begin resigning their posts as the march passes.' },
      { when: 'Day 1', place: 'Sabarmati', text: '78 marchers leave the ashram before dawn, watched by a crowd.' },
    ],
  },
  harold: {
    signature: { title: 'Postcards home', note: 'Harold writes postcards as he goes. Each one you reach is a stop in the book, kept in your own words.', mark: 'postcard', count: 20 },
    places: [[0, 'Kingsbridge'], [3, 'Bath'], [6, 'Matlock'], [9, 'Berwick']],
    today: { title: 'Into Somerset', line: 'The road leaves Devon behind for the farms and levels of Somerset.', page: [] },
  },
  xuanzang: {
    signature: { title: 'Letters of introduction', note: 'The king of Turfan sent letters ahead to 24 kingdoms. Each one you reach seals its letter.', mark: 'seal', count: 24, names: ['Turfan'] },
    places: [[0, "Chang'an"], [2, 'Dunhuang'], [4, 'Turfan'], [8, 'Samarkand'], [9, 'Bamiyan'], [14, 'Nalanda'], [18, 'Khotan']],
    turn: 14,
    years: { theirs: 16, note: '629 to 645: 16 years, with years of study at Nalanda' },
    today: {
      title: 'The King of Turfan',
      line: "Turfan's king wants the scholar to stay for good.",
      page: [
        'Qu Wentai, king of Turfan, kept Xuanzang at his court for weeks and begged him to stay as his teacher.',
        'When Xuanzang refused, and fasted until the king relented, Qu Wentai sent him on with letters of introduction to the rulers ahead, and men, horses and supplies for the road.',
      ],
    },
    chronicle: [
      { when: 'Day 261', place: 'Turfan', text: 'The king of Turfan hears a scholar is crossing his desert and sends for him.' },
      { when: 'Day 238', place: 'The desert road', text: 'Five beacon towers, then sand. The water bag spills, and for days there is nothing to drink.' },
      { when: 'Day 196', place: 'The Jade Gate', text: 'The frontier is closed to travellers. He slips past the last watchtowers at night.' },
    ],
    layer: 'Journey to the West, the novel that turned this road into legend',
  },
  meerut: { signature: { title: 'The hours of the night', note: 'The sepoys rode from Meerut to Delhi through one night. Each hour of their ride is a mark.', mark: 'moon', count: 12 } },
  kos: { signature: { title: 'Kos minars', note: 'A brick pillar every kos. Surviving minars are stamped as you pass them; the rest are marked where they once stood.', mark: 'minar', count: 228 } },
  deccan: { signature: { title: 'Six courts', note: 'The five sultanates and Vijayanagara. Each capital you reach adds its court to your collection.', mark: 'shield', count: 6 } },
  shivaji: { signature: { title: 'Safe houses', note: 'The escape moved from shelter to shelter. Each one you reach is a door that opened.', mark: 'house', count: 12 } },
  hadrian: { signature: { title: 'Milecastles', note: 'A small fort every Roman mile, 80 in all, numbered from east to west as the Romans did.', mark: 'milecastle', count: 80 } },
  tokaido: { signature: { title: 'The 53 stations', note: 'The post stations of the Tōkaidō, the ones Hiroshige painted. Each is a stamp.', mark: 'station', count: 53 } },
  hannibal: { signature: { title: 'The elephants', note: 'Polybius gives Hannibal 37 war elephants at the start. Your marks follow what the record says became of them.', mark: 'elephant', count: 37 } },
  sigeric: { signature: { title: "Sigeric's 79 stages", note: "The archbishop's own list of stopping places, the oldest record of the road. Each stage is a stamp.", mark: 'stage', count: 79 } },
  frodo: { signature: { title: 'The walkers', note: 'Nine set out from Rivendell. The marks follow who walks with Frodo, stretch by stretch (story mode only).', mark: 'walker', count: 9 } },
  piku: { signature: { title: 'Stops on the road', note: 'The family\'s halts between Delhi and Kolkata, each with its argument.', mark: 'house', count: 8 } },
  rann: { signature: { title: 'Islands in the salt', note: 'The bets: rocky islands rising out of the white desert. Each one you reach is marked.', mark: 'island', count: 6 } },
  gt: { signature: { title: 'Capitals of the road', note: 'Every empire that held north India held this road. Each old capital you reach adds its seal.', mark: 'seal', count: 10 } },
};

/** The defaults: any route gets a signature from its kind of record, about one mark per 50 km. */
function defaultSignature(r: ShelfRoute): Signature {
  const count = Math.max(6, Math.round(r.km / 50));
  if (r.book) return { title: 'Chapters on the road', note: 'The story in chapters along the way, in our own words.', mark: 'chapter', count };
  if (r.record === 'dated' || r.record === 'place') return { title: 'The halts', note: 'Where the original travellers stopped, from the record.', mark: 'stage', count };
  return { title: 'Milestones', note: 'A stone for every stretch of the road.', mark: 'stone', count };
}

export function contentFor(id: string): RouteContent {
  const r = SHELF.find((x) => x.id === id)!;
  const c = CONTENT[id] ?? {};
  return { signature: c.signature ?? defaultSignature(r), ...c } as RouteContent;
}
