import type { RouteDef } from '../types';

/**
 * The Great Hedge of India: the Inland Customs Line, which taxed salt crossing it, at its longest in 1869, from the
 * Indus to Orissa. Lengths are the line's own, 4,030 km. No one walked it end to end; customs reports give its story.
 */
const KM = 4030;
const POSTS = 40;

export const hedge: RouteDef = {
  id: 'hedge',
  name: 'The Great Hedge of India',
  era: '1803–1879',
  hook: 'A customs line of thorn hedge across India, built to tax salt, and then forgotten.',
  group: 'india',
  km: KM,
  record: 'none',
  region: 'india',
  ink: '#8fb070',
  places: [
    { name: 'Tarbela', km: 0, at: 0, label: true },
    { name: 'Dera Ismail Khan', km: 407, at: 1 },
    { name: 'Multan', km: 662, at: 2, label: true },
    { name: 'Ferozepur', km: 1081, at: 3 },
    { name: 'Hisar', km: 1384, at: 4 },
    { name: 'Delhi', km: 1596, at: 5 },
    { name: 'Agra', km: 1839, at: 6 },
    { name: 'Etawah', km: 1987, at: 7, label: true },
    { name: 'Jhansi', km: 2195, at: 8 },
    { name: 'Sagar', km: 2439, at: 9 },
    { name: 'Burhanpur', km: 2950, at: 10, label: true },
    { name: 'Nagpur', km: 3350, at: 11 },
    { name: 'Raipur', km: 3705, at: 12 },
    { name: 'Sonapur', km: KM, at: 13, label: true },
  ],
  signature: {
    title: 'Customs posts',
    note: 'In 1869 the line had about 1,700 posts, each with a jemadar and ten men. You collect one for every forty or so along the way.',
    mark: 'shield',
    marks: Array.from({ length: POSTS }, (_, i) => ({ km: Math.round(((i + 1) * KM) / POSTS) })),
  },
  pages: [
    {
      km: 0,
      title: 'A line across India',
      line: 'At Tarbela on the Indus, a customs line begins its march across India.',
      page: [
        'Salt from the coast and the salt mines was taxed by the East India Company, and the tax was higher in some provinces than others. To stop cheaper salt being smuggled in, the British built a customs line across the country.',
        'By 1869 it was continuous, about 4,030 km, from Tarbela in the Himalayan foothills to Sonapur on the Mahanadi, in Orissa.',
      ],
      deeper: {
        title: 'Salt as a tax',
        text: 'Salt was taxed because everyone needs it: a tax on salt reached people who owned nothing else to tax. In Bengal the duty rose about tenfold in the 1780s and stayed high for nearly a century. Inside the customs line, people ate on average about half the salt of those outside it, around 3.6 kg a year against up to 7.3. Officials defended it as a few annas a year per person, the only tax most people paid; critics, then and since, called it a tax on the poorest. Moxham argues the shortage cost lives, especially in famines; nobody can count them. The tax was not abolished until 1946, and in 1930 Gandhi chose it for the Dandi March because it fell on everyone.',
      },
    },
    {
      km: 407,
      title: 'Along the Indus',
      line: 'Down the Indus, where the river itself was the barrier.',
      page: ['The northern stretch, from Tarbela to Multan, followed the Indus. The river was a barrier in itself, so this part was lightly guarded.'],
    },
    {
      km: 662,
      title: 'Multan',
      line: 'At Multan the guarded line begins.',
      page: ['From Multan the heavily guarded line ran about 2,300 km along the Sutlej and the Yamuna, then south to Burhanpur. It was pushed northwest as the British annexed Sindh and the Punjab in the 1840s.'],
    },
    {
      km: 1081,
      title: 'Up the Sutlej',
      line: 'Along the Sutlej, a line of posts every few kilometres.',
      page: ['Each post had a jemadar and about ten men. In 1869 there were about 1,700 posts and more than 11,000 men. They earned five rupees a month, more than a farm labourer’s three.'],
    },
    {
      km: 1384,
      title: 'Hisar',
      line: 'Near Hisar, a living hedge of thorn.',
      page: [
        'Where the line ran over open country, the customs men grew a hedge: Indian plum, babul, karonda and euphorbia, and in Hisar district, prickly pear.',
        'At its best it stood two and a half to three and a half metres high, and in places more than four metres thick.',
      ],
    },
    {
      km: 1596,
      title: 'The Yamuna',
      line: 'Along the Yamuna, past Delhi.',
      page: ['Along the Yamuna the line followed the river. Anyone crossing with salt had to pay the duty at a customs post or risk being caught smuggling.'],
    },
    {
      km: 1839,
      title: 'Agra',
      line: 'Past Agra, and the busiest stretch of the line.',
      page: ['The line also taxed sugar crossing it. In 1869–70 it brought in about 12.5 million rupees in salt tax, against a cost of about 1.6 million to run.'],
    },
    {
      km: 1987,
      title: 'Etawah',
      line: 'Near Etawah, the only stretch anyone has found again.',
      page: [
        'The line was forgotten so completely that the British writer Roy Moxham, finding a mention of it in 1995, found almost no one who had heard of it.',
        'In 1998, after years of searching, he found a raised embankment of it near Etawah. His book, The Great Hedge of India, came out in 2001.',
      ],
    },
    {
      km: 2195,
      title: 'Hume’s hedge',
      line: 'Into Bundelkhand, the hedge at its strongest.',
      page: ['Allan Octavian Hume, Commissioner of Customs from 1867 to 1870, pushed the live hedge furthest. In 1885 the same Hume helped found the Indian National Congress.'],
    },
    {
      km: 2500,
      title: 'Famine',
      line: 'Through central India, as famine struck the south and west.',
      page: ['The Great Famine of 1876–78, worst in the south and west, killed somewhere between five and a half and nearly ten million people. Lost land tax added to the pressure to scrap the line.'],
    },
    {
      km: 2950,
      title: 'Burhanpur',
      line: 'At Burhanpur the line turns east.',
      page: ['Just south of Burhanpur the guarded line ended, and a final section of about 1,300 km ran east across central India to the coast of Orissa.'],
    },
    {
      km: 3350,
      title: 'Nagpur',
      line: 'East across the Deccan towards Orissa.',
      page: ['Much of the line was never a living hedge at all, but a chain of posts with ditches and walls of dry thorn, guarding the roads that salt came along.'],
    },
    {
      km: 3705,
      title: 'Raipur',
      line: 'On towards the Mahanadi.',
      page: ['The last stretch crossed into the Mahanadi country towards Orissa and the Bay of Bengal.'],
    },
    {
      km: KM,
      title: 'Sonapur',
      line: 'At Sonapur on the Mahanadi, the end of the line, and of the hedge.',
      page: [
        'In 1879 the salt duties were equalised across British India, and on 1 April 1879 the line was abandoned. Some stretches in the northwest were still patrolled into the 1890s.',
        'The hedge was left to die or be cut for firewood, and within a century almost nobody remembered it.',
      ],
    },
  ],
  chronicle: [
    { when: '1803', place: 'Bengal', text: 'Customs houses are set up to stop salt smuggling.' },
    { when: '1843', place: 'North India', text: 'The line is named the Inland Customs Line.' },
    { when: '1869', place: 'Tarbela to Sonapur', text: 'The line is continuous, about 4,030 km.' },
    { when: '1876–1878', place: 'Southern and central India', text: 'The Great Famine.' },
    { when: '1 April 1879', place: 'The whole line', text: 'The line is abandoned.' },
    { when: '1930', place: 'Dandi', text: 'Gandhi’s Salt March breaks the salt law.' },
    { when: 'October 1946', place: 'Delhi', text: 'The Interim Government abolishes the salt tax.' },
    { when: '1998', place: 'Etawah', text: 'Roy Moxham finds a remnant.' },
  ],
  sources: [
    { title: 'Wikipedia: Inland Customs Line', url: 'https://en.wikipedia.org/wiki/Inland_Customs_Line' },
    { title: 'Atlas Obscura: the colonial British hedge for the salt tax', url: 'https://www.atlasobscura.com/articles/colonial-india-british-hedge-salt-tax' },
    { title: 'Hachette: Roy Moxham, The Great Hedge of India', url: 'https://www.hachette.co.uk/titles/roy-moxham/the-great-hedge-of-india/9781841194677' },
    { title: 'Wikipedia: Allan Octavian Hume', url: 'https://en.wikipedia.org/wiki/Allan_Octavian_Hume' },
    { title: 'Wikipedia: Great Famine of 1876–1878', url: 'https://en.wikipedia.org/wiki/Great_Famine_of_1876%E2%80%931878' },
  ],
  ready: true,
};
