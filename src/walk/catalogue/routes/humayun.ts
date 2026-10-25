import type { RouteDef } from '../types';

/**
 * Humayun's flight, 1540–1544: the second Mughal emperor, beaten by Sher Shah, loses India and wanders through the
 * Punjab, Sindh and the Thar to Kandahar and the Shah of Persia. Dated at its events; the road between is estimated.
 * Two memoirs from his household, his sister Gulbadan's and his ewer-bearer Jauhar's, tell much of it.
 */
export const humayun: RouteDef = {
  id: 'humayun',
  name: 'Humayun’s flight',
  era: '1540–1544',
  hook: 'An emperor loses India, his son is born on the run, and a Persian shah decides his fate.',
  group: 'india',
  km: 6218,
  record: 'estimated',
  region: 'asia',
  ink: '#c8a0d8',
  places: [
    { name: 'Kannauj', km: 0, at: 0, label: true },
    { name: 'Agra', km: 218, at: 1 },
    { name: 'Delhi', km: 426, at: 2 },
    { name: 'Lahore', km: 915, at: 3, label: true },
    { name: 'Multan', km: 1274, at: 4 },
    { name: 'Bhakkar', km: 1704, at: 5 },
    { name: 'Sehwan', km: 1905, at: 6 },
    { name: 'Jaisalmer', km: 2257, at: 7 },
    { name: 'Jodhpur', km: 2513, at: 8, label: true },
    { name: 'Umerkot', km: 2909, at: 9, label: true },
    { name: 'Thatta', km: 3132, at: 10 },
    { name: 'The Bolan Pass', km: 3754, at: 11 },
    { name: 'Mastung', km: 3842, at: 12, label: true },
    { name: 'Sistan', km: 4429, at: 13 },
    { name: 'Herat', km: 4861, at: 14, label: true },
    { name: 'Mashhad', km: 5229, at: 15 },
    { name: 'Qazvin', km: 6218, at: 16, label: true },
  ],
  signature: {
    title: 'Nights of the exile',
    note: 'The places the exiled court stopped, from the memoirs of his sister and his ewer-bearer.',
    mark: 'moon',
    marks: [
      { km: 915, name: 'Lahore, the brothers quarrel' },
      { km: 1704, name: 'Bhakkar, on the Indus' },
      { km: 1905, name: 'Sindh, the wedding' },
      { km: 2513, name: 'Jodhpur, turned away' },
      { km: 2909, name: 'Umerkot, a son is born' },
      { km: 3842, name: 'Mastung, the boy left behind' },
      { km: 4861, name: 'Herat, a welcome' },
      { km: 6218, name: 'Qazvin, the Shah' },
    ],
  },
  years: { theirs: 4, note: '1540 to 1544 to reach the Shah, and eleven more before he was back in Delhi' },
  pages: [
    {
      km: 0,
      title: 'Kannauj',
      line: 'At Kannauj, Sher Shah beats the Mughal army, and Humayun runs.',
      page: [
        'Humayun had inherited his father Babur’s new empire in 1530 and could not hold it. In June 1539 Sher Shah Suri broke a truce and routed him at Chausa; Humayun escaped by swimming the Ganga.',
        'On 17 May 1540 Sher Shah beat him again near Kannauj. The second Mughal emperor fled west with what was left of his court.',
      ],
      deeper: {
        title: 'Sher Shah, the man who beat him',
        text: 'Sher Shah Suri, an Afghan from Sasaram, ruled north India for only five years, from 1540 to 1545, but much of what the Mughals are remembered for began with him. He relaid the road from Bengal to the northwest, issued a standard silver coin, the rupiya, and had land measured so that revenue could be assessed on what it produced. When the Mughals came back, they kept most of it. Historians argue over how much was new and how much he took over from those before him; either way, the empire Humayun later won back ran on Sher Shah’s machinery.',
      },
    },
    {
      km: 218,
      title: 'Agra abandoned',
      line: 'Through Agra and Delhi without stopping.',
      page: ['The court did not try to hold Agra or Delhi. Treasure, women and records went with the retreat, and many of the nobles went over to Sher Shah.'],
    },
    {
      km: 600,
      title: 'The brothers',
      line: 'His brothers would not stand with him.',
      page: ['Humayun’s three half-brothers, Kamran, Askari and Hindal, each had lands and armies of their own. Kamran held Kabul and the Punjab and would not risk them for Humayun. The brothers’ quarrels did as much to ruin him as Sher Shah did.'],
    },
    {
      km: 915,
      title: 'Lahore',
      line: 'At Lahore the brothers meet, and part.',
      page: [
        'In 1540 the brothers met at Lahore. Kamran left for Kabul; Humayun refused advice to have him killed.',
        'Sikh accounts written over a century later say Humayun visited Guru Angad near the road at this time.',
      ],
    },
    {
      km: 1274,
      title: 'Down the Indus',
      line: 'South down the Indus, looking for a kingdom to borrow.',
      page: ['With no way back east, Humayun went south towards Sindh, hoping its ruler would help him. He was refused help again and again.'],
    },
    {
      km: 1704,
      title: 'Bhakkar',
      line: 'Bhakkar, a fort on an island in the Indus.',
      page: ['Bhakkar’s fort stands on a rocky island in the Indus. Sindh’s ruler, Shah Husain Arghun, kept the exile at arm’s length while his men camped and went hungry on the bank.'],
    },
    {
      km: 1905,
      title: 'A wedding in Sindh',
      line: 'In Sindh, Humayun marries Hamida Banu.',
      page: [
        'In September 1541, at Paat in Sindh, Humayun married Hamida Banu, a girl of about fourteen. By his sister Gulbadan’s account, Hamida refused him for weeks before she agreed.',
        'She would be the mother of Akbar.',
      ],
    },
    {
      km: 2257,
      title: 'The Thar',
      line: 'Into the Thar desert, towards Marwar.',
      page: ['In 1542 Humayun turned east across the desert towards Marwar, whose raja, Maldeo of Jodhpur, had offered help.'],
    },
    {
      km: 2513,
      title: 'Jodhpur',
      line: 'Near Jodhpur, the promised help turns into a trap.',
      page: [
        'By most accounts Maldeo, now courted by Sher Shah, turned against him. Humayun fled back across the desert in the hot season.',
        'His ewer-bearer Jauhar, who later wrote a memoir, tells of wells so deep and scarce that men died of thirst and fought over the water.',
      ],
    },
    {
      km: 2909,
      title: 'Umerkot',
      line: 'At Umerkot, Akbar is born to a king without a kingdom.',
      page: [
        'The Rana of Umerkot took the party in. There, on 15 October 1542, Hamida gave birth to a son, Akbar.',
        'By Jauhar’s account, Humayun had nothing to give his followers but a pod of musk, which he broke and shared, hoping the boy’s fame would spread like its scent.',
      ],
    },
    {
      km: 3132,
      title: 'Sindh again',
      line: 'Back through Sindh, and across the Indus for the last time.',
      page: ['There was no future in Sindh. On 11 July 1543 Humayun crossed the Indus and turned northwest towards Kandahar, held by his brother Askari.'],
    },
    {
      km: 3754,
      title: 'The Bolan Pass',
      line: 'Up through the Bolan Pass towards Kandahar.',
      page: ['The way to Kandahar ran up the Bolan Pass, the old road between the Indus plain and the Afghan highlands.'],
    },
    {
      km: 3842,
      title: 'Mastung',
      line: 'Near Quetta, the baby is left behind.',
      page: [
        'Camped near Mastung, by today’s Quetta, Humayun heard that his brother Askari was coming to seize him. He and Hamida fled west with a few dozen followers, leaving the infant Akbar behind, about fourteen months old.',
        'Askari took the boy to Kandahar and raised him in his household: the uncle who had turned against his father.',
      ],
    },
    {
      km: 4429,
      title: 'Through Sistan',
      line: 'West through the desert of Sistan, a fugitive again.',
      page: ['Humayun never reached Kandahar on the way out. He fled west through the deserts of Sistan towards Persian ground.'],
    },
    {
      km: 4861,
      title: 'Herat',
      line: 'Herat, and a royal welcome from the Shah’s governor.',
      page: ['At Herat, the old Timurid capital, now held for the Safavid Shah of Persia, Humayun was received as a guest of the Shah. He was shown its gardens, colleges and libraries, the culture his own ancestors had built.'],
    },
    {
      km: 5229,
      title: 'Mashhad',
      line: 'West across Khorasan, through Mashhad.',
      page: ['The road west went through Mashhad and the long steppe of Khorasan towards the Shah’s summer camp.'],
    },
    {
      km: 5700,
      title: 'Across Persia',
      line: 'Across Persia to meet the Shah.',
      page: ['It took months to reach the Shah. Humayun travelled as a royal guest, but he knew he was also a bargaining piece.'],
    },
    {
      km: 6218,
      title: 'The Shah',
      line: 'Near Qazvin, Humayun meets Shah Tahmasp.',
      page: [
        'In July 1544 Humayun met Shah Tahmasp, in the Qazvin country (some accounts say Soltaniyeh). Tahmasp pressed him to profess Shia Islam, and Humayun, by the accounts, gave way.',
        'The Shah lent him about 12,000 cavalry, on the promise that Kandahar would be Persia’s. In 1545 Humayun took Kandahar and Kabul, and in July 1555, after years of fighting his brothers, he was back in Delhi. He died six months later, after a fall on the stairs of his library.',
      ],
      deeper: {
        title: 'The price of the alliance',
        text: 'Persian help came with conditions. Humayun had to accept Shia forms of Islam while a guest, and to give up Kandahar, which he took back by surprise soon after handing it over, against his word. Persia gave more than soldiers: Persian painters joined his court, and the Mughal school of painting grew from them. Persian became the language of Mughal government. Historians argue over how much of Mughal culture began in this exile, but the empire that Akbar built carried Persia in it.',
      },
    },
  ],
  chronicle: [
    { when: 'June 1539', place: 'Chausa', text: 'Sher Shah breaks a truce and routs Humayun.' },
    { when: '17 May 1540', place: 'Kannauj', text: 'Defeated again; the flight begins.' },
    { when: 'September 1541', place: 'Paat, Sindh', text: 'Marries Hamida Banu.' },
    { when: '15 October 1542', place: 'Umerkot', text: 'Akbar is born.' },
    { when: '11 July 1543', place: 'The Indus', text: 'Crosses the Indus for Kandahar.' },
    { when: 'July 1544', place: 'Qazvin country', text: 'Meets Shah Tahmasp.' },
    { when: '18 November 1545', place: 'Kabul', text: 'Enters Kabul and finds Akbar again.' },
    { when: '23 July 1555', place: 'Delhi', text: 'Back on the throne.' },
    { when: 'January 1556', place: 'Delhi', text: 'Dies after a fall.' },
  ],
  sources: [
    { title: 'Wikipedia: Humayun', url: 'https://en.wikipedia.org/wiki/Humayun' },
    { title: 'Wikipedia: Hamida Banu Begum', url: 'https://en.wikipedia.org/wiki/Hamida_Banu_Begum' },
    { title: 'Gulbadan Begum, Humayun-nama (Columbia University text)', url: 'https://mail.franpritchett.com/00litlinks/gulbadan/part09.html' },
    { title: 'Wikipedia: Jauhar Aftabchi', url: 'https://en.wikipedia.org/wiki/Jauhar_Aftabchi' },
    { title: 'Wikipedia: Maldeo Rathore', url: 'https://en.wikipedia.org/wiki/Maldeo_Rathore' },
    { title: 'Wikipedia: Sher Shah', url: 'https://en.wikipedia.org/wiki/Sher_Shah' },
    { title: 'The Friday Times: Humayun in Sindh', url: 'https://thefridaytimes.com/20-Jan-2017/humayun-in-sindh-ii' },
  ],
  ready: true,
};
