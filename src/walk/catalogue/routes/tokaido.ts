import type { RouteDef } from '../types';

/**
 * The Tōkaidō, Edo to Kyoto: the shogunate's coastal highway and its 53 post stations, 126 ri 6 chō, about 495 km
 * from Nihonbashi to the Sanjō bridge. Station distances are the Edo-period official ones; the sea crossing from Miya
 * to Kuwana, made by boat, is walked here along the shore.
 */
const STATIONS: [string, number][] = [
  ['Shinagawa', 7.9], ['Kawasaki', 17.7], ['Kanagawa', 27.5], ['Hodogaya', 32.4], ['Totsuka', 41.2], ['Fujisawa', 49.1],
  ['Hiratsuka', 62.8], ['Ōiso', 65.8], ['Odawara', 81.5], ['Hakone', 98.1], ['Mishima', 112.9], ['Numazu', 118.8],
  ['Hara', 124.7], ['Yoshiwara', 136.5], ['Kambara', 147.6], ['Yui', 151.5], ['Okitsu', 160.7], ['Ejiri', 164.8],
  ['Fuchū', 175.4], ['Mariko', 181.1], ['Okabe', 188.9], ['Fujieda', 195.7], ['Shimada', 204.4], ['Kanaya', 208.4],
  ['Nissaka', 214.9], ['Kakegawa', 222.0], ['Fukuroi', 231.6], ['Mitsuke', 237.5], ['Hamamatsu', 254.0], ['Maisaka', 264.9],
  ['Arai', 270.8], ['Shirasuka', 277.3], ['Futagawa', 283.1], ['Yoshida', 289.2], ['Goyu', 299.5], ['Akasaka', 301.2],
  ['Fujikawa', 310.1], ['Okazaki', 316.7], ['Chiryū', 331.7], ['Narumi', 342.8], ['Miya', 349.3], ['Kuwana', 376.8],
  ['Yokkaichi', 389.5], ['Ishiyakushi', 400.3], ['Shōno', 403.0], ['Kameyama', 410.8], ['Seki', 416.7], ['Sakanoshita', 423.3],
  ['Tsuchiyama', 433.1], ['Minakuchi', 443.6], ['Ishibe', 457.4], ['Kusatsu', 469.2], ['Ōtsu', 483.6],
];
const KM = 495;

