import type { RouteDef } from '../types';

/**
 * Mansa Musa's road to Cairo, 1324: the ruler of Mali crosses the Sahara on his way to Mecca. Where Niani was, and
 * which road he took, are uncertain; the line follows one likely road, by Walata, Tuat and the Fezzan, about 5,500 km.
 * Told economics and culture first. The famous numbers are tradition, and the pages say so.
 */
const KM = 5500;

export const mansa: RouteDef = {
  id: 'mansa',
  name: 'Mansa Musa to Cairo',
  era: '1324',
  hook: 'The ruler of Mali crosses the Sahara with so much gold that Cairo talked about it for years.',
  group: 'world',
  km: KM,
  record: 'estimated',
  region: 'sahara',
  ink: '#d89a8a',
  places: [
    { name: 'Niani', km: 0, at: 0, label: true },
    { name: 'Walata', km: 712, at: 2, label: true },
    { name: 'Tuat', km: 2142, at: 4, label: true },
    { name: 'Fezzan', km: 3633, at: 6 },
    { name: 'Awjila', km: 4484, at: 8 },
    { name: 'Siwa', km: 4913, at: 9 },
    { name: 'Cairo', km: KM, at: 11, label: true },
  ],
  signature: {
    title: 'Wells and markets',
    note: 'A caravan lived from well to well and market to market. Each one on the road is a mark.',
    mark: 'stone',
    marks: [
      { km: 208, name: 'The Niger' },
      { km: 712, name: 'Walata' },
      { km: 1387, name: 'Wells of the open desert' },
      { km: 2142, name: 'The oases of Tuat' },
      { km: 2854, name: 'The Tassili wells' },
      { km: 3633, name: 'The Fezzan' },
      { km: 4484, name: 'Awjila' },
      { km: 4913, name: 'Siwa' },
      { km: KM, name: 'Cairo' },
    ],
  },
  pages: [
    {
      km: 0,
      title: 'Niani',
      line: 'From the court of Mali, a king sets out for Mecca.',
      page: [
        'In the early 14th century Mali was one of the largest states in the world, stretching from the Atlantic coast across the upper Niger. Its ruler, the mansa, held court at a capital the Arab writers call Niani, though historians still argue over where it was.',
        'In 1324 Mansa Musa, who had come to the throne about twelve years earlier, set out on the pilgrimage to Mecca, as a Muslim ruler should once in his life.',
      ],
      deeper: {
        title: 'Mali as a state',
        text: 'Mali was founded in the 13th century by Sundiata Keita, whose story is still told by griots, the hereditary singers and historians of the Mande peoples, as the Epic of Sundiata. It was not a single people but an empire of many, held together by tribute, trade, marriages and the mansa’s army, with provinces and governors. Its rulers were Muslim, and Islam was strong among traders and in the towns, while many of their subjects kept older beliefs. Most of what we know comes from three kinds of source: Arab writers who visited or questioned visitors, oral traditions like the griots’ epics, and archaeology, which is only beginning to find its towns.',
      },
    },
    {
      km: 208,
      title: 'The Niger',
      line: 'North to the Niger, the river that made Mali rich.',
      page: ['The Niger was Mali’s highway. Boats carried grain, cloth and gold down it to the trading towns on its great bend, Djenné, Timbuktu and Gao, where the river came closest to the desert.'],
    },
    {
      km: 450,
      title: 'Gold',
      line: 'The gold came from fields to the south and west.',
      page: [
        'Mali’s wealth was gold, washed and dug from fields at Bambuk and Bure near the upper Senegal and Niger rivers. In the Middle Ages West Africa was one of the main sources of gold for the Mediterranean world.',
        'The miners were not Mali’s subjects in any close sense. Arab writers say the mansa left them alone, because when earlier rulers tried to force them to convert, the gold stopped.',
      ],
    },
    {
      km: 712,
      title: 'Walata',
      line: 'Walata, where the caravans met the desert.',
      page: ['Walata was the northern gate of Mali, where caravans from the Sahara arrived and loads were moved from camels to donkeys and porters. Twenty-eight years later, the Moroccan traveller Ibn Battuta came this way and complained about the food, the heat and the officials.'],
    },
    {
      km: 1100,
      title: 'Salt for gold',
      line: 'Into the desert, on the salt road.',
      page: [
        'The trade that crossed this desert was, above all, gold going north and salt coming south. North of here lay the salt mines of Taghaza, where slabs were cut from the ground and, Ibn Battuta says, even the houses and the mosque were built of salt.',
        'In the forest country to the south salt was scarce and could sell for a high price. Camels made the whole system possible: they had become common in the Sahara only about a thousand years before.',
      ],
    },
    {
      km: 1700,
      title: 'The caravan',
      line: 'A caravan as big as a city, by the story.',
      page: ['Later writers tell of 60,000 people, thousands of slaves in silk, some carrying staffs of gold, and 80 or 100 camel-loads of gold. Nobody counted, and historians treat the numbers as tradition. The wealth was real.'],
    },
    {
      km: 2142,
      title: 'Tuat',
      line: 'The oases of Tuat, gardens watered from underground.',
      page: ['Tuat is a chain of oases in what is now Algeria, kept alive by foggaras, tunnels that carry groundwater for kilometres to the palm gardens. It was a crossroads of the desert trade, and its merchants had partners in Mali and in the Mediterranean ports.'],
    },
    {
      km: 2800,
      title: 'The deep desert',
      line: 'East across the deep desert, well to well.',
      page: ['Between the oases lay days without water. Caravans hired guides who knew the wells, and paid desert peoples, among them the Tuareg, for passage and protection. A missed well could kill a whole caravan.'],
    },
    {
      km: 3200,
      title: 'A travelling court',
      line: 'A pilgrimage that was also a court, a market and an embassy.',
      page: ['A royal pilgrimage was never only a journey of faith. With the mansa travelled his wives, officials, soldiers, servants and slaves, scholars and merchants with goods of their own to sell. It was a show of power to every ruler on the road, and a trade mission to the markets at the end of it.'],
    },
    {
      km: 3800,
      title: 'The Fezzan',
      line: 'Through the Fezzan, an old crossroads of the Sahara.',
      page: ['The Fezzan, in today’s Libya, had been a crossroads since the Garamantes, a people who built towns and irrigation here in Roman times. From here roads led north to Tripoli and east towards Egypt.'],
    },
    {
      km: 4484,
      title: 'Awjila',
      line: 'Awjila, on the road to Egypt.',
      page: ['Awjila was an oasis on the old road between the Fezzan and Egypt, known to Herodotus two thousand years earlier for its dates.'],
    },
    {
      km: 4913,
      title: 'Siwa',
      line: 'Siwa, the oasis of the oracle, and the edge of Egypt.',
      page: ['Siwa, near the Egyptian border, was home to an ancient oracle that Alexander the Great rode across the desert to consult in 331 BC. Its people speak a Berber language, a link to the peoples of the desert to the west.'],
    },
    {
      km: KM,
      title: 'Cairo',
      line: 'In Cairo, July 1324, gold spent until its price falls.',
      page: [
        'Mansa Musa reached Cairo in July 1324. He camped for three days by the pyramids, then stayed in Cairo about three months. He met the Mamluk sultan, al-Nasir Muhammad, and, by al-Umari’s account, at first refused to bow to the ground before him, then did so as a gesture to God.',
        'He and his people spent and gave away so much gold that its value in Cairo fell, and al-Umari, writing about twelve years later, says it had still not recovered. Some historians think the fall was within the normal ups and downs of Cairo’s gold price. On the way home from Mecca he had run out, and borrowed from Cairo’s merchants at high interest.',
      ],
      deeper: {
        title: 'How one journey put Mali on the map',
        text: 'Before 1324 Europeans knew vaguely that gold came from south of the Sahara. After it, the merchants of Cairo, Genoa and Venice knew a name. In 1375 the Catalan Atlas, made on Majorca, showed a crowned African king on a throne holding a golden orb, labelled as Musa of Mali, the richest king of all, for the gold of his country. Mansa Musa came home with scholars and the Granada poet Abu Ishaq al-Sahili, later remembered as his architect, and Timbuktu began to grow into a city of mosques and learning, though the famous Great Mosque there has been rebuilt many times. The fame had a cost: within two centuries Portuguese ships were sailing down the Atlantic coast to reach the gold directly.',
      },
    },
  ],
  chronicle: [
    { when: 'About 1235', place: 'Kirina', text: 'Sundiata Keita founds Mali, by tradition.' },
    { when: 'About 1312', place: 'Mali', text: 'Mansa Musa comes to the throne.' },
    { when: '1324', place: 'Niani', text: 'He sets out for Mecca.' },
    { when: 'July 1324', place: 'Cairo', text: 'He arrives and stays about three months.' },
    { when: 'About 1337', place: 'Mali', text: 'He dies, by most dates.' },
    { when: '1352–53', place: 'Walata and Mali', text: 'Ibn Battuta visits.' },
    { when: '1375', place: 'Majorca', text: 'The Catalan Atlas shows the king of Mali.' },
  ],
  sources: [
    { title: 'Wikipedia: Musa I of Mali', url: 'https://en.wikipedia.org/wiki/Musa_I_of_Mali' },
    { title: 'World History Encyclopedia: Mansa Musa I', url: 'https://www.worldhistory.org/Mansa_Musa_I/' },
    { title: 'Wikipedia: Mali Empire', url: 'https://en.wikipedia.org/wiki/Mali_Empire' },
    { title: 'Wikipedia: Trans-Saharan trade', url: 'https://en.wikipedia.org/wiki/Trans-Saharan_trade' },
    { title: 'Wikipedia: Catalan Atlas', url: 'https://en.wikipedia.org/wiki/Catalan_Atlas' },
    { title: 'N. Levtzion and J. F. P. Hopkins (eds), Corpus of Early Arabic Sources for West African History (1981)' },
  ],
  ready: true,
};
