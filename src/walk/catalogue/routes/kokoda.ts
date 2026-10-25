import type { RouteDef } from '../types';

/**
 * The Kokoda Track, 1942: about 96 km over the Owen Stanley Range in Papua, walked north to south, Kokoda to Owers'
 * Corner, in the order of the Japanese advance and the Australian fighting withdrawal. Dated by its battles; the
 * Papuan carriers' part is told beside the soldiers'.
 */
export const kokoda: RouteDef = {
  id: 'kokoda',
  name: 'The Kokoda Track',
  era: '1942',
  hook: 'A jungle footpath over the mountains of Papua, where the Japanese advance on Port Moresby was stopped.',
  group: 'world',
  km: 96,
  record: 'dated',
  region: 'papua',
  ink: '#7fc4b8',
  places: [
    { name: 'Kokoda', km: 0, at: 0, label: true },
    { name: 'Deniki', km: 8, at: 1 },
    { name: 'Isurava', km: 16, at: 2, label: true },
    { name: 'Alola', km: 20, at: 3 },
    { name: 'Eora Creek', km: 25, at: 4 },
    { name: 'Templeton’s Crossing', km: 31, at: 5 },
    { name: 'Myola', km: 41, at: 6 },
    { name: 'Efogi', km: 54, at: 7 },
    { name: 'Brigade Hill', km: 60, at: 8, label: true },
    { name: 'Menari', km: 66, at: 9 },
    { name: 'Nauro', km: 72, at: 10 },
    { name: 'Ioribaiwa', km: 82, at: 11 },
    { name: 'Imita Ridge', km: 89, at: 12 },
    { name: 'Owers’ Corner', km: 96, at: 13, label: true },
  ],
  signature: {
    title: 'Villages of the track',
    note: 'The track is a chain of Koiari and Orokaiva villages, on land their clans still own. Each village you reach is a mark.',
    mark: 'house',
    marks: [
      { km: 8, name: 'Deniki' },
      { km: 16, name: 'Isurava' },
      { km: 20, name: 'Alola' },
      { km: 25, name: 'Eora Creek' },
      { km: 41, name: 'Myola' },
      { km: 54, name: 'Efogi' },
      { km: 66, name: 'Menari' },
      { km: 72, name: 'Nauro' },
      { km: 82, name: 'Ioribaiwa' },
      { km: 96, name: 'Owers’ Corner' },
    ],
  },
  pages: [
    {
      km: 0,
      title: 'Kokoda',
      line: 'At Kokoda, on the north side of the range, the fighting begins.',
      page: [
        'On 21 July 1942 Japanese troops landed near Buna and Gona on the north coast of Papua, then an Australian territory. Their aim was Port Moresby on the south coast, over the Owen Stanley Range, by the one footpath across it.',
        'At Kokoda, with its small airstrip, a few hundred young Australian militiamen of the 39th Battalion and men of the Papuan Infantry Battalion met them. On 29 July Kokoda fell, and the battalion’s commander, William Owen, was killed.',
      ],
      deeper: {
        title: 'The war in the Pacific, from Papua',
        text: 'For Australians, Kokoda became a founding story of the nation, like Gallipoli. For Papua it was a war between two outside powers fought on its land. Villages were bombed, gardens stripped by both armies, and thousands of men taken from their homes to carry. For the Japanese soldiers of the South Seas Force, most of whom had marched in from the coast with two weeks’ food, it ended in starvation and retreat. Their commander, Horii Tomitarō, drowned near the mouth of the Kumusi River in November. Each country tells the track as its own story; few books tell all three.',
      },
    },
    {
      km: 8,
      title: 'Deniki',
      line: 'Deniki, the first climb, and a counter-attack.',
      page: ['The Australians retook Kokoda briefly on 8 August and were driven out again. They fell back up the track to Deniki, on the first ridge of the range.'],
    },
    {
      km: 16,
      title: 'Isurava',
      line: 'At Isurava, outnumbered, they hold for five days.',
      page: [
        'From 26 to 31 August the 39th, joined by regular battalions of the 21st Brigade, held Isurava against a much larger Japanese force.',
        'On 29 August Private Bruce Kingsbury charged a Japanese position firing a Bren gun from the hip and broke the attack, before he was shot dead. He was awarded the Victoria Cross, the first won on Australian territory.',
      ],
    },
    {
      km: 25,
      title: 'Eora Creek',
      line: 'Down to Eora Creek, in mud and rain.',
      page: ['The track drops steeply to Eora Creek and climbs again, mud underfoot in almost constant rain. In late October, on the advance back north, the Australians fought for a week to take the Japanese positions on the ridges here.'],
    },
    {
      km: 31,
      title: 'The gap',
      line: 'Over the top of the range, near the Kokoda Gap.',
      page: ['Near Templeton’s Crossing the track reaches its highest ground, over 2,000 metres. In 1942 newspapers spoke of the Kokoda Gap as a narrow pass a few men could hold; it is in fact a broad dip in the range, kilometres wide.'],
    },
    {
      km: 41,
      title: 'The carriers',
      line: 'Every bullet and every tin of food was carried in on someone’s back.',
      page: [
        'There were no roads. Supplies were dropped from aircraft at dry lake beds like Myola, or carried on foot by Papuan men. Thousands worked as carriers, many of them recruited under pressure by the colonial administration.',
        'They carried the wounded too, on stretchers, for days, through the mud. Australians called them the Fuzzy Wuzzy Angels, from a soldier’s poem of 1942.',
      ],
      deeper: {
        title: 'How the carriers’ story was told',
        text: 'Wartime newspapers praised the carriers as gentle helpers, in words that today read as both grateful and condescending. Their own side of it was rarely asked. Many were conscripted, paid little, and worked at a pace that killed some of them; others chose to go. On the north side some Orokaiva helped the Japanese, and in 1943 the Australian authorities hanged about twenty of them at Higaturu, mostly for betraying missionaries to the Japanese. Recognition was slow: in 2009 Australia began giving surviving carriers a commemorative medallion, when few were left alive. Historians now treat the carriers as people with their own reasons, not as a chorus in an Australian story.',
      },
    },
    {
      km: 54,
      title: 'Efogi',
      line: 'Into Efogi, as the Japanese close in from behind.',
      page: ['By early September the Australians were exhausted, sick with dysentery and malaria, and short of food. They fell back through Efogi towards a ridge above it.'],
    },
    {
      km: 60,
      title: 'Brigade Hill',
      line: 'Brigade Hill, the worst day of the withdrawal.',
      page: ['From 6 to 8 September the 21st Brigade made a stand on Mission Ridge, now called Brigade Hill. Japanese troops worked round behind brigade headquarters and cut the force in two. The survivors escaped through the jungle. It was one of the costliest actions of the campaign.'],
    },
    {
      km: 72,
      title: 'Nauro',
      line: 'Down the steep ridges to Nauro, still falling back.',
      page: ['The track here is a series of steep climbs and drops; a day’s walk might gain only a few kilometres on the map. Damien Parer filmed the soldiers on these ridges, and his newsreel Kokoda Front Line! won an Academy Award in 1943.'],
    },
    {
      km: 82,
      title: 'Ioribaiwa',
      line: 'At Ioribaiwa, Japanese soldiers said they could see the lights of Port Moresby.',
      page: ['By 16 September the Japanese held Ioribaiwa Ridge, less than 50 km from Port Moresby. Their soldiers were starving. Far away, the Americans had landed on Guadalcanal, and Tokyo ordered the force in Papua to stop and go back.'],
    },
    {
      km: 89,
      title: 'Imita Ridge',
      line: 'Imita Ridge, where the withdrawal ends.',
      page: ['The Australians dug in on Imita Ridge with artillery behind them. The attack never came: on about 24 September the Japanese began to withdraw. The Australians followed them back over the range.'],
    },
    {
      km: 96,
      title: 'Owers’ Corner',
      line: 'At Owers’ Corner, the road head, the track ends.',
      page: [
        'Owers’ Corner was where the road from Port Moresby ended and the footpath began. The Australians retook Kokoda on 2 November 1942, and the fighting moved to the beachheads at Buna and Gona, which were among the bloodiest of the Pacific war.',
        'About 625 Australians were killed on the track, and many more fell sick. Japanese dead are estimated at over 2,000, many of them from hunger and disease. How many Papuans died has never been counted.',
      ],
    },
  ],
  chronicle: [
    { when: '21 July 1942', place: 'Buna and Gona', text: 'The Japanese land on the north coast.' },
    { when: '29 July 1942', place: 'Kokoda', text: 'Kokoda falls.' },
    { when: '26–31 August', place: 'Isurava', text: 'The stand at Isurava.' },
    { when: '6–8 September', place: 'Brigade Hill', text: 'The 21st Brigade is cut in two.' },
    { when: '16 September', place: 'Ioribaiwa', text: 'The Japanese reach their furthest point.' },
    { when: '2 November 1942', place: 'Kokoda', text: 'The Australians retake Kokoda.' },
    { when: 'By January 1943', place: 'Buna and Gona', text: 'The beachheads fall.' },
  ],
  sources: [
    { title: 'Wikipedia: Kokoda Track campaign', url: 'https://en.wikipedia.org/wiki/Kokoda_Track_campaign' },
    { title: 'Australian War Memorial: Kokoda Track', url: 'https://www.awm.gov.au/articles/encyclopedia/kokoda' },
    { title: 'Wikipedia: Fuzzy Wuzzy Angels', url: 'https://en.wikipedia.org/wiki/Fuzzy_Wuzzy_Angels' },
    { title: 'Wikipedia: Bruce Kingsbury', url: 'https://en.wikipedia.org/wiki/Bruce_Kingsbury' },
    { title: 'Kokoda Track Authority', url: 'https://www.kokodatrackauthority.org/' },
  ],
  ready: true,
};
