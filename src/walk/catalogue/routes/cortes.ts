import type { RouteDef } from '../types';

/**
 * Cortés's march to Tenochtitlan, August to November 1519: Cempoala on the Gulf coast, up through the Sierra and
 * Tlaxcala, between the volcanoes and down to the island city, about 450 km as historians reconstruct it. Told from
 * the Spanish letters and chronicles and the Nahua accounts, which often disagree.
 */
export const cortes: RouteDef = {
  id: 'cortes',
  name: 'Cortés to Tenochtitlan',
  era: '1519',
  hook: 'A few hundred Spaniards and thousands of Indigenous allies march on the greatest city in the Americas.',
  group: 'world',
  km: 450,
  record: 'dated',
  region: 'mexico',
  ink: '#c0b0f0',
  places: [
    { name: 'Cempoala', km: 0, at: 0, label: true },
    { name: 'Xalapa', km: 69, at: 1 },
    { name: 'Xico', km: 90, at: 2 },
    { name: 'Zautla', km: 186, at: 4 },
    { name: 'Iztacamaxtitlan', km: 212, at: 5 },
    { name: 'Tlaxcala', km: 283, at: 7, label: true },
    { name: 'Cholula', km: 321, at: 8, label: true },
    { name: 'Paso de Cortés', km: 368, at: 9 },
    { name: 'Amecameca', km: 384, at: 10 },
    { name: 'Iztapalapa', km: 436, at: 12 },
    { name: 'Tenochtitlan', km: 450, at: 13, label: true },
  ],
  signature: {
    title: 'Altepetl of the road',
    note: 'Mexico was a land of city-states, each an altepetl with its own ruler, gods and grudges. Each one the march passed is a seal.',
    mark: 'seal',
    marks: [
      { km: 1, name: 'Cempoala, Totonac' },
      { km: 69, name: 'Xalapa' },
      { km: 90, name: 'Xico' },
      { km: 186, name: 'Zautla' },
      { km: 212, name: 'Iztacamaxtitlan' },
      { km: 283, name: 'Tlaxcala, never conquered by the Mexica' },
      { km: 321, name: 'Cholula' },
      { km: 384, name: 'Amecameca' },
      { km: 436, name: 'Iztapalapa' },
      { km: 450, name: 'Tenochtitlan' },
    ],
  },
  then: { who: 'Cortés and his allies', totalDays: 85, places: [{ name: 'Tlaxcala', theirDay: 39 }, { name: 'Tenochtitlan', theirDay: 85 }], source: 'From Cortés’s letters and Bernal Díaz; dated at Tlaxcala and Tenochtitlan, the days between estimated.' },
  pages: [
    {
      km: 0,
      title: 'Cempoala',
      line: 'At Cempoala, the Totonacs see a chance to be free of the Mexica.',
      page: [
        'Hernán Cortés landed on the Gulf coast in April 1519 with about 500 soldiers, against the orders of the Spanish governor of Cuba. To stop anyone going back, he had most of his ships run aground and stripped.',
        'The Totonac city of Cempoala paid tribute to the Mexica, the people we often call the Aztecs, and resented it. Its ruler sided with the newcomers. In mid-August 1519 Cortés marched inland with a few hundred Spaniards and Totonac warriors and porters.',
      ],
      deeper: {
        title: 'A war among Mexico’s peoples',
        text: 'The Mexica of Tenochtitlan ruled an empire of tribute, not of direct government: conquered cities kept their own rulers but sent goods, labour and sometimes captives for sacrifice. Many hated it. The Spanish never had more than a few thousand soldiers in Mexico, while their Indigenous allies, Totonacs, Tlaxcalans and later others, numbered in the tens of thousands, and fought for their own reasons. Many historians now describe the conquest as, in large part, a war among Indigenous peoples in which the Spanish were one side, and the side that ended up ruling everyone, allies included.',
      },
    },
    {
      km: 45,
      title: 'Two kinds of record',
      line: 'Up from the coast, and two very different records of the march.',
      page: [
        'The Spanish side is told in Cortés’s own letters to the emperor Charles V, written to justify himself, and in the history of the soldier Bernal Díaz, written fifty years later.',
        'The Nahua side survives in accounts gathered in the 1550s, above all the Florentine Codex, set down in Nahuatl by Indigenous scholars working with the friar Bernardino de Sahagún, and in the Tlaxcalans’ painted Lienzo de Tlaxcala. Each was written for its own purposes, and they often disagree.',
      ],
    },
    {
      km: 69,
      title: 'Xalapa',
      line: 'Xalapa, in the cloud forest above the coast.',
      page: ['From the hot coastal plain the road climbed into cooler, wetter country. Xalapa and Xico were Totonac towns that welcomed the march, on Cempoala’s word.'],
    },
    {
      km: 128,
      title: 'The pass',
      line: 'Over the cold high pass onto the plateau.',
      page: ['Beyond Xico the march crossed a high, cold pass near the Cofre de Perote. Some of the Cuban porters, used to the tropics, died of the cold. Bernal Díaz remembered hail and freezing wind.'],
    },
    {
      km: 186,
      title: 'Zautla',
      line: 'At Zautla, a lord who serves Moctezuma.',
      page: ['At Zautla the ruler, a subject of the Mexica, received the Spanish but told them of the power and wealth of Moctezuma, the emperor of Tenochtitlan. Bernal Díaz says he described a city on a lake, reached by causeways.'],
    },
    {
      km: 240,
      title: 'Tlaxcala’s war',
      line: 'At the borders of Tlaxcala, three weeks of battle.',
      page: [
        'Tlaxcala was a confederation of four city-states that the Mexica had surrounded but never conquered. In early September 1519 its armies fought the newcomers in a series of battles.',
        'The Spanish survived, barely. Then Tlaxcala’s leaders, among them Xicotencatl the Elder, chose to ally with them against their old enemy. His son, the war leader Xicotencatl the Younger, opposed the alliance; the Spanish later hanged him.',
      ],
    },
    {
      km: 283,
      title: 'Tlaxcala',
      line: 'Into Tlaxcala, now an ally.',
      page: ['Cortés entered Tlaxcala on 23 September 1519. Thousands of Tlaxcalan warriors joined the march. They would fight beside the Spanish to the end, and after the conquest their city won privileges from the Spanish crown that few other Indigenous peoples kept.'],
    },
    {
      km: 300,
      title: 'Malintzin',
      line: 'The words of the march pass through one woman.',
      page: [
        'Every word Cortés spoke to a Nahua lord passed through Malintzin, a Nahua woman who had been sold into slavery among the Maya and given to the Spanish in March 1519 with nineteen other women.',
        'At first she put Nahuatl into Maya for a Spaniard who knew Maya; soon she learned Spanish. Nahua accounts and paintings show her at Cortés’s side at every meeting, often at the centre of the picture.',
      ],
      deeper: {
        title: 'How Malintzin has been judged',
        text: 'Spanish chroniclers called her Doña Marina and praised her loyalty. After Mexican independence she became a symbol of betrayal: malinchista still means someone who prefers foreign things to Mexican ones. In the 20th century she was recast again, as the mother of the mixed Mexican people, through her son Martín, and, by Chicana and Mexican feminist writers, as a woman with very few choices who survived by her intelligence. She left no words of her own. Everything we know of her is from people who had their own reasons to praise or blame her.',
      },
    },
    {
      km: 321,
      title: 'Cholula',
      line: 'At Cholula, a massacre in the temple courtyard.',
      page: [
        'Cholula was a holy city and a great market, with the largest pyramid in the Americas by volume. In October 1519 the Spanish and their Tlaxcalan allies, enemies of Cholula, killed thousands of its people in a few hours, many of them unarmed nobles gathered in a courtyard.',
        'Cortés said he had learned of a plot to ambush him, through Malintzin. The Nahua accounts tell it as an unprovoked slaughter. Historians still argue over whether the plot was real, invented, or a Tlaxcalan settling of scores.',
      ],
    },
    {
      km: 368,
      title: 'Between the volcanoes',
      line: 'Over the pass between Popocatépetl and Iztaccíhuatl.',
      page: ['The march crossed the high saddle between the two great volcanoes, at about 3,600 metres, the pass now called Paso de Cortés. Popocatépetl was erupting; Cortés sent men to climb towards the crater. From the pass they saw the Valley of Mexico and its lakes below.'],
    },
    {
      km: 410,
      title: 'The valley',
      line: 'Down into the Valley of Mexico, a valley of cities.',
      page: ['The valley floor was a chain of lakes ringed with towns, floating gardens called chinampas and causeways. Bernal Díaz wrote that the Spanish soldiers wondered whether what they saw was a dream, and compared it to the enchanted cities of the romances they had read.'],
    },
    {
      km: 450,
      title: 'Tenochtitlan',
      line: 'On the causeway, Moctezuma comes out to meet Cortés.',
      page: [
        'On 8 November 1519 the march crossed the southern causeway into Tenochtitlan, a city of perhaps 200,000 people, larger than any city in Spain. Moctezuma came out to meet Cortés and lodged him in his father’s palace.',
        'Within about a week the Spanish took Moctezuma prisoner. He died in June 1520, killed by the Spanish by the Nahua accounts, by his own people’s stones by the Spanish ones. The Spanish were driven out that month, and came back to besiege the city. Tenochtitlan fell on 13 August 1521.',
      ],
      deeper: {
        title: 'Why Tenochtitlan fell',
        text: 'No single cause explains it. Steel, horses and guns mattered in open battle, but the Spanish were few. Their allies gave them armies, food and a base. Smallpox, arriving in 1520 with a later Spanish expedition, killed huge numbers in the city, including the new emperor Cuitláhuac, in the middle of the war. Mexica fighting aimed, at least in part, to take captives rather than to kill, while the Spanish fought to destroy. The siege of 1521 cut the island off from water and food. In the century after, epidemics killed most of Mexico’s Indigenous people; estimates of the collapse range widely, but most are terrible.',
      },
    },
  ],
  chronicle: [
    { when: 'March 1519', place: 'Potonchán', text: 'Malintzin is given to the Spanish.' },
    { when: 'April 1519', place: 'The Gulf coast', text: 'Cortés lands.' },
    { when: 'Mid-August 1519', place: 'Cempoala', text: 'The march inland begins.' },
    { when: 'September 1519', place: 'Tlaxcala', text: 'Battles, then alliance; Cortés enters on 23 September.' },
    { when: 'October 1519', place: 'Cholula', text: 'The massacre.' },
    { when: '8 November 1519', place: 'Tenochtitlan', text: 'Cortés meets Moctezuma.' },
    { when: 'June 1520', place: 'Tenochtitlan', text: 'Moctezuma dies; the Spanish are driven out.' },
    { when: '13 August 1521', place: 'Tenochtitlan', text: 'The city falls after a siege.' },
  ],
  sources: [
    { title: 'Wikipedia: Spanish conquest of the Aztec Empire', url: 'https://en.wikipedia.org/wiki/Spanish_conquest_of_the_Aztec_Empire' },
    { title: 'Wikipedia: La Malinche', url: 'https://en.wikipedia.org/wiki/La_Malinche' },
    { title: 'Wikipedia: Cholula massacre', url: 'https://en.wikipedia.org/wiki/Cholula_massacre' },
    { title: 'Wikipedia: Florentine Codex', url: 'https://en.wikipedia.org/wiki/Florentine_Codex' },
    { title: 'Bernal Díaz del Castillo, The True History of the Conquest of New Spain' },
    { title: 'Matthew Restall, When Montezuma Met Cortés (2018)' },
  ],
  ready: true,
};
