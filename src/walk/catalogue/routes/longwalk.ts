import type { RouteDef } from '../types';

/**
 * The Long Walk: Sławomir Rawicz's 1956 account of escaping a Soviet labour camp in 1941 and walking to India across
 * Mongolia, the Gobi, Tibet and the Himalaya, about 6,500 km. Records found since suggest he never made the walk. Each
 * page says what the book claims and what the evidence says; the line follows the book's route as far as it can be
 * pinned down, which is not far.
 */
const KM = 6500;

export const longwalk: RouteDef = {
  id: 'longwalk',
  name: 'The Long Walk',
  era: '1941–1942, as told',
  hook: 'An escape from Siberia to India on foot, as a famous book tells it, and as the records may not.',
  group: 'world',
  km: KM,
  record: 'story',
  region: 'longwalk',
  ink: '#b0c0e8',
  places: [
    { name: 'Yakutsk', km: 0, at: 0, label: true },
    { name: 'The Lena', km: 1205, at: 2 },
    { name: 'Lake Baikal', km: 2034, at: 3, label: true },
    { name: 'Kyakhta', km: 2513, at: 5 },
    { name: 'The Gobi', km: 3645, at: 7, label: true },
    { name: 'The Tibetan plateau', km: 4909, at: 9 },
    { name: 'Lhasa', km: 5979, at: 11, label: true },
    { name: 'The Himalaya', km: 6356, at: 12 },
    { name: 'Darjeeling', km: KM, at: 13, label: true },
  ],
  signature: {
    title: 'Landmarks of the claim',
    note: 'The places the book says the walkers passed. Each is real; whether they passed them is the question.',
    mark: 'walker',
    marks: [
      { km: 600, name: 'The taiga' },
      { km: 1205, name: 'The Lena' },
      { km: 2034, name: 'Lake Baikal' },
      { km: 2400, name: 'The Trans-Siberian line' },
      { km: 2513, name: 'The Mongolian border' },
      { km: 3645, name: 'The Gobi' },
      { km: 4909, name: 'The Tibetan plateau' },
      { km: 5979, name: 'Near Lhasa' },
      { km: 6356, name: 'The Himalaya' },
      { km: KM, name: 'British India' },
    ],
  },
  pages: [
    {
      km: 0,
      title: 'Camp 303',
      line: 'The book begins in a labour camp in Siberia, in the winter of 1941.',
      page: [
        'In The Long Walk (1956), Sławomir Rawicz, a Polish army officer, tells how he was arrested by the Soviet secret police after the invasion of Poland in 1939, tortured, and sentenced to 25 years in a labour camp in Siberia, which he calls Camp 303 and places about 650 km south of the Arctic Circle.',
        'The evidence: records found in 2006 say he was sent to the camps for killing an officer of the secret police, and place him in different camps.',
        'The book was written with a journalist, Ronald Downing, from Rawicz’s telling. It sold in the hundreds of thousands and was translated into many languages.',
      ],
      deeper: {
        title: 'How a memoir becomes history',
        text: 'For fifty years The Long Walk was read as true. It was a vivid first-person account at a time when little was known in the West about the Soviet camps, and its details were hard to check: the Soviet archives were closed. Explorers and mountaineers doubted parts of it, especially the crossing of the Gobi without water and the sighting of two yetis in the Himalaya, but the book stayed in print as a true story. Readers trust a confident voice, and publishers had little reason to dig. When the archives opened after 1991, the story could finally be tested, and it largely failed. The book is still worth reading, as a story, and as a lesson in how a memoir becomes accepted fact.',
      },
    },
    {
      km: 450,
      title: 'The escape',
      line: 'The book: seven men slip out of the camp in a snowstorm.',
      page: [
        'The book says that in April 1941 Rawicz and six others, with help from the camp commandant’s wife, escaped under the wire in a blizzard and headed south, away from the Arctic.',
        'The evidence: records found by a BBC investigation in 2006, one in Rawicz’s own hand, show him released in 1942 under the amnesty for Polish prisoners, with no escape on file.',
      ],
    },
    {
      km: 1250,
      title: 'The Lena',
      line: 'South through the taiga, across the frozen rivers.',
      page: ['The book describes weeks of walking through the taiga, the Siberian forest, crossing the Lena and its tributaries, eating what they could catch or steal. Its geography here is vague, which made it hard to check and easy to believe.'],
    },
    {
      km: 2034,
      title: 'Lake Baikal',
      line: 'The book: round Lake Baikal, where a girl joins them.',
      page: ['At Lake Baikal, the book says, they met Kristina, a young Polish woman escaping a collective farm, who joined them. Baikal is the deepest lake in the world, holding about a fifth of the world’s unfrozen fresh water. The book says little about how seven men on foot avoided the towns and railway along its shore.'],
    },
    {
      km: 2513,
      title: 'Into Mongolia',
      line: 'Over the border into Mongolia.',
      page: ['The book has them cross the Trans-Siberian railway and the border into Mongolia, then a Soviet satellite state. They were relieved, it says, to see no soldiers. In reality the border was patrolled, and Mongolia’s government worked closely with Moscow.'],
    },
    {
      km: 3200,
      title: 'The real escapes',
      line: 'The real camps, and the real Poles who left them.',
      page: [
        'Whatever happened to Rawicz, the camps were real. After the Soviet Union invaded eastern Poland in 1939, it deported hundreds of thousands of Polish citizens to camps and settlements in Siberia and Central Asia. Many died.',
        'When Germany invaded the Soviet Union in 1941, Stalin agreed an amnesty for Poles, and over 100,000, soldiers and civilians, left with General Anders’ army through Central Asia to Iran in 1942. That, the records say, was Rawicz’s way out.',
      ],
    },
    {
      km: 3900,
      title: 'The Gobi',
      line: 'The book: across the Gobi with almost no water.',
      page: [
        'The book’s most famous chapters cross the Gobi desert in summer, for many days without water, living on snakes. Kristina and one of the men die there.',
        'Desert travellers have long said that crossing that stretch on foot without water for so long is not survivable. Rawicz later said he did not know exactly where they had been.',
      ],
    },
    {
      km: 4600,
      title: 'Out of the desert',
      line: 'Out of the desert, by the book, into the foothills.',
      page: ['The book has the survivors stagger out of the Gobi into the foothills of Tibet and find water. People who have tried to map the route from the book have found it gives few names, and that its distances and days do not fit together.'],
    },
    {
      km: 5300,
      title: 'Tibet',
      line: 'Onto the Tibetan plateau, where villagers feed them.',
      page: ['In Tibet, the book says, villagers gave them food and shelter, and they walked south across the high plateau towards Lhasa. Tibet’s hospitality to travellers was real; the book gives few places or dates that could be checked.'],
    },
    {
      km: 5979,
      title: 'Lhasa',
      line: 'Past Lhasa, avoiding the city.',
      page: ['The book says they passed near Lhasa without entering it. In the 1940s Tibet kept foreigners out; the few who reached Lhasa, like the Austrian climbers Heinrich Harrer and Peter Aufschnaiter, who escaped a British internment camp in India in 1944, were recorded and remembered there.'],
    },
    {
      km: 6356,
      title: 'The Himalaya',
      line: 'The book: over the Himalaya, and two creatures in the snow.',
      page: ['Crossing the Himalaya, the book says, they watched two large, upright, hairy creatures for two hours, which Rawicz took to be yetis. This passage made the book a favourite of yeti hunters and convinced many others it could not be true.'],
    },
    {
      km: KM,
      title: 'India',
      line: 'At the end, British India, and a story no one could check.',
      page: [
        'The book ends in 1942 with four survivors reaching British soldiers in India and being taken to hospital in Calcutta.',
        'Rawicz settled in England and lectured on the walk until his death in 2004. In 2009 another Polish veteran, Witold Glinski, claimed the walk had been his; his story too has been widely doubted. In 2010 the film The Way Back was made from the book, described as inspired by it, not as true. Whether anyone ever made this walk is unknown.',
      ],
    },
  ],
  chronicle: [
    { when: 'September 1939', place: 'Poland', text: 'Germany and the Soviet Union invade.' },
    { when: '1940–41', place: 'Eastern Poland', text: 'Mass deportations to the Soviet interior.' },
    { when: 'April 1941', place: 'Siberia', text: 'The escape, by the book.' },
    { when: '1942', place: 'Central Asia to Iran', text: 'Anders’ army leaves the Soviet Union; Rawicz with it, by the records.' },
    { when: '1956', place: 'London', text: 'The Long Walk is published.' },
    { when: '2006', place: 'London', text: 'A BBC investigation finds the records.' },
    { when: '2010', place: 'Cinemas', text: 'The Way Back is released.' },
  ],
  sources: [
    { title: 'Wikipedia: The Way Back (2010 film)', url: 'https://en.wikipedia.org/wiki/The_Way_Back_(2010_film)' },
    { title: 'Wikipedia: Sławomir Rawicz', url: 'https://en.wikipedia.org/wiki/S%C5%82awomir_Rawicz' },
    { title: 'BBC News: Walking the talk? (Hugh Levinson, 2006)', url: 'http://news.bbc.co.uk/2/hi/uk_news/magazine/6098218.stm' },
    { title: 'Wikipedia: Anders’ Army', url: 'https://en.wikipedia.org/wiki/Anders%27_Army' },
  ],
  ready: true,
};
