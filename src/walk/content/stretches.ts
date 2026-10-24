import type { Source, Stretch } from './types';

const W = (title: string, url: string): Source => ({ title, url });

/**
 * Chapter 1's named stretches, from Agra (where naming starts) to Bhopal. Written in our own words from the sources
 * listed; where sources disagree, the page says so. More batches follow down to Kanyakumari.
 */
export const STRETCHES: Stretch[] = [
  {
    id: 'bandit-country',
    name: 'Bandit Country',
    plain: 'Agra to Morena',
    fromKm: 230,
    toKm: 320,
    page: [
      'South of Agra the road leaves the flat Yamuna plain and drops into the Chambal ravines: a maze of gullies cut into soft alluvium by the river and the monsoon, ground that is hard to farm, hard to police and easy to hide in.',
      'For most of the twentieth century these ravines were known for their baaghi, men who took to the ravines after a land dispute, a feud or a police case, and lived by raids and ransom. Some were remembered locally as rebels against unfair landlords; to the villages they robbed they were simply dangerous. Both memories are true of different people at different times.',
      'Twice, large groups gave up their arms in public. In April 1972 dozens of dacoits, Mohar Singh and Madho Singh among them, surrendered in batches at the Gandhi Seva Ashram in Joura, near Morena, before Jayaprakash Narayan, who insisted the surrenders mean nothing without land and rehabilitation. Reports of the day give different counts.',
      'Before Morena the road crosses about thirty kilometres of Dholpur district, a corner of Rajasthan. Dholpur was a Jat-ruled state from 1805 until it joined the Indian Union in 1949, and its red sandstone built much of Delhi. Then comes the Chambal itself, the border with Madhya Pradesh, and the river sanctuary that keeps much of the world’s gharials.',
    ],
    deeper: {
      title: 'Why the ravines made outlaws',
      text: 'Many accounts tie Chambal dacoity to land more than to the land’s shape: small, contested holdings, caste hierarchies enforced by force, slow courts, and a border where three states’ police met and none fully reached. The ravines made hiding possible; disputes made men need to hide. Surrender campaigns (Vinoba Bhave’s, then Jayaprakash Narayan’s in 1972) offered amnesty from hanging and a path back, and Narayan himself warned that surrender alone would not end it without land and a living for the men who came back.',
    },
    sources: [
      W('Indian Liberals archive: press reports of the Chambal surrenders, April 1972', 'https://indianliberals.in/primary-works/6053-chambal-cheers-as-dacoits-surrender-15-04-1972/'),
      W('Wikipedia: Dholpur state', 'https://en.wikipedia.org/wiki/Dholpur_state'),
      W('Wikipedia: Chambal River', 'https://en.wikipedia.org/wiki/Chambal_River'),
      W('RajRAS: Dholpur district', 'https://rajras.in/ras/pre/rajasthan/districts/dholpur/'),
    ],
  },
  {
    id: 'scindia-road',
    name: 'The Scindias’ Road',
    plain: 'Morena to Shivpuri',
    fromKm: 320,
    toKm: 465,
    page: [
      'Gwalior’s fort stands on a long sandstone hill that has been fortified for well over a thousand years. Tomar kings built its painted palace in the late 1400s; Mughals used it as a state prison; the Marathas took it; the British held it more than once.',
      'The city below grew from an army camp. In 1810 Daulat Rao Scindia moved his capital from Ujjain to his camp near the fort, and the camp kept its name: Lashkar, from the Persian for an army. The Scindias, a Maratha family, ruled Gwalior state until 1948, and the family has stayed in Indian politics since independence.',
      'In June 1858, during the uprising of 1857, Rani Lakshmibai of Jhansi was killed fighting British troops near Gwalior. The Scindia ruler of the time stayed with the British; Indian nationalists later remembered both choices, often angrily.',
      'Gwalior is also a city of music: Tansen, the most famous singer of Akbar’s court, is buried here, and the city’s school of classical singing, the Gwalior gharana, is among the oldest. South of the city the road runs through scrub and low hills towards Shivpuri.',
    ],
    sources: [
      W('Wikipedia: Gwalior Fort', 'https://en.wikipedia.org/wiki/Gwalior_Fort'),
      W('Wikipedia: Gwalior State', 'https://en.wikipedia.org/wiki/Gwalior_State'),
      W('Wikipedia: House of Scindia', 'https://en.wikipedia.org/wiki/House_of_Scindia'),
      W('Wikipedia: Rani of Jhansi', 'https://en.wikipedia.org/wiki/Rani_of_Jhansi'),
    ],
  },
  {
    id: 'tigers-came-back',
    name: 'Where the Tigers Came Back',
    plain: 'Shivpuri to Guna',
    fromKm: 465,
    toKm: 565,
    page: [
      'Shivpuri was the Scindias’ summer capital, a town of lakes and forest where the family built marble memorials to its rulers. The forest around it is now Madhav National Park.',
      'Tigers had gone from Madhav. In 2023 a reintroduction began, and in March 2025 the park was declared India’s 58th tiger reserve. Nearby, cheetahs brought from Namibia to Kuno National Park wandered into Shivpuri’s villages in 2023 and had to be carried back; officials called it exploring.',
      'Not every conservation story here worked. The Karera sanctuary, set up in 1981 for the great Indian bustard, lost its birds by the 1990s, while the villagers inside it still could not sell their land. In 2010 the national wildlife board agreed to remove its protection: a sanctuary for a bird that had left.',
      'These are the arguments of Indian conservation in one district: who pays for wild land, who decides, and whether moving animals in is restoration or a show.',
    ],
    sources: [
      W('Britannica: Shivpuri', 'https://www.britannica.com/place/Shivpuri'),
      W('All India Radio: Madhav National Park declared a tiger reserve (March 2025)', 'https://www.newsonair.gov.in/mp-madhav-national-park-in-shivpuri-district-declared-as-new-tiger-reserve'),
      W('The Hitavada: Cheetah Oban captured from Shivpuri (April 2023)', 'https://www.thehitavada.com/Encyc/2023/4/8/Cheetah-Oban-captured-from-Shivpuri.html'),
      W('Governance Now: Karera sanctuary set to close', 'https://www.governancenow.com/gov-next/green-gov/karera-sanctuary-set-close-golden-bird-visits-no-more'),
    ],
  },
  {
    id: 'khichi-country',
    name: 'Khichi Country',
    plain: 'Guna to Biaora',
    fromKm: 565,
    toKm: 655,
    page: [
      'Around Guna the land was held for centuries by Khichi Chauhan Rajputs, the clan of Prithviraj Chauhan. They moved here from Gugor, which kept falling to neighbouring Hada rulers, and built a new seat at Raghogarh in the 1670s (sources give 1673 and 1677).',
      'This was border country between powers: Rajput houses, the Mughals, then the Marathas. In the late 1700s Mahadji Scindia’s raids broke Raghogarh’s fortunes, and in 1816 a Scindia army under its European general, Jean Baptiste, took and wrecked the fort at Bajrangarh outside Guna.',
      'The old families did not vanish with the princely states. Raghogarh’s ruling family entered electoral politics after independence and has held office in Madhya Pradesh for decades, one example of how Indian princely houses turned into political ones.',
    ],
    sources: [
      W('Wikipedia: Raghogarh State', 'https://en.wikipedia.org/wiki/Raghogarh_State'),
      W('Wikipedia: Bajrangarh Fort', 'https://en.wikipedia.org/wiki/Bajrangarh_Fort'),
      W('Wikipedia: Guna district', 'https://en.wikipedia.org/wiki/Guna_district'),
    ],
  },
  {
    id: 'into-malwa',
    name: 'Into Malwa',
    plain: 'Biaora to Bhopal',
    fromKm: 655,
    toKm: 770,
    page: [
      'Past Biaora the road climbs onto the Malwa plateau: black soil, wide fields of soybean and wheat, and low flat-topped hills. Malwa has its own food (dal bafla), its own dialect and a long history as a kingdom of its own.',
      'Its most remembered king is Raja Bhoj of the Paramara dynasty, who ruled in the early 1000s and is credited, by tradition, with the great lake at Bhopal. Tradition also makes him a scholar and builder; how much of that is history and how much later praise, historians still argue.',
      'Bhopal itself was founded as a state in the early 1700s by Dost Mohammad Khan, an Afghan soldier. From 1819 to 1926 it was ruled by four women in turn, the Begums of Bhopal, who governed through wars and the British Raj and put money into schools and, under the last of them, the education of girls.',
      'The road arrives at the city of lakes, which in 1984 also became the site of the world’s worst industrial disaster. The arrival tells that story plainly.',
    ],
    sources: [
      W('Wikipedia: Malwa', 'https://en.wikipedia.org/wiki/Malwa'),
      W('Wikipedia: Bhojtal', 'https://en.wikipedia.org/wiki/Bhojtal'),
      W('Outlook Traveller: Begums of Bhopal', 'https://www.outlookindia.com/traveller/destinations/begums-of-bhopal/'),
      W('SOAS archives: Sikandar Begum, Nawab of Bhopal', 'https://blogs.soas.ac.uk/archives/2020/03/08/sikandar_begum_nawab_of_bhopal/'),
      W('Wikipedia: Bhopal State', 'https://en.wikipedia.org/wiki/Bhopal_State'),
    ],
  },
];
