import type { RouteDef } from '../types';

/** The Dandi March, 12 March to 6 April 1930: every night halt, from the march's day-by-day record. */
const HALTS: [string, number, number][] = [
  // name, km, day reached
  ['Aslali', 21, 1],
  ['Navagam', 34, 2],
  ['Matar', 54, 3],
  ['Nadiad', 78, 4],
  ['Anand', 101, 5],
  ['Borsad', 124, 7],
  ['Kareli', 155, 8],
  ['Ankhi', 170, 10],
  ['Amod', 186, 11],
  ['Samni', 203, 12],
  ['Derol', 221, 14],
  ['Ankleshwar', 243, 15],
  ['Mangrol', 276, 16],
  ['Umrachhi', 294, 17],
  ['Bhatgam', 310, 18],
  ['Delad', 322, 19],
  ['Surat', 333, 21],
  ['Vanz', 346, 22],
  ['Navsari', 367, 23],
  ['Matwad', 378, 24],
  ['Dandi', 387, 25],
];
const LABELLED = new Set(['Nadiad', 'Kareli', 'Ankleshwar', 'Surat', 'Dandi']);

export const dandi: RouteDef = {
  id: 'dandi',
  name: 'The Dandi March',
  era: '1930',
  hook: '78 marchers walk to the sea to break the salt law with a handful of salt.',
  group: 'india',
  km: 387,
  record: 'dated',
  region: 'india',
  ink: '#9fd3e6',
  places: [{ name: 'Sabarmati', km: 0, at: 0, label: true }, ...HALTS.map(([name, km], i) => ({ name, km, at: i + 1, ...(LABELLED.has(name) ? { label: true } : {}) }))],
  signature: {
    title: 'Handfuls of salt',
    note: 'The march stopped for the night at 21 villages and towns on its way to the sea. Each halt you reach adds a grain to your handful.',
    mark: 'crystal',
    marks: HALTS.map(([name, km]) => ({ km, name })),
  },
  then: { who: 'The marchers', totalDays: 25, places: HALTS.map(([name, , theirDay]) => ({ name, theirDay })), source: 'From the march’s day-by-day itinerary, 12 March to 5 April 1930.' },
  pages: [
    {
      km: 0,
      title: 'The ashram road',
      line: 'Before dawn, 78 marchers leave the ashram on the Sabarmati.',
      page: [
        'On 12 March 1930 Gandhi left Sabarmati Ashram, outside Ahmedabad, with 78 companions. He chose them from the ashram’s own residents, trained to his discipline; most were in their twenties.',
        'Their aim was the sea at Dandi, about 387 km south, where they would make salt and so break the law that taxed it.',
      ],
      deeper: {
        title: 'Why salt',
        text: 'British India taxed salt and made it a crime to make or sell it outside the government’s monopoly. The tax was small, but everyone paid it, the poorest most of all in proportion to what they had, and salt was something anyone could make from the sea with a pan and the sun. That made it a law anyone could break, in public and without violence. Many in the Congress leadership doubted it at first. Some thought it too trivial; Vallabhbhai Patel argued for a refusal to pay land revenue instead. Gandhi held to salt because it joined the poorest villager to the national cause.',
      },
    },
    {
      km: 34,
      title: 'Kheda country',
      line: 'Through the villages of Kheda, where the land tax had been fought before.',
      page: [
        'The first nights were spent at Aslali and Navagam, then Matar. Kheda district had a record of resistance: its farmers had refused land revenue in 1918.',
        'Patel, who had planned the route and its halts, was arrested at Ras on 7 March, before the march set out.',
      ],
    },
    {
      km: 78,
      title: 'Nadiad',
      line: 'Nadiad, day four, and the crowds grow at every village.',
      page: ['Each day began early, with miles walked before the heat. At each halt Gandhi spoke, often urging village officials to resign their posts, and many did.'],
    },
    {
      km: 124,
      title: 'Borsad',
      line: 'A rest day at Anand, then Borsad.',
      page: ['After a rest day at Anand, the march reached Borsad on day seven. Gandhi was 60, and he walked the whole way, stopping on set rest days.'],
    },
    {
      km: 155,
      title: 'Across the Mahi',
      line: 'Across the wide, tidal Mahi to Kareli.',
      page: ['On day eight the marchers crossed the Mahi near its mouth, where the tide decides when a river can be forded, and rested at Kareli on the far side.'],
    },
    {
      km: 203,
      title: 'The Broach villages',
      line: 'Ankhi, Amod and Samni, in the cotton country of Broach.',
      page: ['South of the Mahi the march crossed the cotton fields of Broach district, now Bharuch. Reporters followed on foot and by car; newsreel cameras came too.'],
      deeper: {
        title: 'A march made for the press',
        text: 'Gandhi understood that the march was a message as much as an act. Its route was announced in advance, its daily progress was reported across India and abroad, and its slow pace gave newspapers a story for more than three weeks. The New York Times put the salt-making on its front page on 6 and 7 April.',
      },
    },
    {
      km: 243,
      title: 'The Narmada',
      line: 'Across the Narmada to Ankleshwar.',
      page: ['On day 15 they crossed the Narmada, the widest river on the road, and spent the night at Ankleshwar.'],
    },
    {
      km: 294,
      title: 'The southern plain',
      line: 'Mangrol, Umrachhi, Bhatgam: the last villages before Surat.',
      page: ['The march went on through small villages south of the Narmada, with a rest day at Delad, before turning towards the Tapi and Surat.'],
    },
    {
      km: 333,
      title: 'Surat',
      line: 'Across the Tapi into Surat, a great old port.',
      page: ['On 1 April the marchers crossed the Tapi into Surat, once the Mughal Empire’s chief port, where the East India Company set up its first major trading post in the 1610s.'],
    },
    {
      km: 367,
      title: 'Navsari',
      line: 'Navsari, and the sea is near.',
      page: ['From Vanz to Navsari and Matwad, the road ran down to the salt flats of the coast.'],
    },
    {
      km: 387,
      title: 'Dandi',
      line: 'At Dandi, a handful of salty mud, and a law broken.',
      page: [
        'The march reached Dandi on 5 April. Early on 6 April, after prayers, Gandhi picked up a lump of salty mud from the shore, and so broke the salt law.',
        'Across India people made and sold salt in defiance. By the end of the campaign more than 60,000 had been jailed. Gandhi was arrested on 5 May at Karadi, near Dandi.',
      ],
      deeper: {
        title: 'What it won, and what it didn’t',
        text: 'On 21 May, at the Dharasana salt works, about 2,500 marchers led by Sarojini Naidu walked up to the police lines and were beaten down, row after row, without fighting back. The American reporter Webb Miller’s account ran in newspapers around the world. The campaign won no quick concession: the salt tax stayed, and there was no self-rule. In March 1931 the Gandhi–Irwin Pact ended it in exchange for the release of prisoners and talks in London that achieved little. But the march changed how the world, and many Indians, saw British rule, and historians still weigh it as a turning point in the movement rather than a victory in itself.',
      },
    },
  ],
  chronicle: [
    { when: '7 March 1930', place: 'Ras', text: 'Vallabhbhai Patel, who planned the route, is arrested.' },
    { when: '12 March', place: 'Sabarmati', text: 'Gandhi and 78 marchers set out.' },
    { when: '19 March', place: 'Kareli', text: 'Across the Mahi.' },
    { when: '26 March', place: 'Ankleshwar', text: 'Across the Narmada.' },
    { when: '1 April', place: 'Surat', text: 'Across the Tapi.' },
    { when: '5 April', place: 'Dandi', text: 'The march reaches the sea.' },
    { when: '6 April', place: 'Dandi', text: 'Gandhi picks up salt and breaks the law.' },
    { when: '5 May', place: 'Karadi', text: 'Gandhi is arrested.' },
    { when: '21 May', place: 'Dharasana', text: 'Marchers at the salt works are beaten by police.' },
    { when: '5 March 1931', place: 'Delhi', text: 'The Gandhi–Irwin Pact ends the campaign.' },
  ],
  sources: [
    { title: 'Wikipedia: Salt March', url: 'https://en.wikipedia.org/wiki/Salt_March' },
    { title: 'Wikipedia: Dharasana Satyagraha', url: 'https://en.wikipedia.org/wiki/Dharasana_Satyagraha' },
    { title: 'Gandhi Heritage Portal: after the Dandi March', url: 'https://www.gandhiheritageportal.org/post-dandi-march-events' },
    { title: 'Britannica: Salt March', url: 'https://www.britannica.com/event/Salt-March' },
    { title: 'NCERT: Dandi March', url: 'https://bhuvan-app1.nrsc.gov.in/mhrd_ncert/help/Dandi_march.pdf' },
  ],
  ready: true,
};
