import type { RouteDef } from '../types';

/** The Mughal road from Agra to Lahore, by its kos minars, its sarais and the battlefields beside it. */
const KM = 747;
/** A kos, as the minars were usually spaced: about 3.2 km. */
const KOS = Math.round(KM / 3.22);

export const kos: RouteDef = {
  id: 'kos',
  name: 'The kos minars',
  era: '1500s–1600s',
  hook: 'Agra to Lahore along the Mughal milestones that still stand in fields.',
  group: 'india',
  km: KM,
  record: 'none',
  region: 'india',
  ink: '#e9b08a',
  places: [
    { name: 'Agra', km: 0, at: 0, label: true },
    { name: 'Mathura', km: 54, at: 1 },
    { name: 'Kosi Kalan', km: 99, at: 2 },
    { name: 'Palwal', km: 144, at: 3 },
    { name: 'Faridabad', km: 178, at: 4 },
    { name: 'Delhi', km: 210, at: 5, label: true },
    { name: 'Sonipat', km: 257, at: 6 },
    { name: 'Panipat', km: 307, at: 7, label: true },
    { name: 'Karnal', km: 345, at: 8 },
    { name: 'Taraori', km: 360, at: 9 },
    { name: 'Thanesar', km: 383, at: 10 },
    { name: 'Shahabad', km: 408, at: 11 },
    { name: 'Ambala', km: 435, at: 12 },
    { name: 'Sirhind', km: 489, at: 13, label: true },
    { name: 'Doraha', km: 539, at: 14 },
    { name: 'Ludhiana', km: 555, at: 15 },
    { name: 'Phillaur', km: 572, at: 16 },
    { name: 'Nurmahal', km: 595, at: 17, label: true },
    { name: 'Sultanpur Lodhi', km: 637, at: 18 },
    { name: 'Goindwal', km: 657, at: 19 },
    { name: 'Sarai Amanat Khan', km: 698, at: 20 },
    { name: 'Lahore', km: KM, at: 21, label: true },
  ],
  signature: {
    title: 'Kos minars',
    note: 'A brick pillar marked every kos of the royal road. About 600 once stood across the empire and about 110 survive; you collect one for every kos you walk, standing or gone.',
    mark: 'minar',
    marks: Array.from({ length: KOS }, (_, i) => ({ km: Math.round((((i + 1) * KM) / KOS) * 10) / 10 })),
  },
  pages: [
    {
      km: 0,
      title: 'The emperor’s road',
      line: 'From Agra, the royal road north, marked every kos by a brick pillar.',
      page: [
        'The kos minars are solid brick pillars about 9 m high, plastered with lime, set one every kos along the empire’s main roads.',
        'Sher Shah Suri is credited with starting them in the 1540s. In 1575 Akbar ordered one at every kos from Agra to Ajmer, and his successors carried the line on towards Lahore.',
      ],
      deeper: {
        title: 'How long is a kos?',
        text: 'A kos was a measure of distance, but never a fixed one. Along these roads the minars stand roughly 3.2 km apart, a quarter of the older yojana, yet studies of different stretches have measured anything from about 3 km to over 4 km. Like the mile before it was standardised, it was as much a measure of a day’s walking as of ground.',
      },
    },
    {
      km: 54,
      title: 'Mathura',
      line: 'Past Mathura, where nine old minars were restored from 2018.',
      page: ['Around Mathura the minars stand among fields and houses, often unlabelled. Restoration of nine of them began here in 2018.'],
    },
    {
      km: 99,
      title: 'Into the plain',
      line: 'Up the Yamuna plain, a pillar every forty minutes of walking.',
      page: ['At an easy pace a kos is about 40 minutes’ walk. A traveller could count the minars to know how far was left to the next sarai.'],
    },
    {
      km: 144,
      title: 'Palwal',
      line: 'Palwal, one of the minars still standing by the road.',
      page: ['Haryana alone has 49, by the Archaeological Survey of India’s count. One stands at Palwal, on the edge of the highway that replaced the road it marked.'],
    },
    {
      km: 178,
      title: 'Faridabad',
      line: 'Faridabad, founded in 1607 to guard the Agra road.',
      page: ['Shaikh Farid, Jahangir’s treasurer, founded Faridabad in 1607 to guard the road between Agra and Delhi. Today it is an industrial city of well over a million.'],
    },
    {
      km: 210,
      title: 'Delhi',
      line: 'Delhi: a kos minar stands inside the zoo, beside Sher Shah’s fort.',
      page: ['In Delhi one of the minars stands in the grounds of the National Zoological Park, next to the Purana Qila, the fort Sher Shah Suri rebuilt in the 1540s.'],
    },
    {
      km: 257,
      title: 'The imperial post',
      line: 'North of Delhi, the road the emperor’s letters ran along.',
      page: ['Along this road ran the imperial post: relays of runners and riders, changed at regular stations, who carried the emperor’s letters far faster than any traveller could walk.'],
    },
    {
      km: 307,
      title: 'Panipat',
      line: 'Panipat, where three battles decided who ruled north India.',
      page: [
        'In 1526 Babur defeated Ibrahim Lodi here and founded the Mughal Empire. In 1556 Akbar’s army beat Hemu on the same plain.',
        'In 1761 an Afghan army under Ahmad Shah Durrani crushed the Marathas here, in one of the bloodiest battles of the century.',
      ],
      deeper: {
        title: 'Why battles kept coming here',
        text: 'The road was the reason. Armies coming from the northwest towards Delhi funnelled along the strip of dry, open land between the Yamuna and the desert, and Panipat sat on it, a day or two short of the capital. Whoever held this plain held the road to Delhi.',
      },
    },
    {
      km: 360,
      title: 'Taraori',
      line: 'Taraori, the old Tarain, where Prithviraj Chauhan won and lost.',
      page: ['At Tarain, now Taraori, Prithviraj Chauhan defeated Muhammad of Ghor in 1191, and lost to him the next year, opening the way to the Delhi Sultanate. In 1739, near Karnal, Nadir Shah of Persia routed the Mughal army.'],
    },
    {
      km: 383,
      title: 'Thanesar',
      line: 'Thanesar, once the capital of Harsha’s first kingdom.',
      page: ['Thanesar, beside Kurukshetra, was the seat of the king Harsha’s family before he moved his capital to Kanauj in the 7th century.'],
    },
    {
      km: 435,
      title: 'Ambala',
      line: 'Ambala, at the old edge of the Punjab.',
      page: ['Past Shahabad the road reaches Ambala. Beyond it lay the land of the five rivers, the Punjab, and the long stretch of road between its great towns.'],
    },
    {
      km: 489,
      title: 'Sirhind',
      line: 'Sirhind, a Mughal city remembered for 1705 and 1710.',
      page: [
        'Sirhind was a rich Mughal city on the road. In December 1705, or 1704 by some accounts, its governor, Wazir Khan, had the two youngest sons of Guru Gobind Singh put to death.',
        'In May 1710 Banda Singh Bahadur’s army defeated and killed Wazir Khan at Chappar Chiri, about 20 km away, then took and sacked the city. Accounts differ on how many of its people were killed: Mughal chroniclers describe a massacre, Sikh tradition a reckoning with Wazir Khan’s rule.',
      ],
    },
    {
      km: 539,
      title: 'Doraha',
      line: 'Doraha, and a sarai you can’t see from the road.',
      page: ['Sarais were walled inns a day’s march apart, with rooms around a courtyard, a well and a mosque. Doraha still has one, hidden behind the town.'],
      deeper: {
        title: 'The economy of the road',
        text: 'The road was how the empire held together. Orders, revenue and armies moved along it; so did merchants, pilgrims and the imperial post. Sarais were built by emperors, nobles and rich merchants, as charity and as investment: a town grew up around a good one. When the British rebuilt the road in the 19th century as the Grand Trunk Road, they kept the line the Mughals had marked.',
      },
    },
    {
      km: 595,
      title: 'Nurmahal',
      line: 'Nurmahal’s sarai, built by order of the empress Nur Jahan.',
      page: ['Across the Sutlej at Phillaur, the road came to Nurmahal, where a great sarai was built between 1618 and 1621 by order of Nur Jahan, Jahangir’s empress. Jahangir stayed in it on his journeys.'],
    },
    {
      km: 657,
      title: 'The Beas country',
      line: 'Past Sultanpur Lodhi and Goindwal, by the Beas.',
      page: ['The road crossed the Beas near Goindwal. Here, as in all the Punjab, the minars that survive stand in fields and village lanes; a recent survey mapped eight in Tarn Taran district alone.'],
    },
    {
      km: 698,
      title: 'Sarai Amanat Khan',
      line: 'A sarai built by the man who wrote the Taj Mahal’s inscriptions.',
      page: [
        'This sarai was built in 1640–41 by Amanat Khan, the calligrapher who designed the inscriptions on the Taj Mahal.',
        'It is said he built it in memory of his brother, but the inscription does not say so.',
      ],
    },
    {
      km: KM,
      title: 'Lahore',
      line: 'Lahore, across a border the road never knew.',
      page: [
        'The road reached Lahore, a Mughal capital in Akbar’s time. Jahangir is buried at Shahdara, across the Ravi.',
        'Since 1947 the old road crosses the border between India and Pakistan at Attari and Wagah, drawn at Partition through the middle of the Punjab.',
      ],
    },
  ],
  sources: [
    { title: 'Wikipedia: Kos Minar', url: 'https://en.wikipedia.org/wiki/Kos_Minar' },
    { title: 'Haryana Tourism: kos minars', url: 'https://haryanatourism.gov.in/places_of_interest/kos-minar/' },
    { title: 'Wikipedia: Serai Nurmahal', url: 'https://en.wikipedia.org/wiki/Serai_Nurmahal' },
    { title: 'Wikipedia: Sarai Amanat Khan', url: 'https://en.wikipedia.org/wiki/Sarai_Amanat_Khan' },
    { title: 'Wikipedia: Faridabad', url: 'https://en.wikipedia.org/wiki/Faridabad' },
    { title: 'Wikipedia: Battle of Chappar Chiri', url: 'https://en.wikipedia.org/wiki/Battle_of_Chappar_Chiri' },
    { title: 'AFCP 2023–25: Mughal monuments on the Grand Trunk Road', url: 'https://vmis.in/archive-categories/collection-by-category/1661?page=24' },
    { title: 'Outlook Traveller: seeking heritage on the Grand Trunk Road', url: 'https://www.outlooktraveller.com/explore/features/seeking-heritage-on-grand-trunk-road' },
  ],
  ready: true,
};
