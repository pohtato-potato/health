import type { RouteDef } from '../types';

/**
 * Shackleton, Worsley and Crean cross South Georgia, 19–20 May 1916: about 50 km of unmapped glacier and ridge
 * in about 36 hours, from King Haakon Bay to the whaling station at Stromness. Their own accounts date it by the hour;
 * the line between is approximate.
 */
const KM = 50;
const HOURS = 36;

export const shackleton: RouteDef = {
  id: 'shackleton',
  name: 'Shackleton’s crossing',
  era: '1916',
  hook: 'Three men, no map and a carpenter’s adze, over the mountains to save twenty-five more.',
  group: 'world',
  km: KM,
  record: 'dated',
  region: 'southgeorgia',
  ink: '#a8d8e8',
  places: [
    { name: 'Peggotty Camp', km: 0, at: 0, label: true },
    { name: 'The Murray Snowfield', km: 13, at: 2 },
    { name: 'The Trident', km: 27, at: 4 },
    { name: 'The Crean Glacier', km: 33, at: 5 },
    { name: 'Fortuna Bay', km: 42, at: 7 },
    { name: 'Stromness', km: KM, at: 8, label: true },
  ],
  signature: {
    title: 'Hours on the ice',
    note: 'They crossed in about 36 hours without stopping to camp. Each mark is one of those hours.',
    mark: 'crystal',
    marks: Array.from({ length: HOURS }, (_, i) => ({ km: Math.round((((i + 1) * KM) / HOURS) * 10) / 10, name: `Hour ${i + 1}` })),
  },
  then: { who: 'Shackleton, Worsley and Crean', totalDays: 2, places: [{ name: 'The Trident', theirDay: 1 }, { name: 'Fortuna Bay', theirDay: 2 }, { name: 'Stromness', theirDay: 2 }], source: 'From Shackleton’s South (1919) and Worsley’s accounts; the hours are theirs, the places between estimated.' },
  pages: [
    {
      km: 0,
      title: 'The wrong side of the island',
      line: 'At King Haakon Bay, the boat has landed on the wrong side of South Georgia.',
      page: [
        'Shackleton’s ship Endurance was crushed by the Weddell Sea ice and sank in November 1915. Its 28 men camped on the ice, then sailed small boats to Elephant Island. From there six of them sailed the 7-metre James Caird about 1,300 to 1,500 km across the Southern Ocean, and on 10 May 1916 landed on South Georgia.',
        'They landed on the uninhabited south coast. The whaling stations were on the north side, across mountains no one had crossed.',
      ],
      deeper: {
        title: 'Leadership when the plan has failed',
        text: 'The expedition’s aim, to cross Antarctica on foot, failed before it began: the ship never reached land. Shackleton is remembered for what came after, when the only aim left was to keep everyone alive. He kept the men busy, shared out the worst jobs and the best food evenly, and kept the troublemakers close to him. He was not a careful planner. He sailed late into a bad ice year, ignored warnings from the whalers here, and was always short of money; his earlier and later expeditions show the same habits. Historians weigh both: a poor organiser and a remarkable leader in a crisis.',
      },
    },
    {
      km: 4,
      title: 'Three set off',
      line: 'In the small hours of 19 May, three men set off under a full moon.',
      page: [
        'Two of the six were too weak to go on, and McCarthy stayed to look after them, at a camp under an upturned boat they called Peggotty Camp. Shackleton, Frank Worsley, the ship’s captain, and Tom Crean, an Irish seaman, set off at about 3 in the morning on 19 May.',
        'They carried a small stove, food for three days, a 15-metre rope and a carpenter’s adze. Screws from the boat were driven through their boot soles for grip.',
      ],
    },
    {
      km: 13,
      title: 'The snowfield',
      line: 'Up onto the snowfield, roped together, in fog.',
      page: ['They climbed onto a wide snowfield, now the Murray Snowfield, and walked roped together through fog. Worsley steered by compass. At one point the fog lifted to show they had nearly walked onto a crevassed glacier, and they had to turn back.'],
    },
    {
      km: 20,
      title: 'Dead ends',
      line: 'Ridge after ridge, and each gap a dead end.',
      page: ['A line of jagged peaks barred the way north. They climbed to one gap after another, cutting steps with the adze, and found sheer drops beyond each. Every climb back down cost hours they did not have.'],
    },
    {
      km: 27,
      title: 'The slide',
      line: 'At dusk, on the Trident, they sit on the rope and slide.',
      page: [
        'As darkness fell they were high on a ridge with fog rising behind them. A night out at that height would kill them.',
        'Shackleton coiled the rope into a seat, the three sat on it one behind the other, and they slid down the slope into the dark. They dropped hundreds of metres in a minute or two and landed in a snowbank, unhurt, laughing.',
      ],
    },
    {
      km: 33,
      title: 'Five minutes',
      line: 'After midnight, on the glacier, Shackleton lets them sleep five minutes.',
      page: ['They walked on through the night by moonlight. Sheltering at one point, Worsley and Crean fell asleep at once. Shackleton stayed awake, knowing that sleep in that cold might not end, and woke them after five minutes, telling them they had slept for half an hour.'],
    },
    {
      km: 38,
      title: 'The whistle',
      line: 'At seven in the morning, the whistle at Stromness.',
      page: ['At about 7 o’clock on the morning of 20 May they heard a steam whistle in the distance, the call to work at the Stromness whaling station. It was the first sound from the outside world they had heard since December 1914.'],
    },
    {
      km: 42,
      title: 'Fortuna Bay',
      line: 'Down to Fortuna Bay, and one more ridge.',
      page: [
        'They came down to the shore of Fortuna Bay and climbed the last ridge beyond it.',
        'Shackleton later wrote that on the march it often seemed to him they were four, not three. Afterwards Worsley and Crean both said they had felt the same.',
      ],
    },
    {
      km: 46,
      title: 'The waterfall',
      line: 'Down a frozen waterfall on the last of the rope.',
      page: ['The only way down to Stromness was a stream that dropped over a waterfall of about ten metres. They tied the rope to a rock and let themselves down through the falling water, leaving the rope behind.'],
    },
    {
      km: KM,
      title: 'Stromness',
      line: 'At Stromness, the station manager does not know them.',
      page: [
        'At about 3 in the afternoon on 20 May three filthy, bearded men walked into the whaling station. Two boys ran from them. The manager, Thoralf Sørlle, had met Shackleton before but did not recognise him.',
        'Worsley went back by whaler for the three men at Peggotty Camp the next day. Getting the 22 on Elephant Island out took four tries through the ice; on 30 August 1916 the Chilean tug Yelcho, under Luis Pardo, brought them all off alive.',
      ],
      deeper: {
        title: 'The other half of the expedition',
        text: 'Shackleton’s plan needed a second party on the far side of Antarctica, the Ross Sea party, to lay food depots for the crossing he never made. Their ship, the Aurora, was torn from its moorings in a storm and drifted away with most of their supplies. The ten men left ashore laid the depots anyway, hauling sledges for months on short rations, not knowing no one would come to use them. Three died: Arnold Spencer-Smith of scurvy, and Aeneas Mackintosh and Victor Hayward walking across sea ice in a blizzard. Shackleton reached the survivors in January 1917. The Endurance story is told as a story of everyone surviving; the expedition as a whole lost three men.',
      },
    },
  ],
  chronicle: [
    { when: '21 November 1915', place: 'The Weddell Sea', text: 'Endurance sinks.' },
    { when: '24 April 1916', place: 'Elephant Island', text: 'The James Caird sets out.' },
    { when: '10 May 1916', place: 'King Haakon Bay', text: 'The boat reaches South Georgia.' },
    { when: 'About 3 am, 19 May', place: 'Peggotty Camp', text: 'Three men set off.' },
    { when: 'About 3 pm, 20 May', place: 'Stromness', text: 'They walk into the whaling station.' },
    { when: '30 August 1916', place: 'Elephant Island', text: 'The Yelcho rescues the last 22.' },
    { when: 'March 2022', place: 'The Weddell Sea', text: 'The wreck of Endurance is found, about 3 km down.' },
  ],
  sources: [
    { title: 'Ernest Shackleton, South (1919), Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/5199' },
    { title: 'Wikipedia: Imperial Trans-Antarctic Expedition', url: 'https://en.wikipedia.org/wiki/Imperial_Trans-Antarctic_Expedition' },
    { title: 'Wikipedia: Ross Sea party', url: 'https://en.wikipedia.org/wiki/Ross_Sea_party' },
    { title: 'Wikipedia: Endurance (1912 ship)', url: 'https://en.wikipedia.org/wiki/Endurance_(1912_ship)' },
  ],
  ready: true,
};
