/**
 * Design prototype content for the Walk redesign: sample numbers and draft text, nothing read or saved.
 * Every factual line here is a draft; the build gives each one a source.
 */

export type RouteKind = 'india' | 'world' | 'books' | 'wild';
export type RecordKind = 'dated' | 'place' | 'story' | 'estimated' | 'none';

export interface ShelfRoute {
  id: string;
  name: string;
  kind: RouteKind;
  km: number;
  era: string;
  hook: string;
  record: RecordKind;
  /** Book and film routes: the work and its spoiler-free synopsis. */
  book?: { by: string; synopsis: string };
}

export const KIND_NAMES: Record<RouteKind, string> = {
  india: 'Indian history',
  world: 'World history',
  books: 'Books and films',
  wild: 'Strange and wild',
};

export const RECORD_NAMES: Record<RecordKind, string> = {
  dated: 'Dated day by day',
  place: 'Recorded place by place',
  story: 'Dated by the story',
  estimated: 'Estimated by historians',
  none: 'No record of the walk',
};

/** Up to 1,500 km is a challenge; longer routes are expeditions. */
export const EXPEDITION_KM = 1500;

/** The sample pace: about 10 km a day. */
export const KM_A_DAY = 10;

export const SHELF: ShelfRoute[] = [
  { id: 'dandi', name: 'The Dandi March', kind: 'india', km: 387, era: '1930', record: 'dated', hook: '78 marchers walk to the sea to break the salt law with a handful of salt.' },
  { id: 'meerut', name: 'The night ride from Meerut', kind: 'india', km: 70, era: '1857', record: 'dated', hook: 'Sepoys rise at Meerut and ride through the night to Delhi.' },
  { id: 'kos', name: 'The kos minars', kind: 'india', km: 730, era: '1500s–1600s', record: 'none', hook: 'Agra to Lahore along the Mughal milestones that still stand in fields.' },
  { id: 'deccan', name: 'The Deccan sultanates', kind: 'india', km: 1300, era: '1347–1687', record: 'none', hook: 'Five rival courts, one alliance, and the fall of Hampi at Talikota.' },
  { id: 'shivaji', name: "Shivaji's escape from Agra", kind: 'india', km: 1300, era: '1666', record: 'estimated', hook: 'Out of Aurangzeb\'s Agra, by the most-told account in a basket of sweets.' },
  { id: 'hadrian', name: "Hadrian's Wall", kind: 'world', km: 135, era: 'AD 122', record: 'none', hook: "Coast to coast along Rome's northern frontier." },
  { id: 'tokaido', name: 'The Tōkaidō', kind: 'world', km: 514, era: 'Edo Japan', record: 'dated', hook: "The shogun's road, Edo to Kyoto, by its 53 post stations." },
  { id: 'hannibal', name: 'Hannibal over the Alps', kind: 'world', km: 1500, era: '218 BC', record: 'estimated', hook: 'New Carthage to Italy, with war elephants over the snow.' },
  { id: 'sigeric', name: "Sigeric's road to Rome", kind: 'world', km: 1900, era: '990', record: 'dated', hook: 'Canterbury to Rome by the 79 stages an archbishop wrote down.' },
  { id: 'harold', name: 'Harold Fry\'s walk', kind: 'books', km: 1010, era: '2012', record: 'story', hook: 'Kingsbridge to Berwick-upon-Tweed, 627 miles in 87 days.', book: { by: 'Rachel Joyce', synopsis: 'A retired man walks out to post a letter to a dying friend at the other end of England, and keeps walking, sure that while he walks she will live.' } },
  { id: 'piku', name: 'Piku', kind: 'books', km: 1500, era: '2015 film', record: 'story', hook: 'Delhi to Kolkata by road, with a father, a daughter and a reluctant driver.', book: { by: 'Shoojit Sircar', synopsis: 'A short-tempered architect drives her hypochondriac father home to Kolkata, with a taxi owner who never wanted the job.' } },
  { id: 'frodo', name: 'Bag End to Mount Doom', kind: 'books', km: 2600, era: '1954', record: 'story', hook: 'Carry the ring to the one fire that can unmake it.', book: { by: 'J. R. R. Tolkien', synopsis: 'A hobbit inherits a ring that its maker wants back, and sets out on foot for the only place it can be destroyed.' } },
  { id: 'rann', name: 'The Rann of Kutch', kind: 'wild', km: 250, era: 'Today', record: 'none', hook: 'Across the white salt desert, wild asses and flamingos included.' },
  { id: 'xuanzang', name: "Xuanzang's road", kind: 'world', km: 10000, era: '629–645', record: 'place', hook: 'A scholar slips a travel ban and walks to India\'s greatest university, and home.' },
  { id: 'gt', name: 'The Grand Trunk Road', kind: 'india', km: 2500, era: '300 BC–today', record: 'none', hook: "Sher Shah's highway, and Kim's road, from Bengal to the Khyber." },
];

