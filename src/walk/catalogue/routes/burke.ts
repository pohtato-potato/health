import type { RouteDef } from '../types';

/**
 * Burke and Wills, 1860–61: Melbourne to the Gulf of Carpentaria and back to the Dig Tree at Cooper Creek, about
 * 3,250 km out and 1,600 back, turning at the mangroves of the Bynoe River. Dated from Wills's journals and the
 * Royal Commission; the line between camps is approximate.
 */
const KM = 4850;
const GULF = 3250;

export const burke: RouteDef = {
  id: 'burke',
  name: 'Burke and Wills',
  era: '1860–1861',
  hook: 'A city waves off an expedition to cross Australia; three men reach the Gulf, and one comes back.',
  group: 'world',
  km: KM,
  record: 'dated',
  region: 'australia',
  ink: '#e09a9a',
  turn: GULF,
  places: [
    { name: 'Royal Park', km: 0, at: 0, label: true },
    { name: 'Swan Hill', km: 400, at: 2 },
    { name: 'Balranald', km: 500, at: 3 },
    { name: 'Menindee', km: 750, at: 5, label: true },
    { name: 'Cooper Creek', km: 1600, at: 8, label: true },
    { name: 'The Selwyn Range', km: 2700, at: 12 },
    { name: 'The Gulf', km: GULF, at: 14, label: true },
    { name: 'The Dig Tree', km: KM, at: 20 },
  ],
  signature: {
    title: 'Camps of the expedition',
    note: 'Wills numbered the camps and the men cut the numbers into trees. Each camp the story turns on is a mark.',
    mark: 'stone',
    marks: [
      { km: 400, name: 'Swan Hill' },
      { km: 500, name: 'Balranald' },
      { km: 700, name: 'Kinchega, on the Darling' },
      { km: 750, name: 'Menindee' },
      { km: 1100, name: 'Torowotto' },
      { km: 1600, name: 'Camp 65, Cooper Creek' },
      { km: 3150, name: 'Camp 119, the Bynoe River' },
      { km: GULF, name: 'The mangroves' },
      { km: 4400, name: 'Polygonum Swamp' },
      { km: KM, name: 'The Dig Tree' },
    ],
  },
  then: {
    who: 'Burke and Wills',
    totalDays: 245,
    places: [{ name: 'Swan Hill', theirDay: 18 }, { name: 'Menindee', theirDay: 54 }, { name: 'Cooper Creek', theirDay: 84 }, { name: 'The Gulf', theirDay: 176 }, { name: 'The Dig Tree', theirDay: 245 }],
    source: 'Day 1 is 20 August 1860, the day they left Royal Park. Dated from Wills’s journals and the Royal Commission.',
  },
  pages: [
    {
      km: 0,
      title: 'Royal Park',
      line: 'About fifteen thousand people watch the expedition leave Melbourne.',
      page: [
        'On 20 August 1860 about 15,000 people gathered in Royal Park, Melbourne, to see the Victorian Exploring Expedition set off to cross Australia from south to north, which no European party had yet done.',
        'It had 19 men, 23 horses, 26 camels shipped from India, six wagons and about 20 tonnes of supplies, even an oak table with a cedar top, and a Chinese gong.',
      ],
      deeper: {
        title: 'Ambition and bad leadership',
        text: 'Victoria was rich from the gold rush and wanted to beat South Australia to the north coast, where a telegraph line to Asia might run. The Royal Society of Victoria chose as leader Robert O’Hara Burke, an Irish police officer who had no experience of exploring or of the bush. He was brave, impatient and quick to quarrel. Within weeks officers were resigning and men being sacked. Historians argue over how much blame he deserves and how much belongs to the committee in Melbourne, whose instructions were vague and whose support was slow. The Royal Commission afterwards blamed Burke’s zeal and the delays of William Wright, who was supposed to bring up supplies from Menindee.',
      },
    },
    {
      km: 400,
      title: 'Swan Hill',
      line: 'North to Swan Hill on the Murray, in the rain.',
      page: ['Heavy rain turned the roads to mud, and the overloaded wagons crawled. The expedition reached Swan Hill on the Murray on 6 September. Burke began dumping stores to lighten the load.'],
    },
    {
      km: 750,
      title: 'Menindee',
      line: 'At Menindee on the Darling, Burke splits the party.',
      page: [
        'They reached Menindee on 12 October, after almost two months on the road. The second-in-command, George Landells, who had brought the camels from India, had resigned after quarrelling with Burke, and the doctor with him. William Wills, the young surveyor, became second-in-command.',
        'Impatient, Burke went ahead with a small party for Cooper Creek, leaving the rest to follow with the supplies.',
      ],
    },
    {
      km: 1100,
      title: 'Into the inland',
      line: 'Into the dry inland, in a good season.',
      page: ['Beyond the Darling they crossed the dry Corner Country towards the Cooper. The season was unusually wet, and they found water easily. They were walking through the country of Aboriginal peoples who had lived here for tens of thousands of years and knew every waterhole.'],
    },
    {
      km: 1600,
      title: 'Cooper Creek',
      line: 'At Cooper Creek, a depot, and orders to wait.',
      page: [
        'Burke reached Cooper Creek on 11 November and set up a depot camp. On 16 December, in the heat of summer, he set off for the Gulf with Wills, John King and Charles Gray, six camels and a horse.',
        'He left William Brahe in charge of the depot with three men, telling him to wait three months, or longer if he could.',
      ],
    },
    {
      km: 2100,
      title: 'Into the north',
      line: 'North across the Channel Country in the summer heat.',
      page: ['The four walked by day and sometimes by night in temperatures over 40 degrees, following creeks north. Wills kept the journal and fixed their position by the stars.'],
    },
    {
      km: 2700,
      title: 'The Selwyn Range',
      line: 'Over the Selwyn Range, rocky and hard on the camels.',
      page: ['In January 1861 they crossed the rocky Selwyn Range, which was hard going for the camels, and came down to the rivers that drain north to the Gulf of Carpentaria. The wet season began, and the ground turned to bog.'],
    },
    {
      km: 3000,
      title: 'The Flinders',
      line: 'Down the rivers towards the sea, through the wet season.',
      page: ['Leaving the others with the camels, Burke and Wills went on along a channel of the Flinders river towards the coast. They saw the tide rising and falling in the river and tasted salt.'],
    },
    {
      km: GULF,
      title: 'The mangroves',
      line: 'At the mangroves, the sea is close, and out of reach.',
      page: [
        'In about February 1861 the mangrove swamps stopped them a few kilometres short of the open sea. They never saw the ocean. Burke decided they had done enough to claim the crossing, and turned back.',
        'They had food for only a few weeks of the long way home.',
      ],
    },
    {
      km: 3500,
      title: 'The way back',
      line: 'South again, in the rains, with food running out.',
      page: ['The walk back was a race against starvation through rain and mud. They killed and ate the camels one by one, and the horse. Gray fell ill; when Burke caught him taking extra flour he beat him.'],
    },
    {
      km: 3950,
      title: 'Waiting at the Cooper',
      line: 'At the depot, Brahe waits, and the supplies never come.',
      page: ['At Cooper Creek William Brahe waited beyond the three months he had been asked to. One of his men, William Patton, was sick with scurvy. The supply party that was meant to come up from Menindee under William Wright was months late, and men in it were dying too. Brahe decided he must go.'],
    },
    {
      km: 4400,
      title: 'Gray',
      line: 'Charles Gray dies, and they lose a day to bury him.',
      page: ['On 17 April Charles Gray died. The three others, too weak to dig fast, took a day to bury him. That day would matter.'],
    },
    {
      km: KM,
      title: 'The Dig Tree',
      line: 'At Cooper Creek, the depot is empty, abandoned that morning.',
      page: [
        'On the evening of 21 April 1861 Burke, Wills and King staggered into the depot. It was empty. Brahe, after waiting over four months, had left that morning, about nine hours before. On a tree he had carved DIG. Under it they found food and a note.',
        'Too weak to follow, they tried for a police station in South Australia and failed. The Yandruwandha people fed them fish and nardoo. Wills and Burke died at the end of June. King lived with the Yandruwandha until a search party found him on 15 September 1861.',
      ],
      deeper: {
        title: 'What the Yandruwandha knew',
        text: 'The explorers died in country where the Yandruwandha lived well. The people gave them fish, cakes made from nardoo seed and shelter, and kept their fires going. Burke, suspicious, fired his pistol over their heads, and they moved away. The three men then lived on nardoo they prepared themselves; it is now thought they did not treat it as the Yandruwandha did, by grinding it with water, and that an enzyme in the raw seed helped starve them of vitamin B1. King survived because he lived with the Yandruwandha. Seven of the expedition died. Melbourne gave Burke and Wills a state funeral in 1863 and, later, a statue; the Yandruwandha were given three brass breastplates.',
      },
    },
  ],
  chronicle: [
    { when: '20 August 1860', place: 'Royal Park', text: 'The expedition leaves Melbourne.' },
    { when: '12 October 1860', place: 'Menindee', text: 'Burke splits the party.' },
    { when: '11 November 1860', place: 'Cooper Creek', text: 'The depot is set up.' },
    { when: '16 December 1860', place: 'Cooper Creek', text: 'Four men set off for the Gulf.' },
    { when: 'About 11 February 1861', place: 'The Gulf', text: 'Stopped by the mangroves; they turn back.' },
    { when: '21 April 1861', place: 'The Dig Tree', text: 'They find the depot abandoned that morning.' },
    { when: 'About 30 June 1861', place: 'Cooper Creek', text: 'Burke and Wills die.' },
    { when: '15 September 1861', place: 'Cooper Creek', text: 'King is found alive.' },
  ],
  sources: [
    { title: 'Wikipedia: Burke and Wills expedition', url: 'https://en.wikipedia.org/wiki/Burke_and_Wills_expedition' },
    { title: 'National Museum of Australia: Burke and Wills cross the continent', url: 'https://digital-classroom.nma.gov.au/defining-moments/burke-and-wills-cross-continent' },
    { title: 'The Burke and Wills Web', url: 'https://www.burkeandwills.net.au/' },
    { title: 'Wikipedia: Yandruwandha', url: 'https://en.wikipedia.org/wiki/Yandruwandha' },
  ],
  ready: true,
};
