import type { RouteDef } from '../types';

/**
 * A leg of the Silk Road, Samarkand to Kashgar: up the Zarafshan country, through the Fergana valley, over the Alai and
 * the Irkeshtam pass into the Tarim basin, about 1,100 km. No one traveller's day-by-day record; the towns are told
 * from the travellers and traders who passed them over two thousand years.
 */
export const silk: RouteDef = {
  id: 'silk',
  name: 'Samarkand to Kashgar',
  era: '2nd century BC–today',
  hook: 'Through the Fergana valley and over the mountains, on the road merchants ran for a thousand years.',
  group: 'world',
  km: 1100,
  record: 'place',
  region: 'fergana',
  ink: '#b8d0a0',
  places: [
    { name: 'Samarkand', km: 0, at: 0, label: true },
    { name: 'Jizzakh', km: 111, at: 1 },
    { name: 'Khujand', km: 297, at: 3, label: true },
    { name: 'Kokand', km: 437, at: 4 },
    { name: 'Margilan', km: 519, at: 5 },
    { name: 'Osh', km: 649, at: 7, label: true },
    { name: 'Gulcha', km: 721, at: 8 },
    { name: 'Sary-Tash', km: 804, at: 9 },
    { name: 'Irkeshtam', km: 877, at: 10 },
    { name: 'Ulugqat', km: 1018, at: 11 },
    { name: 'Kashgar', km: 1100, at: 12, label: true },
  ],
  signature: {
    title: 'Caravanserais',
    note: 'Caravans stopped a day’s march apart, at walled inns with a courtyard for the animals. Each town where a caravan would rest is a mark.',
    mark: 'house',
    marks: [
      { km: 111, name: 'Jizzakh' },
      { km: 297, name: 'Khujand' },
      { km: 437, name: 'Kokand' },
      { km: 519, name: 'Margilan' },
      { km: 649, name: 'Osh' },
      { km: 721, name: 'Gulcha' },
      { km: 804, name: 'Sary-Tash' },
      { km: 877, name: 'Irkeshtam' },
      { km: 1018, name: 'Ulugqat' },
      { km: 1100, name: 'Kashgar' },
    ],
  },
  pages: [
    {
      km: 0,
      title: 'Samarkand',
      line: 'Samarkand, the Sogdian city at the crossroads of Asia.',
      page: [
        'Samarkand is one of the oldest cities in Central Asia. Its old site, the hill of Afrasiyab, was the capital of Sogdiana when Alexander the Great took it in 329 BC.',
        'The domes you see are later. In the 1370s Timur, the conqueror the West calls Tamerlane, made Samarkand his capital and brought craftsmen from every city he took to build it.',
      ],
      deeper: {
        title: 'The Silk Road is a 19th-century name',
        text: 'Nobody who travelled these roads called them the Silk Road. The name, Seidenstraße, was coined by the German geographer Ferdinand von Richthofen in 1877. There was never one road, but a web of routes between China, India, Persia and the Mediterranean, used in short stages: very few people, or goods, went the whole way. Silk was only one of the goods, alongside horses, paper, glass, spices, slaves and silver. Ideas travelled too. Buddhism reached China along these roads, and Islam came later to Central Asia; papermaking spread west from China, probably through Samarkand.',
      },
    },
    {
      km: 60,
      title: 'The Sogdians',
      line: 'Out of Samarkand, on the road the Sogdians ran.',
      page: [
        'For centuries the people who really ran the trade on these roads were Sogdians, from Samarkand and the cities around it. They set up merchant communities all the way to China, and their language was the trade language of Central Asia.',
        'A bundle of their letters, written in the early 4th century, was found in a watchtower near Dunhuang, never delivered. One is from a woman abandoned by her husband in China, who says she would rather be married to a dog or a pig.',
      ],
    },
    {
      km: 111,
      title: 'Jizzakh',
      line: 'Jizzakh, and the Gate of Timur.',
      page: ['East of Samarkand the road went through a narrow gorge called the Gate of Timur, where conquerors carved their names on the rock. Beyond it lies the hungry steppe, a dry plain watered only in the Soviet era by canals for cotton.'],
    },
    {
      km: 200,
      title: 'The hungry steppe',
      line: 'Across the steppe towards the Syr Darya.',
      page: ['The Soviet cotton schemes along the Syr Darya and the Amu Darya took so much water that the Aral Sea, once the fourth-largest lake in the world, shrank to a fraction of its size from the 1960s.'],
    },
    {
      km: 297,
      title: 'Khujand',
      line: 'Khujand, Alexander’s furthest city.',
      page: ['On the Syr Darya, Alexander founded a city in 329 BC that he called Alexandria Eschate, Alexandria the Furthest. Khujand, in what is now Tajikistan, stands on or near it. It marked the furthest edge of the Greek world in Asia.'],
    },
    {
      km: 380,
      title: 'The Fergana valley',
      line: 'Into the Fergana valley, a garden ringed with mountains.',
      page: [
        'The Fergana valley is a fertile basin almost closed in by mountains, today divided between Uzbekistan, Kyrgyzstan and Tajikistan by borders drawn in the Soviet era, with enclaves of one inside another.',
        'Babur, who founded the Mughal empire in India, was born here in 1483 and spent his youth fighting for its towns. In his memoirs he wrote lovingly of its fruit, its melons above all.',
      ],
    },
    {
      km: 437,
      title: 'Kokand',
      line: 'Kokand, capital of the last khanate of Fergana.',
      page: ['From the 18th century Kokand was the capital of a khanate that ruled the valley and fought its neighbours. In 1876 the Russian empire annexed it, during its advance into Central Asia.'],
    },
    {
      km: 519,
      title: 'Margilan',
      line: 'Margilan, where silk is still woven by hand.',
      page: ['Margilan has made silk for centuries. Its weavers still make ikat, khan-atlas, by tying and dyeing the threads before they are woven, so the pattern blurs at its edges like a flame. The secret of silk had left China long before; by tradition it was smuggled out by a princess in her headdress.'],
    },
    {
      km: 590,
      title: 'Heavenly horses',
      line: 'The valley whose horses the Han emperor went to war for.',
      page: ['In about 104 BC the Han emperor of China sent armies thousands of kilometres west to take Fergana’s famous horses, said to sweat blood. The first expedition failed. The second, in 102 to 101 BC, besieged the capital and came home with a few thousand horses. It was a turning point in China’s reach into Central Asia.'],
    },
    {
      km: 649,
      title: 'Osh',
      line: 'Osh, under the rock of Sulayman-Too.',
      page: [
        'Osh is one of the oldest towns of the valley, under a rocky hill, Sulayman-Too, with caves, rock carvings and shrines used for thousands of years.',
        'Its people are Kyrgyz and Uzbek. In June 2010 violence between them killed hundreds, most of them Uzbeks, and drove tens of thousands from their homes.',
      ],
    },
    {
      km: 721,
      title: 'Up into the mountains',
      line: 'Through Gulcha, up into the mountains.',
      page: ['From Osh the road climbs south into the mountains through Gulcha, on a road built in Soviet times along the old caravan track to the Pamirs.'],
    },
    {
      km: 804,
      title: 'The Alai valley',
      line: 'At Sary-Tash, the Alai valley and the roof of the world.',
      page: ['Sary-Tash sits in the Alai valley at over 3,000 metres, with the wall of the Pamirs to the south. The Persian name for the Pamirs, Bam-i-Dunya, means the roof of the world. Caravans crossed this high grassland in summer; in winter it was closed by snow.'],
    },
    {
      km: 877,
      title: 'Irkeshtam',
      line: 'Over the Irkeshtam pass into China.',
      page: [
        'The Irkeshtam pass, at about 3,000 to 3,500 metres, was one of the main ways from Fergana to the Tarim basin. It is now a border crossing between Kyrgyzstan and China, often shut by snow.',
        'The Roman-era geographer Ptolemy described a Stone Tower where merchants from the west met those from China. Nobody knows where it was; this valley is one guess.',
      ],
    },
    {
      km: 950,
      title: 'Down to the desert',
      line: 'Down the Kizilsu valley towards the desert.',
      page: ['Beyond the pass the road drops through red, dry hills along the Kizilsu, the red river, towards the edge of the Taklamakan, one of the largest sand deserts in the world.'],
    },
    {
      km: 1018,
      title: 'Ulugqat',
      line: 'Ulugqat, and the oasis road.',
      page: ['Around the Taklamakan, the roads ran from oasis to oasis. Kashgar was where the northern and southern routes round the desert met, and where the roads over the mountains came down.'],
    },
    {
      km: 1100,
      title: 'Kashgar',
      line: 'Kashgar, its market, and its people.',
      page: [
        'Kashgar has been a market town for over two thousand years. The Buddhist pilgrim Xuanzang passed through it on his way home from India in 644. Its Sunday market drew traders from across Central Asia.',
        'In the 1890s Britain and Russia kept rival consuls here, watching each other across the Great Game. Its old town, of mud-brick houses, was largely demolished and rebuilt from 2009.',
      ],
      deeper: {
        title: 'Kashgar today',
        text: 'Kashgar is a city of the Uyghurs, a Turkic, mostly Muslim people, in China’s Xinjiang region. From about 2017 the Chinese government detained very large numbers of Uyghurs and other Muslims in camps; researchers’ estimates run to a million or more. China says the camps were vocational training centres to counter extremism after a series of violent attacks, and that their trainees have graduated. In 2022 the United Nations human rights office reported serious violations and said the detentions may amount to crimes against humanity; several governments call it genocide, a term China rejects. Visitors find a city under heavy surveillance, with much of its old way of life changed.',
      },
    },
  ],
  chronicle: [
    { when: '329 BC', place: 'Samarkand and Khujand', text: 'Alexander takes Sogdiana.' },
    { when: '102–101 BC', place: 'Fergana', text: 'The Han war for the heavenly horses.' },
    { when: 'Early 4th century', place: 'Near Dunhuang', text: 'The Sogdian letters are written.' },
    { when: '644', place: 'Kashgar', text: 'Xuanzang passes on his way home.' },
    { when: '1370s', place: 'Samarkand', text: 'Timur makes it his capital.' },
    { when: '1483', place: 'Andijan', text: 'Babur is born in the Fergana valley.' },
    { when: '1876', place: 'Kokand', text: 'Russia annexes the khanate.' },
    { when: '1877', place: 'Berlin', text: 'Richthofen names the Silk Road.' },
  ],
  sources: [
    { title: 'Wikipedia: Silk Road', url: 'https://en.wikipedia.org/wiki/Silk_Road' },
    { title: 'Wikipedia: Sogdia', url: 'https://en.wikipedia.org/wiki/Sogdia' },
    { title: 'Wikipedia: Sogdian Ancient Letters', url: 'https://en.wikipedia.org/wiki/Ancient_Letters' },
    { title: 'Wikipedia: War of the Heavenly Horses', url: 'https://en.wikipedia.org/wiki/War_of_the_Heavenly_Horses' },
    { title: 'UNESCO: Samarkand, crossroad of cultures', url: 'https://whc.unesco.org/en/list/603/' },
    { title: 'OHCHR: assessment of human rights concerns in Xinjiang (2022)', url: 'https://www.ohchr.org/en/documents/country-reports/ohchr-assessment-human-rights-concerns-xinjiang-uyghur-autonomous-region' },
    { title: 'Valerie Hansen, The Silk Road: A New History (2012)' },
  ],
  ready: true,
};
