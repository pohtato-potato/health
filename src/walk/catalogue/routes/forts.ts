import type { RouteDef } from '../types';

/**
 * Shivaji's life told fort by fort along the Sahyadri, in the order of what happened at each: born at Shivneri,
 * crowned at Raigad. No record of a walk; each fort carries its own dated event.
 */
export const forts: RouteDef = {
  id: 'forts',
  name: 'The Maratha forts',
  era: '1630–1674',
  hook: 'Shivaji’s life told fort by fort along the Sahyadri, from his birth to his crown.',
  group: 'india',
  km: 463,
  record: 'none',
  region: 'india',
  ink: '#c9a0dc',
  places: [
    { name: 'Shivneri', km: 0, at: 0, label: true },
    { name: 'Pune', km: 98, at: 1, label: true },
    { name: 'Torna', km: 146, at: 2 },
    { name: 'Rajgad', km: 155, at: 3, label: true },
    { name: 'Bhor', km: 183, at: 4 },
    { name: 'Wai', km: 212, at: 5 },
    { name: 'Mahabaleshwar', km: 244, at: 6 },
    { name: 'Pratapgad', km: 256, at: 7, label: true },
    { name: 'Wai again', km: 298, at: 8 },
    { name: 'Purandar', km: 347, at: 9, label: true },
    { name: 'Sinhagad', km: 379, at: 10 },
    { name: 'Mahad', km: 442, at: 11 },
    { name: 'Raigad', km: 463, at: 12, label: true },
  ],
  signature: {
    title: 'The seven forts',
    note: 'Seven forts, seven turns in one life. Each one you reach is stamped with what happened there.',
    mark: 'milecastle',
    marks: [
      { km: 1, name: 'Shivneri: born, 1630' },
      { km: 146, name: 'Torna: the first fort, about 1646' },
      { km: 155, name: 'Rajgad: the first capital' },
      { km: 256, name: 'Pratapgad: Afzal Khan, 1659' },
      { km: 347, name: 'Purandar: the treaty, 1665' },
      { km: 379, name: 'Sinhagad: the night assault, 1670' },
      { km: 463, name: 'Raigad: the crown, 1674' },
    ],
  },
  pages: [
    {
      km: 0,
      title: 'The birthplace',
      line: 'Shivneri, above Junnar, where Shivaji was born.',
      page: [
        'Shivaji was born in the hill fort of Shivneri, above the town of Junnar. Maharashtra marks the day as 19 February 1630; an older tradition gives a date in 1627.',
        'His father, Shahaji, was a general who served the sultans of Ahmadnagar and later Bijapur. His mother, Jijabai, raised him largely apart from his father.',
      ],
    },
    {
      km: 50,
      title: 'Three empires',
      line: 'Down from the hills: a land fought over by three powers.',
      page: ['The western Deccan of Shivaji’s boyhood lay between the Mughal Empire to the north and the sultanates of Bijapur and Golconda to the south and east. On the coast were the Portuguese and the Siddis of Janjira.'],
      deeper: {
        title: 'A state between empires',
        text: 'Shivaji began as the son of a Bijapur general, managing his father’s estate around Pune. He built a kingdom by playing the great powers against each other. He took forts from Bijapur while Bijapur was weak, raided the Mughals, and made terms when he had to and broke them when he could. Historians argue over how to read him. Maharashtra’s politics have made him a regional and a Hindu hero; others stress how much his state borrowed from the sultanates around it, its administration, its Persian terms, the Muslim officers in his service. Both are part of the record.',
      },
    },
    {
      km: 98,
      title: 'Pune',
      line: 'Pune, his father’s estate, where he grew up.',
      page: ['Pune was part of Shahaji’s estate, and Shivaji grew up here with Jijabai and his father’s administrator, Dadoji Konddeo.'],
    },
    {
      km: 146,
      title: 'The boy’s first fort',
      line: 'Torna, the fort he took as a teenager.',
      page: ['Around 1646 (accounts range from 1645 to 1647), the teenage Shivaji took Torna from Bijapur’s garrison. By tradition he found treasure buried there and spent it on building the next fort along the ridge.'],
    },
    {
      km: 155,
      title: 'The first capital',
      line: 'Rajgad, his capital for more than twenty years.',
      page: ['Rajgad, on its three spurs, was Shivaji’s capital for more than two decades, until he moved the court to Raigad. Its name means the king of forts.'],
      deeper: {
        title: 'Forts as a system',
        text: 'Shivaji’s state was held together by forts: hundreds of them, on hilltops a day’s march apart and on islands along the coast. Each had its garrison and its officers, often chosen so that no one man controlled it. A field army could lose a battle and fall back into the hills; an invader had to besiege fort after fort through the monsoon. In 2025 twelve Maratha forts, Rajgad among them, were inscribed together on UNESCO’s World Heritage List as the Maratha Military Landscapes.',
      },
    },
    {
      km: 212,
      title: 'Wai',
      line: 'South to Wai on the Krishna, where Afzal Khan made camp.',
      page: ['In 1659 Bijapur sent its general Afzal Khan with a large army to crush Shivaji. He camped at Wai, and the two sides arranged to meet in person below Pratapgad.'],
    },
    {
      km: 256,
      title: 'The tiger’s claws',
      line: 'At Pratapgad, the meeting with Afzal Khan.',
      page: [
        'On 10 November 1659 Shivaji and Afzal Khan met below Pratapgad, each with a few guards. Each side says the other struck first. Shivaji killed him, by the most-told account with a set of steel tiger claws hidden in his hand.',
        'Shivaji’s men then fell on Afzal Khan’s leaderless army in the forest. Afzal Khan’s tomb lies at the foot of the fort.',
      ],
    },
    {
      km: 298,
      title: 'After Pratapgad',
      line: 'Bijapur’s army broken, and Shivaji’s name made.',
      page: ['The victory gave Shivaji guns, horses and treasure, and a name across the Deccan. The Mughals now took him seriously too.'],
    },
    {
      km: 347,
      title: 'The treaty',
      line: 'Purandar, where Shivaji had to give up 23 forts.',
      page: [
        'In 1665 the Mughal general Jai Singh besieged Purandar. Its commander, Murarbaji Deshpande, was killed defending it.',
        'On 11 June 1665 Shivaji agreed terms: 23 forts given up, 12 kept, and a visit to the emperor’s court at Agra, which ended in his escape the next year.',
      ],
    },
    {
      km: 379,
      title: 'The lion’s fort',
      line: 'Sinhagad, taken back by night, and its commander killed.',
      page: [
        'In February 1670 Tanaji Malusare led a night assault up the cliffs of Kondhana, held for the Mughals. The fort was taken and Tanaji was killed.',
        'By tradition Shivaji mourned that he had gained the fort but lost the lion, and the fort became Sinhagad, the lion’s fort.',
      ],
    },
    {
      km: 420,
      title: 'Down the ghats',
      line: 'Down the ghats towards the coast.',
      page: ['The road drops from the plateau down the western ghats into the Konkan, where the rivers run short and fast to the sea.'],
    },
    {
      km: 463,
      title: 'The crown',
      line: 'Raigad, where Shivaji was crowned king.',
      page: [
        'On 6 June 1674 Shivaji was crowned Chhatrapati at Raigad. The ceremony was led by Gaga Bhatt, a scholar from Varanasi; a second coronation followed in September.',
        'Shivaji died at Raigad in April 1680. The Mughals took it in 1689 and the British in 1818.',
      ],
      deeper: {
        title: 'Why a coronation',
        text: 'By 1674 Shivaji ruled a real state, but in law he was still a rebel against Bijapur and the Mughals. A coronation by the rites of the old Hindu kings made him a sovereign in his own right, able to make treaties as an equal. It also set him above the other Maratha families, some of whom ranked themselves above his own. Gaga Bhatt supplied a genealogy linking his family to the Sisodia Rajputs. Historians read the crowning as a claim of legitimacy as much as of faith.',
      },
    },
  ],
  chronicle: [
    { when: '19 February 1630', place: 'Shivneri', text: 'Born, by the date Maharashtra keeps.' },
    { when: 'About 1646', place: 'Torna', text: 'Takes his first fort; some accounts say 1645 or 1647.' },
    { when: '10 November 1659', place: 'Pratapgad', text: 'Kills Afzal Khan.' },
    { when: '11 June 1665', place: 'Purandar', text: 'Makes terms with Jai Singh.' },
    { when: 'February 1670', place: 'Sinhagad', text: 'Tanaji Malusare takes the fort and dies.' },
    { when: '6 June 1674', place: 'Raigad', text: 'Crowned Chhatrapati.' },
    { when: 'April 1680', place: 'Raigad', text: 'Dies.' },
    { when: 'July 2025', place: 'Paris', text: 'Twelve Maratha forts inscribed as a World Heritage Site.' },
  ],
  sources: [
    { title: 'Wikipedia: Shivaji', url: 'https://en.wikipedia.org/wiki/Shivaji' },
    { title: 'Wikipedia: Rajgad', url: 'https://en.wikipedia.org/wiki/Rajgad' },
    { title: 'Wikipedia: Battle of Pratapgarh', url: 'https://en.wikipedia.org/wiki/Battle_of_Pratapgarh' },
    { title: 'Wikipedia: Sinhagad', url: 'https://en.wikipedia.org/wiki/Sinhagad' },
    { title: 'Wikipedia: Raigad Fort', url: 'https://en.wikipedia.org/wiki/Raigad_Fort' },
    { title: 'UN India: Maratha Military Landscapes inscribed on the World Heritage List', url: 'https://india.un.org/en/node/297920' },
    { title: 'Scroll: 12 Maratha forts added to the UNESCO list', url: 'https://scroll.in/latest/1084447/12-maratha-forts-added-to-unesco-world-heritage-list' },
  ],
  ready: true,
};
