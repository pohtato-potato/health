import type { RouteDef } from '../types';

/**
 * The Deccan sultanates, court by court: the five kingdoms that came out of the Bahmani sultanate, the field where
 * they joined forces once, the capital they destroyed, and Golconda. No walk was recorded; each city has its dates.
 */
export const deccan: RouteDef = {
  id: 'deccan',
  name: 'The Deccan sultanates',
  era: '1347–1687',
  hook: 'Five rival sultanates, one alliance, and the fall of Vijayanagara at Talikota.',
  group: 'india',
  km: 1307,
  record: 'none',
  region: 'india',
  ink: '#8fc7b8',
  places: [
    { name: 'Ahmadnagar', km: 0, at: 0, label: true },
    { name: 'Paranda', km: 142, at: 1 },
    { name: 'Bidar', km: 408, at: 2, label: true },
    { name: 'Gulbarga', km: 525, at: 3, label: true },
    { name: 'Bijapur', km: 683, at: 4, label: true },
    { name: 'Talikota', km: 775, at: 5 },
    { name: 'Rakkasagi', km: 809, at: 6, label: true },
    { name: 'Hampi', km: 937, at: 7, label: true },
    { name: 'Raichur', km: 1101, at: 8 },
    { name: 'Golconda', km: 1307, at: 9, label: true },
  ],
  signature: {
    title: 'The courts’ monuments',
    note: 'A fort, a college, a dome or a gate for every court on the road.',
    mark: 'shield',
    marks: [
      { km: 1, name: 'Ahmadnagar fort' },
      { km: 142, name: 'Paranda’s gun bastions' },
      { km: 408, name: 'Mahmud Gawan’s college, Bidar' },
      { km: 525, name: 'Gulbarga fort' },
      { km: 683, name: 'Gol Gumbaz, Bijapur' },
      { km: 809, name: 'The field of 1565' },
      { km: 937, name: 'The ruins of Vijayanagara' },
      { km: 1101, name: 'Raichur fort' },
      { km: 1307, name: 'Golconda' },
    ],
  },
  pages: [
    {
      km: 0,
      title: 'The Nizam Shahi north',
      line: 'Ahmadnagar, capital of the Nizam Shahi sultans.',
      page: [
        'Ahmad Nizam Shah, once a Bahmani governor, broke away in 1490 and founded Ahmadnagar a few years later. His dynasty ruled the northwest Deccan for over a century.',
        'In 1595–96 the regent Chand Bibi held the city against a Mughal siege. It fell to the Mughals in 1600.',
      ],
    },
    {
      km: 142,
      title: 'Paranda',
      line: 'Paranda, a fort of guns, where the Nizam Shahis held on.',
      page: ['Paranda’s fort, ringed by a moat and bastions built for cannon, became a refuge for the Nizam Shahi court after Ahmadnagar fell. The Mughals finished the kingdom only in 1636.'],
    },
    {
      km: 280,
      title: 'One kingdom into five',
      line: 'How one Bahmani sultanate became five rival courts.',
      page: [
        'The Bahmani sultanate was founded in 1347, when the Deccan broke away from the Delhi Sultanate. For about 150 years it ruled much of the Deccan plateau.',
        'As it weakened, its governors made themselves kings: Ahmadnagar, Bijapur and Berar from 1490, Bidar soon after, and Golconda in the 1510s.',
      ],
      deeper: {
        title: 'Newcomers and Deccanis',
        text: 'The Bahmani and later courts were split between two factions. The afaqis, newcomers from Persia, Central Asia and the Arab lands, brought trade, learning and often Shia Islam; the Deccanis were Muslims settled in the Deccan for generations, often allied with African-born nobles, the Habshis. Their rivalry ran through every court, sometimes as massacres. The sultanates themselves fought each other, made marriages and broke alliances, and joined Vijayanagara against each other as often as against it: a balance of power, long before the phrase was common in Europe.',
      },
    },
    {
      km: 408,
      title: 'Bidar',
      line: 'Bidar, the Bahmani capital, and its great college.',
      page: [
        'The Bahmanis moved their capital to Bidar in the 1420s. Their minister Mahmud Gawan built a great college here in 1472. In 1481 the sultan had him executed on a forged charge of treason, and the kingdom never recovered.',
        'Bidar’s own Barid Shahi kings ruled the remnant until Bijapur took it in 1619. The town gave its name to bidriware, silver inlaid into dark metal.',
      ],
    },
    {
      km: 525,
      title: 'Gulbarga',
      line: 'Gulbarga, the first Bahmani capital.',
      page: ['Gulbarga was the Bahmanis’ first capital, from 1347. Its fort holds a mosque with a roofed courtyard, unusual in India.'],
    },
    {
      km: 683,
      title: 'Bijapur',
      line: 'Bijapur, the Adil Shahi city, and its great dome.',
      page: [
        'Yusuf Adil Shah founded the Bijapur sultanate in 1490; where he came from, Georgia, Persia or Turkmen lands, the sources disagree.',
        'Bijapur’s Gol Gumbaz, the tomb of Muhammad Adil Shah, was finished in 1656. Its dome is among the largest in the world, and a whisper in its gallery carries right across it. Bijapur fell to Aurangzeb in 1686.',
      ],
    },
    {
      km: 775,
      title: 'The alliance',
      line: 'Talikota, where four sultans gathered against Vijayanagara.',
      page: ['In 1564 the rivals, for once, made common cause. Ahmadnagar, Bijapur, Golconda and Bidar joined their armies against Vijayanagara, whose regent, Rama Raya, had long played them off against each other.'],
    },
    {
      km: 809,
      title: 'The field of 1565',
      line: 'On 23 January 1565 the sultans meet Rama Raya’s army.',
      page: [
        'The battle named after Talikota was fought some way south of it, near the villages of Rakkasagi and Tangadagi, by the Krishna, on 23 January 1565.',
        'Rama Raya was captured and beheaded, and his army broke.',
      ],
      deeper: {
        title: 'Why Talikota was decisive',
        text: 'Vijayanagara had lost battles before and recovered. This time its capital lay open behind its army, and the victors took it apart. Historians give several reasons for the defeat. The sultans had better artillery and mounted archers, and Rama Raya was captured in the middle of the battle. By some accounts, two Muslim commanders in his own army changed sides. Older histories told it as a war of faiths; most historians now see politics first. Rama Raya had meddled in the sultanates’ wars for years, and Vijayanagara and the sultanates had fought side by side as often as against each other.',
      },
    },
    {
      km: 937,
      title: 'The ruined capital',
      line: 'Hampi, the Vijayanagara capital, sacked and left in ruins.',
      page: [
        'After the battle the city of Vijayanagara, at Hampi, was looted and burned for months, its palaces and many of its temples destroyed. It was never rebuilt.',
        'Its ruins, among boulders by the Tungabhadra, are a UNESCO World Heritage Site.',
      ],
    },
    {
      km: 1020,
      title: 'The doab',
      line: 'Into the land between the rivers, fought over for two centuries.',
      page: ['Between the Tungabhadra and the Krishna lies the Raichur doab, rich black-soil country that the Bahmanis, then Bijapur, and Vijayanagara fought over again and again for two hundred years.'],
    },
    {
      km: 1101,
      title: 'Raichur',
      line: 'Raichur, where Krishnadevaraya won the doab in 1520.',
      page: ['In 1520 Vijayanagara’s greatest king, Krishnadevaraya, defeated Bijapur at Raichur and took its fort. Forty-five years later the balance had turned the other way.'],
    },
    {
      km: 1200,
      title: 'Into Telangana',
      line: 'East into the Qutb Shahi kingdom of Golconda.',
      page: ['Quli Qutb Shah, a Bahmani governor of Turkmen origin, made Golconda his own kingdom in the 1510s. His dynasty ruled Telangana for nearly 170 years.'],
    },
    {
      km: 1307,
      title: 'The diamond fort',
      line: 'Golconda, the fort above the world’s diamond market.',
      page: [
        'Golconda’s fort stands on a granite hill. Diamonds from the Krishna valley mines were cut and traded here, and Dutch and English merchants came for them and for the cloth of the coast.',
        'In 1591 Muhammad Quli Qutb Shah founded Hyderabad nearby, with the Charminar at its heart. Aurangzeb took Golconda in 1687, and the last of the five sultanates was gone.',
      ],
    },
  ],
  chronicle: [
    { when: '1347', place: 'Gulbarga', text: 'The Bahmani sultanate is founded.' },
    { when: '1420s', place: 'Bidar', text: 'The capital moves to Bidar.' },
    { when: '1481', place: 'Bidar', text: 'Mahmud Gawan is executed.' },
    { when: '1490', place: 'Ahmadnagar, Bijapur, Berar', text: 'Three governors make themselves kings.' },
    { when: '1520', place: 'Raichur', text: 'Krishnadevaraya defeats Bijapur.' },
    { when: '23 January 1565', place: 'Rakkasagi', text: 'The sultans defeat Vijayanagara.' },
    { when: '1591', place: 'Hyderabad', text: 'The new city and the Charminar are founded.' },
    { when: '1600', place: 'Ahmadnagar', text: 'Falls to the Mughals.' },
    { when: '1656', place: 'Bijapur', text: 'The Gol Gumbaz is finished.' },
    { when: '1686', place: 'Bijapur', text: 'Falls to Aurangzeb.' },
    { when: '1687', place: 'Golconda', text: 'Falls to Aurangzeb.' },
  ],
  sources: [
    { title: 'Wikipedia: Deccan sultanates', url: 'https://en.wikipedia.org/wiki/Deccan_sultanates' },
    { title: 'Wikipedia: Battle of Talikota', url: 'https://en.wikipedia.org/wiki/Battle_of_Talikota' },
    { title: 'Wikipedia: Bahmani Sultanate', url: 'https://en.wikipedia.org/wiki/Bahmani_Sultanate' },
    { title: 'Wikipedia: Mahmud Gawan', url: 'https://en.wikipedia.org/wiki/Mahmud_Gawan' },
    { title: 'Wikipedia: Gol Gumbaz', url: 'https://en.wikipedia.org/wiki/Gol_Gumbaz' },
    { title: 'Wikipedia: Sultanate of Bijapur', url: 'https://en.wikipedia.org/wiki/Sultanate_of_Bijapur' },
    { title: 'Wikipedia: Gulbarga Fort', url: 'https://en.wikipedia.org/wiki/Gulbarga_Fort' },
    { title: 'Wikipedia: Battle of Raichur', url: 'https://en.wikipedia.org/wiki/Battle_of_Raichur' },
    { title: 'UNESCO: Group of Monuments at Hampi', url: 'https://whc.unesco.org/en/list/241/' },
  ],
  ready: true,
};