export const tokaido: RouteDef = {
  id: 'tokaido',
  name: 'The Tōkaidō',
  era: '1601–1868',
  hook: 'The shogun’s road, Edo to Kyoto, by its 53 post stations.',
  group: 'world',
  km: KM,
  record: 'place',
  region: 'japan',
  ink: '#e8a0a8',
  places: [
    { name: 'Nihonbashi', km: 0, at: 0, label: true },
    { name: 'Shinagawa', km: 8, at: 1 },
    { name: 'Kanagawa', km: 28, at: 2 },
    { name: 'Totsuka', km: 41, at: 3 },
    { name: 'Fujisawa', km: 49, at: 4 },
    { name: 'Odawara', km: 82, at: 5 },
    { name: 'Hakone', km: 98, at: 6, label: true },
    { name: 'Mishima', km: 113, at: 7 },
    { name: 'Yoshiwara', km: 137, at: 8 },
    { name: 'Yui', km: 152, at: 9 },
    { name: 'Fuchū', km: 175, at: 10 },
    { name: 'Shimada', km: 204, at: 11 },
    { name: 'Kakegawa', km: 222, at: 12 },
    { name: 'Hamamatsu', km: 254, at: 13, label: true },
    { name: 'Arai', km: 271, at: 14 },
    { name: 'Yoshida', km: 289, at: 15 },
    { name: 'Okazaki', km: 317, at: 16 },
    { name: 'Miya', km: 349, at: 17, label: true },
    { name: 'Kuwana', km: 377, at: 18 },
    { name: 'Yokkaichi', km: 390, at: 19 },
    { name: 'Kameyama', km: 411, at: 20 },
    { name: 'Seki', km: 417, at: 21 },
    { name: 'Minakuchi', km: 444, at: 22 },
    { name: 'Kusatsu', km: 469, at: 23 },
    { name: 'Ōtsu', km: 484, at: 24 },
    { name: 'Kyoto', km: KM, at: 25, label: true },
  ],
  signature: {
    title: 'The 53 stations',
    note: 'The post stations of the Tōkaidō, each with its inns, porters and horses, the ones Hiroshige painted. Each is a stamp.',
    mark: 'station',
    marks: STATIONS.map(([name, km], i) => ({ km, name: `${i + 1}. ${name}` })),
  },
  then: { who: 'An Edo-period traveller', totalDays: 14, places: [{ name: 'Odawara', theirDay: 2 }, { name: 'Mishima', theirDay: 3 }, { name: 'Miya', theirDay: 10 }, { name: 'Kyoto', theirDay: 14 }], source: 'Travellers on foot usually took about two weeks; the stops are a typical pace of about 35 km a day.' },
  pages: [
    {
      km: 0,
      title: 'Nihonbashi',
      line: 'From the bridge at Nihonbashi, the road west to Kyoto.',
      page: [
        'In 1601, the year after he won the battle of Sekigahara, Tokugawa Ieyasu ordered post stations set up along the coast road from his castle town of Edo to Kyoto, where the emperor lived.',
        'All distances in Japan were measured from the Nihonbashi bridge in Edo, today’s Tokyo. They still are.',
      ],
      deeper: {
        title: 'A road as a means of control',
        text: 'The Tōkaidō was the busiest of five official highways, and the shogunate used them to govern. From the 1630s the system of alternate attendance, sankin-kōtai, required most daimyō, the regional lords, to spend every other year in Edo, and to leave their wives and heirs there when they went home. Their processions, of hundreds or thousands of retainers, cost them a fortune on the road and in Edo, which kept them too poor to rebel. Checkpoints inspected travellers, who needed permits to pass. Bridges were often left unbuilt over big rivers, for defence. The same system that held the lords down also made the road a great market, and spread news, fashions and prints across the country.',
      },
    },
    {
      km: 28,
      title: 'Kanagawa',
      line: 'Past Kawasaki to Kanagawa, on the bay.',
      page: ['Kanagawa looked over the bay where, after 1859, foreign traders settled at the fishing village of Yokohama. In 1862, at Namamugi near here, a British merchant, Charles Richardson, was killed by the escort of a Satsuma lord for riding into the procession. Britain’s reprisal, the bombardment of Kagoshima, helped turn Satsuma towards modernising.'],
    },
    {
      km: 49,
      title: 'Yaji and Kita',
      line: 'Through Fujisawa, with the most famous travellers who never lived.',
      page: ['From 1802 Jippensha Ikku published Shank’s Mare, a comic novel of two Edo men, Yaji and Kita, who walk the Tōkaidō getting drunk, cheated and lost at every station. It was a bestseller for twenty years, and sent real readers out onto the road to follow them.'],
    },
    {
      km: 82,
      title: 'Odawara',
      line: 'Odawara, a castle town at the foot of the Hakone hills.',
      page: ['Odawara was the last station before the climb over the Hakone mountains, and most travellers from Edo spent their second night here.'],
    },
    {
      km: 98,
      title: 'The Hakone checkpoint',
      line: 'At Hakone, the checkpoint on the lake: guns in, women out.',
      page: [
        'From 1619 the shogunate kept a checkpoint at Hakone, beside Lake Ashi. Its guards watched above all for guns going into Edo and for women coming out of it, since the lords’ wives were held there as hostages.',
        'Women were searched by older women inspectors. Getting caught slipping round the checkpoint could mean death.',
      ],
    },
    {
      km: 137,
      title: 'Fuji on the left',
      line: 'Under Mount Fuji, on your right hand going west.',
      page: ['Between Hara and Yoshiwara the road bends so that Fuji, usually on the right, appears on the left. Travellers called the spot Hidari Fuji, left-hand Fuji. Hiroshige painted it.'],
    },
    {
      km: 152,
      title: 'Yui',
      line: 'At Yui, the Satta pass, between the cliffs and the sea.',
      page: ['West of Yui the road squeezes along cliffs above Suruga Bay at the Satta pass. In Hiroshige’s print, tiny travellers peer over the edge at the sea, with Fuji behind.'],
    },
    {
      km: 175,
      title: 'Sunpu',
      line: 'Fuchū, the castle town where Ieyasu retired.',
      page: ['Fuchū, now Shizuoka, was Sunpu, where Tokugawa Ieyasu lived in retirement after handing the title of shogun to his son in 1605. He went on ruling from here until his death in 1616.'],
    },
    {
      km: 204,
      title: 'The Ōi River',
      line: 'At Shimada, the river you could not bridge.',
      page: [
        'There was no bridge over the Ōi River, and no ferry. Travellers were carried across on the shoulders of porters, or on platforms carried by several of them, at a price set by the depth of the water that day.',
        'When the river was in flood, crossing was stopped, sometimes for weeks, and travellers waited at Shimada and Kanaya, spending money. A saying went: Hakone you can cross on horseback, but the Ōi you cannot cross at all.',
      ],
    },
    {
      km: 254,
      title: 'Hamamatsu',
      line: 'Hamamatsu, Ieyasu’s castle for seventeen years.',
      page: ['Tokugawa Ieyasu held Hamamatsu castle for seventeen years while he rose from a minor lord to the most powerful man in Japan. Its castle is called the castle of promotion for it.'],
    },
    {
      km: 271,
      title: 'Arai',
      line: 'By boat over the mouth of Lake Hamana to the Arai checkpoint.',
      page: ['An earthquake and tsunami in 1498 broke through the sandbar at Lake Hamana, and travellers crossed the gap by boat to Arai, where a second checkpoint stood. Its buildings, rebuilt in 1855, are the only Tōkaidō checkpoint to survive.'],
    },
    {
      km: 317,
      title: 'Okazaki',
      line: 'Okazaki, where Ieyasu was born.',
      page: ['Tokugawa Ieyasu was born in Okazaki castle in 1543, the son of a small lord caught between larger neighbours. As a child he was sent away as a hostage, the same practice his own government would later use on every lord in Japan.'],
    },
    {
      km: 349,
      title: 'Seven ri by sea',
      line: 'At Miya, the road goes to sea for seven ri.',
      page: ['From Miya, by the Atsuta shrine, the official road crossed Ise Bay by boat to Kuwana: the seven-ri ferry, about 27 km, three or four hours if the wind was right. Those who feared the sea took an inland road instead. You walk round by the shore.'],
    },
    {
      km: 377,
      title: 'Kuwana',
      line: 'Kuwana, landing place of the ferry, famous for grilled clams.',
      page: ['Kuwana’s landing was marked by a great torii, the gate of the road to Ise. The town was famous for clams grilled on the shore.'],
    },
    {
      km: 417,
      title: 'Seki',
      line: 'At Seki, the road to Ise branches south.',
      page: [
        'At Seki the road to the Ise shrines branched off. In some years millions of people made the pilgrimage to Ise, many without permission, servants and children slipping away from home.',
        'Seki’s old street of inns is one of the best preserved on the whole road.',
      ],
    },
    {
      km: 433,
      title: 'The Suzuka pass',
      line: 'Over the Suzuka pass, once haunted by bandits.',
      page: ['Between Sakanoshita and Tsuchiyama the road climbs the Suzuka mountains, the second great pass of the Tōkaidō after Hakone. In earlier centuries it was notorious for bandits.'],
    },
    {
      km: 469,
      title: 'Kusatsu',
      line: 'At Kusatsu, the mountain road from Edo joins.',
      page: ['At Kusatsu the Nakasendō, the inland highway from Edo through the mountains, joined the Tōkaidō for the last stretch to Kyoto. Many processions took the mountain road to avoid the rivers.'],
    },
    {
      km: 484,
      title: 'Ōtsu',
      line: 'Ōtsu, on the shore of Lake Biwa, the last station.',
      page: ['Ōtsu, on Lake Biwa, the largest lake in Japan, was the 53rd station. Its markets sold Ōtsu-e, cheap folk paintings that travellers took home as souvenirs.'],
    },
    {
      km: KM,
      title: 'The Sanjō bridge',
      line: 'Over the Sanjō bridge into Kyoto.',
      page: [
        'The road ended at the Sanjō Ōhashi, the great bridge over the Kamo River into Kyoto.',
        'In 1833 the publisher Hōeidō began issuing Hiroshige’s Fifty-three Stations of the Tōkaidō, 55 prints from Nihonbashi to Kyoto. The tradition is that he travelled the road in 1832 with an official party taking horses to the emperor; some scholars think he drew partly on earlier guidebooks. The prints sold in thousands and made him famous.',
      ],
      deeper: {
        title: 'The end of the road',
        text: 'In 1868 the Tokugawa shogunate fell, and the young Meiji emperor travelled the Tōkaidō the other way, to make Edo, renamed Tokyo, his capital. The post stations were abolished in 1872, and in 1889 a railway along the old road joined Tokyo and Kobe. In 1964 the first high-speed line in the world, the Tōkaidō Shinkansen, opened on the same corridor. A journey that took two weeks on foot now takes a little over two hours.',
      },
    },
  ],
  chronicle: [
    { when: '1601', place: 'Edo to Kyoto', text: 'Ieyasu sets up the post stations.' },
    { when: '1603', place: 'Edo', text: 'Ieyasu becomes shogun.' },
    { when: '1619', place: 'Hakone', text: 'The Hakone checkpoint opens.' },
    { when: '1635', place: 'Edo', text: 'Alternate attendance is made law for the lords.' },
    { when: '1802', place: 'Edo', text: 'Shank’s Mare begins.' },
    { when: '1833', place: 'Edo', text: 'Hiroshige’s Fifty-three Stations begin to appear.' },
    { when: '1868', place: 'Kyoto to Tokyo', text: 'The emperor moves to Tokyo.' },
    { when: '1964', place: 'Tokyo to Osaka', text: 'The Shinkansen opens.' },
  ],
  sources: [
    { title: 'Wikipedia: Tōkaidō (road)', url: 'https://en.wikipedia.org/wiki/T%C5%8Dkaid%C5%8D_(road)' },
    { title: 'Wikipedia (Japanese): 東海道五十三次, station distances', url: 'https://ja.wikipedia.org/wiki/%E6%9D%B1%E6%B5%B7%E9%81%93%E4%BA%94%E5%8D%81%E4%B8%89%E6%AC%A1' },
    { title: 'Wikipedia: The Fifty-three Stations of the Tōkaidō', url: 'https://en.wikipedia.org/wiki/The_Fifty-three_Stations_of_the_T%C5%8Dkaid%C5%8D' },
    { title: 'Wikipedia: Sankin-kōtai', url: 'https://en.wikipedia.org/wiki/Sankin-k%C5%8Dtai' },
    { title: 'Wikipedia: Namamugi Incident', url: 'https://en.wikipedia.org/wiki/Namamugi_Incident' },
  ],
  ready: true,
};
