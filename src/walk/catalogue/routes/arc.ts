import type { RouteDef } from '../types';

/**
 * The Great Arc, 1802–1841: the survey that measured India along one meridian, from Cape Comorin to the hills above
 * Dehra Dun. Measured along the line the surveyors walked, not by road.
 */
export const arc: RouteDef = {
  id: 'arc',
  name: 'The Great Arc',
  era: '1802–1841',
  hook: 'Forty years measuring India along one line, with a theodolite that took a dozen men to carry.',
  group: 'india',
  km: 2565,
  record: 'place',
  region: 'india',
  ink: '#9fb8e6',
  places: [
    { name: 'Cape Comorin', km: 0, at: 0, label: true },
    { name: 'Madurai', km: 215, at: 1 },
    { name: 'Bangalore', km: 558, at: 2, label: true },
    { name: 'Anantapur', km: 748, at: 3 },
    { name: 'Bidar', km: 1108, at: 4 },
    { name: 'Hinganghat', km: 1432, at: 5, label: true },
    { name: 'Sironj', km: 1844, at: 6, label: true },
    { name: 'Gwalior', km: 2085, at: 7 },
    { name: 'Meerut', km: 2398, at: 8 },
    { name: 'Dehra Dun', km: 2548, at: 9, label: true },
    { name: 'Banog', km: 2565, at: 10 },
  ],
  signature: {
    title: 'Survey stations',
    note: 'The arc was built from stations on hilltops, towers and temple roofs, each sighted from the last. These are the ones that mattered most.',
    mark: 'stone',
    marks: [
      { km: 1, name: 'Cape Comorin, the southern end' },
      { km: 558, name: 'The Bangalore baseline' },
      { km: 1108, name: 'The Deccan stations' },
      { km: 1432, name: 'Hinganghat, Lambton’s grave' },
      { km: 1844, name: 'Kalianpur, near Sironj' },
      { km: 2548, name: 'The Dehra Dun baseline' },
      { km: 2565, name: 'Banog, the northern end' },
    ],
  },
  years: { theirs: 39, note: '1802 to 1841: Lambton from 1802, Everest after him' },
  pages: [
    {
      km: 0,
      title: 'One straight line',
      line: 'From the southern tip of India, a survey sets out to measure the land along one meridian.',
      page: [
        'In 1802 William Lambton, an infantry officer, began the Great Trigonometrical Survey with a baseline near Madras. From it he built a chain of triangles, measuring angles between hilltops.',
        'Its backbone became the Great Arc: a line of triangles running north along the 78th meridian, from Cape Comorin towards the Himalaya, about 2,400 km.',
      ],
      deeper: {
        title: 'How a straight line shows the shape of the earth',
        text: 'If the earth were a perfect sphere, a degree of latitude would be the same length everywhere. Because it bulges at the equator, a degree is a little longer near the poles. Measure a long north–south arc very precisely, compare the length of its degrees, and you can work out how much the earth is flattened. The Great Arc was the longest such measurement made anywhere in its time. It also found that the Himalaya pulled plumb lines less than their mass should. That was one of the clues to isostasy: mountains float on deeper rock, with roots beneath them.',
      },
    },
    {
      km: 215,
      title: 'The southern triangles',
      line: 'North through the Tamil country, hilltop to hilltop.',
      page: ['Each triangle needed clear sight between its corners, often many kilometres apart. In the flat south the surveyors climbed hills, and where there were none, the roofs of temples.'],
    },
    {
      km: 380,
      title: 'The fall at Thanjavur',
      line: 'The great theodolite crashes from a temple tower.',
      page: [
        'The survey’s great theodolite weighed about half a tonne and took a dozen men to carry. At Thanjavur it was hauled up the tower of the great Brihadisvara temple for a clear view, and fell.',
        'It was badly damaged. Lambton repaired it himself, over weeks or months by different accounts, and carried on.',
      ],
    },
    {
      km: 558,
      title: 'Bangalore',
      line: 'Bangalore, and a baseline measured to check the work.',
      page: ['A baseline measured at Bangalore in 1804 checked how true the triangles had stayed. Lengths were measured with chains laid on tables in the shade and corrected for the temperature.'],
    },
    {
      km: 800,
      title: 'Mapping as conquest',
      line: 'Who was the map for?',
      page: ['The survey was paid for by the East India Company, which was taking control of India as the arc moved north. Exact maps told it what it owned, what to tax and how to move armies.'],
      deeper: {
        title: 'Science and empire',
        text: 'The Great Arc was real science, and it was also a tool of rule. Historians such as Matthew Edney have argued that the survey helped the Company imagine India as a single, measurable territory it could govern, whatever the people living there thought. Both readings hold: the measurements were among the best in the world, and they were made so that India could be owned.',
      },
    },
    {
      km: 1108,
      title: 'Bidar',
      line: 'Past Bidar, on its red plateau.',
      page: ['The arc passed close to Bidar, an old capital of the Bahmani sultans standing on a plateau of red laterite. A baseline was measured near Bidar to check the work, and stations were set on whatever rose above the plain: hills, rocks, old forts.'],
    },
    {
      km: 1270,
      title: 'Across the Deccan',
      line: 'Across the Deccan plateau, years at a time.',
      page: ['Survey parties worked in the cooler months and waited out the rains. In the plains they lost men to fever; at times the whole party numbered several hundred people, with elephants and bullock carts.'],
    },
    {
      km: 1432,
      title: 'Hinganghat',
      line: 'At Hinganghat, Lambton dies at work.',
      page: ['Lambton died in camp at Hinganghat, in the Maratha country south of Nagpur, in January 1823, at about seventy, with the arc a little over half done. He is buried there. His assistant, George Everest, took over.'],
    },
    {
      km: 1640,
      title: 'Everest',
      line: 'George Everest, a demanding man, takes on the arc.',
      page: ['Everest was precise, short-tempered and often ill. He rebuilt the instruments, remeasured old work, and drove the arc north for nearly twenty years.'],
    },
    {
      km: 1844,
      title: 'Kalianpur',
      line: 'Near Sironj, the point the map of India was hung from.',
      page: ['A station on Kalianpur hill, near Sironj, later became the origin of the survey’s reference system: the point from which positions across India were reckoned for over a century.'],
    },
    {
      km: 2085,
      title: 'Towers on the plain',
      line: 'On the flat plains, towers and lights in the dark.',
      page: ['On the Gangetic plain there were no hills. The survey built masonry towers to see over the haze and the trees, and sighted between them at night with bright lamps.'],
    },
    {
      km: 2398,
      title: 'The computers',
      line: 'The Indian mathematicians who did the sums.',
      page: [
        'The calculations were done by "computers", many of them Indian. The best known is Radhanath Sikdar, who joined the survey in 1831.',
        'In 1852, by the usual account, he worked out that the mountain called Peak XV was the highest in the world. Some historians doubt the story; one study of the survey’s memos finds he ran the team that did the sums rather than finding the peak alone.',
      ],
    },
    {
      km: 2548,
      title: 'Dehra Dun',
      line: 'The last baseline, at Dehra Dun.',
      page: ['A final baseline in the Dehra Dun valley checked the triangles against a fresh measurement on the ground. The Survey of India still has its headquarters in Dehra Dun.'],
    },
    {
      km: 2565,
      title: 'Banog',
      line: 'At Banog, above Mussoorie, the arc is done.',
      page: [
        'The arc was finished in 1841 at Banog, in the hills above Mussoorie, where Everest had a house.',
        'In 1856 his successor, Andrew Waugh, proposed naming Peak XV after him; the Royal Geographical Society adopted the name in 1865. Everest himself is said to have objected that the name could not be written or said by the people of India.',
      ],
    },
  ],
  chronicle: [
    { when: '10 April 1802', place: 'Madras', text: 'Lambton begins measuring the first baseline.' },
    { when: '1804', place: 'Bangalore', text: 'A second baseline checks the work.' },
    { when: 'January 1823', place: 'Hinganghat', text: 'Lambton dies; Everest takes over.' },
    { when: '1841', place: 'Banog', text: 'The arc is finished.' },
    { when: '1852', place: 'Calcutta', text: 'Peak XV is worked out to be the highest mountain, by the usual account.' },
    { when: '1856', place: 'Calcutta', text: 'Waugh announces the result.' },
    { when: '1865', place: 'London', text: 'The Royal Geographical Society names it Everest.' },
  ],
  sources: [
    { title: 'Wikipedia: Great Trigonometrical Survey', url: 'https://en.wikipedia.org/wiki/Great_Trigonometrical_Survey' },
    { title: 'Wikipedia: William Lambton', url: 'https://en.wikipedia.org/wiki/William_Lambton' },
    { title: 'Wikipedia: George Everest', url: 'https://en.wikipedia.org/wiki/George_Everest' },
    { title: 'Wikipedia: Radhanath Sikdar', url: 'https://en.wikipedia.org/wiki/Radhanath_Sikdar' },
    { title: 'GPS World: Peak XV, the framework that measured Mount Everest', url: 'https://www.gpsworld.com/peak-xv-the-framework-that-measured-mount-everest/' },
    { title: 'Explorersweb: the five men who measured Mount Everest', url: 'https://explorersweb.com/the-five-men-who-measured-mount-everest/' },
    { title: 'Current Science: the spark that fired the Great Trigonometrical Survey', url: 'https://www.currentscience.ac.in/Volumes/118/01/0147.pdf' },
  ],
  ready: true,
};
