import type { RouteDef } from '../types';

/**
 * Three cities of the Indus civilisation in Gujarat: Dholavira in the Rann of Kutch, Surkotada, and Lothal. There is
 * no record of any walk, only archaeology, and the pages say how much of it is inference.
 */
export const indus: RouteDef = {
  id: 'indus',
  name: 'The Indus cities',
  era: 'c. 2600–1900 BCE',
  hook: 'Planned cities with reservoirs, what may be a dockyard, and a script nobody has read.',
  group: 'india',
  km: 451,
  record: 'none',
  region: 'india',
  ink: '#d98c6c',
  places: [
    { name: 'Dholavira', km: 0, at: 0, label: true },
    { name: 'The causeway', km: 43, at: 1 },
    { name: 'Rapar', km: 69, at: 2 },
    { name: 'Surkotada', km: 94, at: 3, label: true },
    { name: 'Bhachau', km: 169, at: 4 },
    { name: 'Malia', km: 228, at: 5 },
    { name: 'Halvad', km: 280, at: 6 },
    { name: 'Dhrangadhra', km: 316, at: 7, label: true },
    { name: 'Limbdi', km: 386, at: 8 },
    { name: 'Bagodara', km: 434, at: 9 },
    { name: 'Lothal', km: 451, at: 10, label: true },
  ],
  signature: {
    title: 'Finds',
    note: 'Nine kinds of thing the cities left behind, from seals to weights. Each mark on the road adds one to your case; they are not placed where each was found.',
    mark: 'stone',
    marks: [
      { km: 1, name: 'The Dholavira signboard' },
      { km: 20, name: 'A reservoir cut into the rock' },
      { km: 60, name: 'A set of cubic weights' },
      { km: 94, name: 'A Surkotada pot' },
      { km: 160, name: 'A square seal' },
      { km: 230, name: 'A carnelian bead' },
      { km: 300, name: 'A shell bangle' },
      { km: 380, name: 'A copper ingot' },
      { km: 451, name: 'A Persian Gulf seal from Lothal' },
    ],
  },
  pages: [
    {
      km: 0,
      title: 'The city of reservoirs',
      line: 'Dholavira, on an island in the Rann, lived by the water it stored.',
      page: [
        'Dholavira stands on Khadir Bet, an island in the salt flats of the Great Rann of Kutch. It was built around 2650 BCE and lived, with breaks, for over a thousand years; some now date its beginnings earlier still.',
        'In a dry land it survived by saving rain: sixteen or more reservoirs, some cut into the rock, fed by channels from two seasonal streams. One stepped tank is about three times the size of the Great Bath at Mohenjo-daro.',
      ],
      deeper: {
        title: 'Who ruled?',
        text: 'Indus cities have walls, citadels, granaries, drains and standard weights, but no palace or royal tomb anyone has found, no statue of a king and no record of a war. That makes them unlike Egypt or Mesopotamia in the same centuries. Some archaeologists think power was shared among merchant families or councils; others think rulers existed but did not advertise themselves. The evidence fits several stories, which is why careful writers say “we don’t know”.',
      },
    },
    {
      km: 43,
      title: 'The signboard',
      line: 'Ten signs, each about 37 cm high, by the city gate.',
      page: [
        'In a room by Dholavira’s northern gate, archaeologists found ten large signs made of gypsum, each about 37 cm high, that once seem to have hung on a board about 3 m long.',
        'It may have named the city or its ruler. Nobody can read it.',
      ],
    },
    {
      km: 94,
      title: 'Surkotada',
      line: 'Surkotada, a small walled town on the edge of the Rann.',
      page: ['Surkotada was a small fortified settlement of the same civilisation. It is best known for bones some excavators identified as a horse’s, which would be unusual for the Indus; others identify them as wild asses, and the question is still argued.'],
    },
    {
      km: 140,
      title: 'The salt shore',
      line: 'Along the Rann’s edge, where the sea once reached further in.',
      page: ['Four thousand years ago the Rann was probably a shallow arm of the sea or a navigable lagoon, which may be how Dholavira’s goods reached the coast. Today it floods in the monsoon and dries to salt.'],
    },
    {
      km: 169,
      title: 'The script',
      line: 'Thousands of inscriptions, and nobody has read one.',
      page: [
        'About 4,000 inscribed objects survive, most of them small square seals with an animal and a few signs. Most inscriptions are only about five signs long.',
        'Without a bilingual text, like the Rosetta Stone, and with so little to go on, the script is still undeciphered.',
      ],
      deeper: {
        title: 'The politics of an unread script',
        text: 'Because nobody can read it, the script attracts claims. Some read it as an early Dravidian language, which would tie the civilisation to south India; others as an Indo-Aryan language, which would make it the ancestor of Vedic culture; a few scholars argue it was not a writing system for language at all. Each reading has been tied to modern arguments about who the first Indians were. Most specialists say only that it is undeciphered and that no claim so far has convinced the field.',
      },
    },
    {
      km: 228,
      title: 'The Little Rann',
      line: 'Past Malia, along the Little Rann, home of the wild ass.',
      page: ['The Little Rann to the east is the last home of the Indian wild ass, the khur. Its salt pans are still worked by hand by the Agariya families.'],
    },
    {
      km: 280,
      title: 'Weights and measures',
      line: 'From Kutch to the Indus, the same weights.',
      page: ['Indus cubic weights of chert follow the same system across hundreds of kilometres, from Kutch to Punjab. Dholavira alone has yielded nearly 1,000.'],
    },
    {
      km: 316,
      title: 'Trade with Mesopotamia',
      line: 'Beads and seals from here turned up in Mesopotamia.',
      page: ['Mesopotamian texts speak of ships from a land called Meluhha, most likely the Indus region, bringing carnelian, wood and other goods. Indus beads and seals have been found at Ur, Kish and Susa.'],
    },
    {
      km: 360,
      title: 'Why the cities emptied',
      line: 'Why the cities emptied is one of archaeology’s open questions.',
      page: [
        'After about 1900 BCE the great Indus cities shrank and were abandoned, and people moved into smaller villages.',
        'The likely causes are many and still argued: weaker monsoons and drought, rivers that changed course or dried up, floods, and the collapse of long-distance trade. The old idea of an invasion has little evidence behind it.',
      ],
    },
    {
      km: 410,
      title: 'The Bhal country',
      line: 'Into the flat Bhal country, towards the Gulf of Khambhat.',
      page: ['The land flattens towards the Gulf of Khambhat. Rivers that once reached the sea here have shifted their courses over the millennia.'],
    },
    {
      km: 451,
      title: 'The dockyard',
      line: 'Lothal, and its great brick basin: dock or reservoir?',
      page: [
        'Lothal, excavated between 1955 and 1960, was a small town of workshops, with a bead factory and a warehouse. Its great brick basin, about 215 m long, is read by the Archaeological Survey of India as one of the world’s earliest docks.',
        'Other archaeologists argue it was a water tank, its inlet too narrow for ships. Floods damaged the town again and again, and around 1900 BCE a great one wrecked it.',
      ],
    },
  ],
  chronicle: [
    { when: 'c. 2650 BCE', place: 'Dholavira', text: 'The city is built, by the excavators’ dates.' },
    { when: 'c. 2300 BCE', place: 'Lothal', text: 'The town is founded.' },
    { when: 'c. 1900 BCE', place: 'Lothal', text: 'A great flood wrecks the town.' },
    { when: '1955–1960', place: 'Lothal', text: 'Excavated by the Archaeological Survey of India.' },
    { when: '1967–68', place: 'Dholavira', text: 'Recorded by the Archaeological Survey; excavation begins in 1989–90.' },
    { when: '27 July 2021', place: 'Dholavira', text: 'Inscribed as a UNESCO World Heritage Site.' },
  ],
  sources: [
    { title: 'Wikipedia: Dholavira', url: 'https://en.wikipedia.org/wiki/Dholavira' },
    { title: 'Wikipedia: Lothal', url: 'https://en.wikipedia.org/wiki/Lothal' },
    { title: 'Wikipedia: Surkotada', url: 'https://en.wikipedia.org/wiki/Surkotada' },
    { title: 'Wikipedia: Indus script', url: 'https://en.wikipedia.org/wiki/Indus_script' },
    { title: 'Wikipedia: Indus Valley Civilisation', url: 'https://en.wikipedia.org/wiki/Indus_Valley_Civilisation' },
    { title: 'UNESCO: Dholavira, a Harappan city', url: 'https://whc.unesco.org/en/list/1645/' },
    { title: 'Wikipedia: Indian wild ass', url: 'https://en.wikipedia.org/wiki/Indian_wild_ass' },
  ],
  ready: true,
};
