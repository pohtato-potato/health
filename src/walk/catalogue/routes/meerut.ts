import type { RouteDef } from '../types';

/** The night of 10–11 May 1857: the rising at Meerut and the road to Delhi, about forty miles. */
const KM = 74;

export const meerut: RouteDef = {
  id: 'meerut',
  name: 'The night ride from Meerut',
  era: '1857',
  hook: 'Sepoys rise at Meerut and ride through the night to Delhi.',
  group: 'india',
  km: KM,
  record: 'dated',
  region: 'india',
  ink: '#e88a7a',
  places: [
    { name: 'Meerut', km: 0, at: 0, label: true },
    { name: 'Begumabad', km: 22, at: 1 },
    { name: 'Muradnagar', km: 37, at: 2 },
    { name: 'Ghaziabad', km: 52, at: 3, label: true },
    { name: 'Shahdara', km: 68, at: 4 },
    { name: 'The bridge of boats', km: 73, at: 5 },
    { name: 'Delhi', km: KM, at: 6, label: true },
  ],
  signature: {
    title: 'The hours of the night',
    note: 'Nobody timed the ride. Each mark is one of the night’s hours, from the evening rising at Meerut to the morning at Delhi.',
    mark: 'moon',
    marks: Array.from({ length: 12 }, (_, i) => ({ km: Math.round(((i + 1) * KM * 10) / 12) / 10 })),
  },
  then: { who: 'The rebel cavalry', totalDays: 1, places: [{ name: 'Delhi', theirDay: 1 }], source: 'They left Meerut on the evening of 10 May 1857 and reached Delhi early on 11 May.' },
  pages: [
    {
      km: 0,
      title: 'The parade',
      line: 'At Meerut, 85 cavalrymen are shackled in front of the whole garrison.',
      page: [
        'On 24 April 1857, 90 troopers of the 3rd Bengal Light Cavalry were ordered to take the new rifle cartridges at drill. All but five refused.',
        'On 9 May the 85 were court-martialled. Most were given ten years’ hard labour. The whole garrison was paraded to watch them stripped of their uniforms and shackled, and as they were marched to jail they shouted at their comrades for not standing with them.',
      ],
      deeper: {
        title: 'The cartridges',
        text: 'The new Enfield rifle used paper cartridges greased to load easily, and soldiers tore them open with their teeth. Rumours spread that the grease was cow fat, which Hindus would not touch, or pig fat, which Muslims would not. The Company changed the drill and let sepoys grease their own, but it was too late to be believed. Historians now stress that what mattered was the belief, set among older grievances: low pay, new rules for service overseas, annexations like Awadh’s in 1856, and a sense that the Company meant to change the sepoys’ way of life. The historian Kim Wagner argues there is little evidence that many greased cartridges were ever issued.',
      },
    },
    {
      km: 8,
      title: 'Sunday evening',
      line: 'On Sunday evening, 10 May, the garrison rises and breaks open the jail.',
      page: [
        'Some sepoys had warned British officers that the prisoners would be freed by force; nothing was done. On the evening of Sunday 10 May, as officers dressed for church, the Indian regiments rose, led by the 3rd Cavalry, and freed the 85.',
        'Officers who tried to stop them were killed, and houses in the lines were attacked. Four British civilian men, eight women and eight children died that night, and about 50 Indians, some of them servants who tried to hide their employers. Other sepoys led their own officers and families to safety.',
      ],
    },
    {
      km: 20,
      title: 'The road to Delhi',
      line: 'Through the night, the riders take the road to Delhi.',
      page: [
        'Most of the rebels headed for Delhi that night, about forty miles away. The British at Meerut had about 2,000 soldiers of their own, but no real pursuit followed.',
        'Nobody recorded the ride hour by hour. This road follows the old way through Begumabad, Muradnagar and Ghaziabad.',
      ],
    },
    {
      km: 37,
      title: 'Why Delhi',
      line: 'Why Delhi: an old emperor, and no British regiment.',
      page: [
        'Delhi was the ancient capital and the seat of the last Mughal emperor, Bahadur Shah Zafar, a poet in his eighties who ruled nothing beyond his palace and lived on a Company pension.',
        'It had no British regiment, only Indian ones. A rising that wanted a name to fight under could find one there.',
      ],
    },
    {
      km: 52,
      title: 'Ghaziabad',
      line: 'Past Ghaziabad in the dark, the river ahead.',
      page: ['Ghaziabad, now a city of well over a million, was then a small town on the road, founded in the 18th century by a Mughal official.'],
    },
    {
      km: 68,
      title: 'The Yamuna',
      line: 'At dawn, the Yamuna and the walls of Delhi across it.',
      page: ['From Shahdara the road met the Yamuna. On the far bank stood the walls of Shahjahanabad and the Red Fort, built by Shah Jahan two centuries before.'],
    },
    {
      km: 73,
      title: 'The bridge of boats',
      line: 'Across the river on the bridge of boats, into the city.',
      page: ['Early on 11 May the first riders crossed the river, by most accounts on the bridge of boats, and made for the palace.'],
    },
    {
      km: KM,
      title: 'The Red Fort',
      line: 'Under the emperor’s windows, the riders call on him to lead them.',
      page: [
        'They gathered beneath Bahadur Shah’s windows and called on him to lead them. At first he did nothing. Through the day, British officials and families, Indian Christians and others were killed in the city.',
        'That afternoon the nine British officers holding the Delhi magazine blew it up rather than let it be taken; six of them survived. The next day the emperor held court and accepted the rebels’ allegiance. Most accounts say he was pressed into it.',
      ],
      deeper: {
        title: 'How one night became 1857',
        text: 'Meerut alone might have been one more mutiny. Delhi made it a cause: a rising with an emperor, however unwilling, could call itself a restoration. Over the following weeks regiments rose across the north, and landholders and dispossessed rulers joined them. The British retook Delhi in September 1857 after a long siege, and their revenge on the city was terrible. Bahadur Shah was tried, exiled to Rangoon, and died there in 1862; his sons were shot by a British officer. In 1858 the Crown took India from the Company. What to call it, mutiny, rebellion or war of independence, is still argued over.',
      },
    },
  ],
  chronicle: [
    { when: '24 April 1857', place: 'Meerut', text: '85 troopers of the 3rd Light Cavalry refuse the cartridges.' },
    { when: '9 May', place: 'Meerut', text: 'They are court-martialled and shackled before the garrison.' },
    { when: 'Evening, 10 May', place: 'Meerut', text: 'The garrison rises and frees them.' },
    { when: 'Night, 10–11 May', place: 'The Delhi road', text: 'The rebels ride for Delhi.' },
    { when: 'Early 11 May', place: 'Delhi', text: 'They call on Bahadur Shah Zafar to lead them.' },
    { when: '11 May', place: 'Delhi', text: 'The magazine is blown up by its British officers.' },
    { when: '12 May', place: 'Delhi', text: 'The emperor accepts the rebels’ allegiance.' },
  ],
  sources: [
    { title: 'Wikipedia: Indian Rebellion of 1857', url: 'https://en.wikipedia.org/wiki/Indian_Rebellion_of_1857' },
    { title: 'Wikipedia: Bahadur Shah Zafar', url: 'https://en.wikipedia.org/wiki/Bahadur_Shah_Zafar' },
    { title: 'Wikipedia: Siege of Delhi', url: 'https://en.wikipedia.org/wiki/Siege_of_Delhi' },
    { title: 'Wikipedia: Ghaziabad', url: 'https://en.wikipedia.org/wiki/Ghaziabad' },
    { title: 'Britannica: Indian Mutiny', url: 'https://www.britannica.com/event/Indian-Mutiny' },
  ],
  ready: true,
};