/** The two challenges being walked in the sample. */
export const WALKING = [
  { id: 'dandi', km: 118, day: 12, stretch: 'Kheda Country', line: 'Across the Mahi at Kareli. The marchers got here on their 8th day; you, on your 12th.', target: undefined as string | undefined },
  { id: 'harold', km: 210, day: 21, stretch: 'Into Somerset', line: 'Story paused · places only', target: 'aiming for 1\u00a0Feb' },
];

/** The expeditions: the first is Xuanzang's road, the second slot is empty in the sample. */
export const EXPEDITIONS = [{ id: 'xuanzang', km: 412, place: 'the Kingdom of Turfan', news: 'Reached the court of Turfan' }];

export const DANDI = {
  halts: [
    { n: 1, name: 'Aslali', done: true },
    { n: 2, name: 'Bareja and Navagam', done: true },
    { n: 3, name: 'Matar', done: true },
    { n: 4, name: 'Nadiad', done: true },
    { n: 5, name: 'Boriavi and Anand', done: true },
    { n: 6, name: 'Napa and Borsad', done: true },
    { n: 7, name: 'Kankapura, on the Mahi', done: true },
    { n: 8, name: 'Kareli', done: false, here: true },
    { n: 9, name: 'Gajera', done: false },
    { n: 10, name: 'Jambusar', done: false },
  ],
  page: [
    'Kankapura sits on the Mahi near its mouth, where the river is wide and tidal. The marchers crossed to the far bank and stopped at Kareli, on the edge of Broach district.',
    'By now the march was news across India and abroad. Reporters followed it on foot and by car, and each evening Gandhi spoke to the villages they reached.',
    'At many halts he asked village officials to give up their posts in protest. In Kheda and Broach, a number of them did.',
  ],
  deeper:
    'Why salt? The salt tax reached every household, rich or poor, and making salt from the sea needed nothing but a pan and the sun. That made it a law anyone could break, in public, without violence. The Congress leadership had doubted it would work; the march turned that doubt into the most watched protest of the movement. The go-deeper read covers the tax itself, the debate inside Congress, how the march was staged for the press, and what it did and did not win.',
};

export const CHAMBAL_FACTS = [
  'Most of the world\'s wild gharials, a slender-snouted crocodile, live along this river.',
  'Here the Chambal is the border: Rajasthan on the near bank, Madhya Pradesh on the far one.',
  'The National Chambal Sanctuary protects about 400 km of the river, across three states.',
  'Ganges river dolphins and red-crowned roof turtles live here too.',
];

export const XUANZANG = {
  stretch: 'The King of Turfan',
  line: 'Turfan\'s king wants the scholar to stay for good.',
  page: [
    'Qu Wentai, king of Turfan, kept Xuanzang at his court for weeks and begged him to stay as his teacher.',
    'When Xuanzang refused, and fasted until the king relented, Qu Wentai sent him on with letters of introduction to the rulers ahead, and men, horses and supplies for the road.',
  ],
};
