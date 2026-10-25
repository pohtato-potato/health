import type { RouteDef } from '../types';

/**
 * The Long March, October 1934 to October 1935: the Central Red Army's retreat from Jiangxi to northern Shaanxi.
 * Officially 25,000 li, about 12,500 km; two British walkers who retraced it in 2002–03 put the First Front Army's
 * route at about 6,000 km, which is the length used here. Dated, but its famous episodes are contested, and the
 * pages give the official story and the doubts side by side.
 */
const KM = 6000;

export const longmarch: RouteDef = {
  id: 'longmarch',
  name: 'The Long March',
  era: '1934–1935',
  hook: 'A defeated army’s retreat across China, and how it became a nation’s founding story.',
  group: 'world',
  km: KM,
  record: 'dated',
  region: 'china',
  ink: '#e89aa0',
  places: [
    { name: 'Ruijin', km: 0, at: 0, label: true },
    { name: 'Yudu', km: 115, at: 1 },
    { name: 'The Xiang River', km: 960, at: 3 },
    { name: 'Liping', km: 1322, at: 4 },
    { name: 'The Wu River', km: 1707, at: 5 },
    { name: 'Zunyi', km: 1831, at: 6, label: true },
    { name: 'The Chishui', km: 2091, at: 7 },
    { name: 'Jiaopingdu', km: 3269, at: 11 },
    { name: 'Huili', km: 3363, at: 12 },
    { name: 'Mianning', km: 3753, at: 13 },
    { name: 'Anshunchang', km: 3901, at: 14 },
    { name: 'Luding', km: 4035, at: 15, label: true },
    { name: 'Jiajin Shan', km: 4243, at: 16 },
    { name: 'Maogong', km: 4310, at: 17 },
    { name: 'The grasslands', km: 4891, at: 19 },
    { name: 'Lazikou', km: 5076, at: 20 },
    { name: 'Liupan Shan', km: 5577, at: 22 },
    { name: 'Wuqi', km: KM, at: 23, label: true },
  ],
  signature: {
    title: 'Rivers and passes',
    note: 'The official story counts 18 mountain ranges and 24 rivers. These are the crossings it remembers best.',
    mark: 'stone',
    marks: [
      { km: 115, name: 'The Yudu River' },
      { km: 960, name: 'The Xiang River' },
      { km: 1707, name: 'The Wu River' },
      { km: 2091, name: 'The Chishui, four times' },
      { km: 3269, name: 'The Jinsha at Jiaopingdu' },
      { km: 3901, name: 'The Dadu at Anshunchang' },
      { km: 4035, name: 'Luding Bridge' },
      { km: 4243, name: 'Over Jiajin Shan' },
      { km: 4891, name: 'Through the grasslands' },
      { km: 5076, name: 'Lazikou Pass' },
      { km: 5577, name: 'Over Liupan Shan' },
      { km: KM, name: 'Wuqi' },
    ],
  },
  then: {
    who: 'The Central Red Army',
    totalDays: 369,
    places: [{ name: 'The Xiang River', theirDay: 47 }, { name: 'Zunyi', theirDay: 84 }, { name: 'Luding', theirDay: 226 }, { name: 'Wuqi', theirDay: 369 }],
    source: 'Day 1 is 16 October 1934, when the army began crossing the Yudu River. Dated from Party and Nationalist records.',
  },
  pages: [
    {
      km: 0,
      title: 'Ruijin',
      line: 'From Ruijin, the Red Army abandons its base and breaks out.',
      page: [
        'In the early 1930s the Chinese Communist Party ran a small state, the Jiangxi Soviet, from Ruijin in the hills of south-east China. The Nationalist government of Chiang Kai-shek attacked it again and again; by 1934 a ring of blockhouses was closing round it.',
        'In October 1934 about 86,000 soldiers and party workers of the Central Red Army broke out to the west. It was a retreat; where it would end, nobody knew.',
      ],
      deeper: {
        title: 'How a retreat became a founding story',
        text: 'The Long March was a defeat that the Party turned into its founding story. Mao Zedong called it a manifesto, a propaganda force and a seeding machine. The American journalist Edgar Snow, who met the survivors in 1936, made it famous abroad with Red Star Over China. In China it became the model of endurance and loyalty, told in schoolbooks, films, songs and a modern rocket named after it. Historians inside and outside China have since questioned parts of it: the distance, the battles, Mao’s role in the early decisions, and the brutality of the march’s own internal purges. The story and the march are both history: one of what happened, the other of how a state remembers.',
      },
    },
    {
      km: 115,
      title: 'Over the Yudu',
      line: 'Across the Yudu River by night, carrying everything.',
      page: ['From 16 October the army crossed the Yudu River on pontoon bridges at night. They carried printing presses, machinery, files and silver, on porters’ backs, in a column many kilometres long. Thousands of wounded and some leaders were left behind; many of those were later killed.'],
    },
    {
      km: 500,
      title: 'Through the blockhouses',
      line: 'West through the Nationalist lines.',
      page: ['The army broke through three lines of blockhouses with fewer losses than expected; some historians think a local Nationalist commander, wary of Chiang, let them pass.'],
    },
    {
      km: 960,
      title: 'The Xiang River',
      line: 'At the Xiang River, the worst battle of the march.',
      page: ['In late November and the first day of December 1934, the army crossed the Xiang River under attack from Nationalist and provincial forces. Losses were terrible. By most estimates the army that had left Jiangxi was cut by more than half, to perhaps 30,000 to 40,000.'],
    },
    {
      km: 1322,
      title: 'A change of direction',
      line: 'At Liping, the march turns away from the trap ahead.',
      page: ['The leaders had planned to join another Red Army in Hunan, where the Nationalists were waiting. At Liping in December, Mao argued for turning west into Guizhou, where the enemy was weaker, and won. The heavy baggage was dumped.'],
    },
    {
      km: 1831,
      title: 'Zunyi',
      line: 'At Zunyi, a meeting that changes the Party.',
      page: [
        'In January 1935 the army took the town of Zunyi. At a meeting there on 15 to 17 January, the leaders blamed the defeats on Bo Gu and the Comintern adviser Otto Braun, and Mao joined the inner leadership.',
        'Official history makes Zunyi the moment Mao took command. Historians generally see it as the start of his rise rather than its completion; his full control of the Party came years later.',
      ],
    },
    {
      km: 2091,
      title: 'Four crossings of the Chishui',
      line: 'Back and forth across the Chishui, four times.',
      page: ['Between January and March 1935 the army crossed and recrossed the Chishui River four times while Nationalist armies closed in. Official history calls it Mao’s masterpiece of manoeuvre. Some historians see a desperate army looking for a way out, and paying for it in men.'],
    },
    {
      km: 2600,
      title: 'South and west',
      line: 'A feint towards Guiyang and Kunming, and away to the west.',
      page: ['In April the army feinted towards the provincial capitals of Guiyang and Kunming, drawing the Nationalist forces after it, then swung west towards the upper Yangtze.'],
    },
    {
      km: 3269,
      title: 'The Golden Sands',
      line: 'Across the Jinsha, the upper Yangtze, in a handful of boats.',
      page: ['In early May 1935 the army crossed the Jinsha, the River of Golden Sands, at Jiaopingdu, using a few boats over about nine days. The Nationalists arrived after the boats had been burned.'],
    },
    {
      km: 3753,
      title: 'The Yi country',
      line: 'Through the Yi country, by an oath of brotherhood.',
      page: ['The way north ran through the mountains of the Yi people, who were hostile to Han Chinese. The Red Army commander Liu Bocheng swore an oath of brotherhood with a Yi chief, drinking chicken blood mixed with water, and the army was let through.'],
    },
    {
      km: 4035,
      title: 'Luding Bridge',
      line: 'Luding Bridge: thirteen iron chains over the Dadu.',
      page: [
        'The official story: on 29 May 1935, 22 volunteers crawled across the chains of the Luding suspension bridge, its planks removed, under machine-gun fire, and stormed the town on the far side. It is the most famous episode of the march.',
        'Some writers, among them the authors of a hostile 2005 biography of Mao, say there was little or no fighting there. Others reply with local witnesses and records of a real, if smaller, fight. What is certain is that the army crossed and escaped a trap.',
      ],
    },
    {
      km: 4243,
      title: 'The snow mountains',
      line: 'Over Jiajin Shan, in thin cotton clothes.',
      page: ['In June the army climbed the Great Snowy Mountains, crossing Jiajin Shan at over 4,000 metres in thin cotton clothes and straw sandals. Many, weak from hunger and altitude sickness, died on the passes.'],
    },
    {
      km: 4310,
      title: 'Two armies meet',
      line: 'At Maogong, two Red Armies meet, and quarrel.',
      page: ['In June the march met the much larger Fourth Front Army of Zhang Guotao. The two leaderships could not agree where to go, and by September they had split. Zhang went south and lost most of his army; his defeat let the Party remember Mao as the one who was right.'],
    },
    {
      km: 4891,
      title: 'The grasslands',
      line: 'Into the grasslands, where the ground itself kills.',
      page: ['In August the army crossed the marshy grasslands of north-west Sichuan, high, cold and wet, with almost nothing to eat. Men sank into the bog and drowned, or died of exposure and hunger. Many accounts call these days the worst of the march.'],
    },
    {
      km: 5076,
      title: 'Lazikou',
      line: 'Through the gorge at Lazikou Pass.',
      page: ['In September the army forced its way through Lazikou Pass, a narrow gorge held by Nationalist troops, and out of the mountains into Gansu.'],
    },
    {
      km: 5577,
      title: 'Liupan Shan',
      line: 'Over Liupan Shan, the last range.',
      page: ['In October they crossed Liupan Shan, the last mountain range before the loess hills of northern Shaanxi. Mao later wrote a poem about it.'],
    },
    {
      km: KM,
      title: 'Wuqi',
      line: 'At Wuqi, a year later, the end of the road.',
      page: [
        'On 19 October 1935, about a year after setting out, the column reached Wuqi in northern Shaanxi, where a small Communist base already existed. Of those who had left Jiangxi, perhaps 7,000 or 8,000 arrived; some had left the march, some joined along the way, and tens of thousands died.',
        'The Party said they had covered 25,000 li, about 12,500 km. In 2002–03 two British walkers, Ed Jocelyn and Andrew McEwen, retraced the route and put it at about 6,000 km.',
      ],
    },
  ],
  chronicle: [
    { when: '16 October 1934', place: 'Yudu', text: 'The army begins crossing the Yudu River.' },
    { when: 'November–December 1934', place: 'The Xiang River', text: 'The worst losses of the march.' },
    { when: '15–17 January 1935', place: 'Zunyi', text: 'The Zunyi meeting; Mao joins the leadership.' },
    { when: '29 May 1935', place: 'Luding', text: 'Luding Bridge is taken.' },
    { when: 'June 1935', place: 'Maogong', text: 'The two Red Armies meet.' },
    { when: 'August 1935', place: 'Sichuan', text: 'The grasslands.' },
    { when: '19 October 1935', place: 'Wuqi', text: 'The column reaches northern Shaanxi.' },
    { when: '1937', place: 'London', text: 'Edgar Snow’s Red Star Over China is published.' },
  ],
  sources: [
    { title: 'Wikipedia: Long March', url: 'https://en.wikipedia.org/wiki/Long_March' },
    { title: 'Wikipedia: Zunyi Conference', url: 'https://en.wikipedia.org/wiki/Zunyi_Conference' },
    { title: 'Wikipedia: Battle of Luding Bridge', url: 'https://en.wikipedia.org/wiki/Battle_of_Luding_Bridge' },
    { title: 'Ed Jocelyn and Andrew McEwen, The Long March (2006)' },
    { title: 'Sun Shuyun, The Long March (2006)' },
  ],
  ready: true,
};
