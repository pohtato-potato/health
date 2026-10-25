import type { RouteDef } from '../types';

/**
 * Shivaji's escape from Agra, 1666. The escape's date is firm; his road home is not. This line is a reconstruction:
 * north to Mathura, as the Maratha chronicles have it, then the direct road south through Malwa and Khandesh.
 */
export const shivaji: RouteDef = {
  id: 'shivaji',
  name: "Shivaji's escape from Agra",
  era: '1666',
  hook: "Out of Aurangzeb's Agra, by the most-told account in a basket of sweets.",
  group: 'india',
  km: 1450,
  record: 'estimated',
  region: 'india',
  ink: '#f0a070',
  places: [
    { name: 'Agra', km: 0, at: 0, label: true },
    { name: 'Mathura', km: 53, at: 1, label: true },
    { name: 'Dholpur', km: 154, at: 2 },
    { name: 'Gwalior', km: 221, at: 3, label: true },
    { name: 'Shivpuri', km: 334, at: 4 },
    { name: 'Guna', km: 438, at: 5 },
    { name: 'Indore', km: 727, at: 6, label: true },
    { name: 'The Narmada', km: 815, at: 7 },
    { name: 'Burhanpur', km: 962, at: 8, label: true },
    { name: 'Aurangabad', km: 1166, at: 9 },
    { name: 'Ahmednagar', km: 1286, at: 10 },
    { name: 'Pune', km: 1411, at: 11, label: true },
    { name: 'Rajgad', km: 1450, at: 12, label: true },
  ],
  signature: {
    title: 'Safe houses',
    note: 'No record names the doors that opened for him on the way home. Each mark is one more of them, left behind.',
    mark: 'house',
    marks: Array.from({ length: 12 }, (_, i) => ({ km: Math.round(((i + 1) * 1450) / 12) })),
  },
  pages: [
    {
      km: 0,
      title: 'The audience',
      line: 'At Aurangzeb’s court, Shivaji is made to stand among lesser nobles, and walks out.',
      page: [
        'In June 1665, with his fort of Purandar under siege, Shivaji had made terms with the Mughal general Jai Singh: he gave up 23 forts, kept 12, and agreed to come to the emperor’s court.',
        'He reached Agra in May 1666. At the audience on 12 May he was placed among nobles of a rank he thought beneath him, men he had beaten in the field. He protested and left the hall.',
        'He was put under guard in a house in the city, in the custody of Jai Singh’s son, Ram Singh.',
      ],
      deeper: {
        title: 'Why Agra went wrong',
        text: 'Mughal nobles were ranked by mansab, a number that set their pay, their troops and their place at court. Jai Singh had promised Shivaji a hearing and his safety; the court gave him a middling rank and a place in the crowd. Some at court wanted him killed, others sent to a distant post such as Kandahar or Kabul; Jai Singh, by the accounts, argued for keeping him alive. For Shivaji the insult was political, not personal: standing among lesser men told the Deccan that he had become one more Mughal officer. Historians still argue over whether Aurangzeb meant to humiliate him or simply misjudged him.',
      },
    },
    {
      km: 25,
      title: 'The baskets',
      line: 'The most-told escape: hidden in the baskets of sweets he sent out each day.',
      page: [
        'Shivaji sent most of his men home, fell ill, or seemed to, and began sending great baskets of sweets out of the house as gifts to holy men and the poor.',
        'On 17 August 1666, by the most-told account, he and his nine-year-old son Sambhaji were carried out inside two of them. Other records give 18 or 19 August.',
        'No account written at the time mentions the baskets. The historian Stewart Gordon thinks it as likely that the guards were bribed.',
      ],
    },
    {
      km: 53,
      title: 'Mathura',
      line: 'North first, to throw off the chase, and a son left behind.',
      page: [
        'By the Maratha chronicles he went north to Mathura, away from home, where nobody would look for him.',
        'There he left Sambhaji, too young for the road, with trusted Brahmin families, and went on dressed as a wandering holy man.',
      ],
    },
    {
      km: 154,
      title: 'Three roads south',
      line: 'Which way he went is argued over to this day.',
      page: [
        'Nobody recorded his road home. One account sends him far east, by Allahabad and Varanasi, then down through the forests of Gondwana. Another takes him west through Rajasthan.',
        'This walk follows a third, the shortest road south through Malwa and Khandesh. Treat its stops as places he could have passed, not places he is known to have been.',
      ],
    },
    {
      km: 221,
      title: 'Gwalior',
      line: 'Gwalior’s fort, where the Mughals kept the prisoners they feared most.',
      page: [
        'The Mughals used Gwalior’s hill fort as a state prison. Aurangzeb’s own brother Murad Bakhsh had been held there and was executed in December 1661.',
        'A man the emperor had just lost would have known what awaited him if he were caught.',
      ],
    },
    {
      km: 340,
      title: 'The holy man’s road',
      line: 'On foot, unshaven, a holy man among many on the roads.',
      page: [
        'Wandering ascetics were everywhere on India’s roads, and nobody stopped them. It was a good disguise for a man the whole empire was looking for.',
      ],
    },
    {
      km: 470,
      title: 'The emperor’s riders',
      line: 'Orders to stop him race ahead, faster than any man on foot.',
      page: ['The emperor’s orders went out along the same roads, carried by relays of riders who could cover in a day what he walked in a week. Every governor between Agra and the Deccan was told to look for him.'],
    },
    {
      km: 600,
      title: 'Malwa',
      line: 'Across the open plateau of Malwa, a Mughal province.',
      page: ['Malwa was a rich Mughal province of black soil and wheat. Its towns had governors and garrisons, so a stranger did best to keep to the villages.'],
    },
    {
      km: 727,
      title: 'Indore',
      line: 'Indore, then a small town; within a century, a Maratha stronghold.',
      page: ['In 1666 Indore was a modest market town. Within a century the Marathas had pushed north across Malwa, and their generals, the Holkars, held it from 1733.'],
    },
    {
      km: 815,
      title: 'The Narmada',
      line: 'Across the Narmada, the old line between the north and the Deccan.',
      page: ['The Narmada was long counted the boundary between Hindustan and the Deccan. South of it, he was nearer his own country, though still deep in Mughal land.'],
    },
    {
      km: 962,
      title: 'Burhanpur',
      line: 'Burhanpur, the Mughal gateway to the Deccan.',
      page: ['Burhanpur on the Tapti was where Mughal armies gathered before they marched south. Mumtaz Mahal, for whom the Taj Mahal was built, died here in 1631.'],
    },
    {
      km: 1070,
      title: 'The Ajanta hills',
      line: 'Up through the Ajanta hills, onto the Deccan plateau.',
      page: ['The road climbs from the Tapti valley through the Ajanta range. In its cliffs lie the painted caves of Ajanta, cut between about the 2nd century BCE and the 5th century CE. They were forgotten by the outside world until a British officer came across them while hunting in 1819.'],
    },
    {
      km: 1166,
      title: 'Aurangabad',
      line: 'Aurangabad, the city named for the emperor he had escaped.',
      page: [
        'Founded as Khadki by the Ahmadnagar minister Malik Ambar around 1610, it was renamed for Aurangzeb when he governed the Deccan from here.',
        'Within two years Shivaji would send Sambhaji to serve the prince who governed here, as part of an uneasy peace.',
      ],
    },
    {
      km: 1286,
      title: 'Ahmednagar',
      line: 'Ahmednagar, whose sultans his father had served.',
      page: ['Ahmednagar was the capital of the Nizam Shahi sultans until the Mughals took it in 1600. Shivaji’s father, Shahaji, had been one of the generals who fought to keep the kingdom alive.'],
    },
    {
      km: 1411,
      title: 'Pune',
      line: 'Home ground: Pune, where he grew up.',
      page: ['Pune was Shivaji’s family estate, and he grew up here with his mother, Jijabai. In 1663 he had raided the Mughal general Shaista Khan in his own house here by night, and Shaista Khan lost his fingers escaping.'],
    },
    {
      km: 1450,
      title: 'Rajgad',
      line: 'Home at Rajgad, months after the escape.',
      page: [
        'He reached his hill fort of Rajgad in the last months of 1666. The records disagree on when: one report gives September, a Maratha chronicle 20 November. Sambhaji was brought home later.',
        'Ram Singh fell from favour for letting him go. Within four years Shivaji had taken back most of the forts he had given up, and in 1674 he was crowned at Raigad.',
      ],
    },
  ],
  chronicle: [
    { when: '11 June 1665', place: 'Purandar', text: 'Agrees terms with Jai Singh: 23 forts given up, 12 kept.' },
    { when: '12 May 1666', place: 'Agra', text: 'The audience; he walks out and is put under guard.' },
    { when: '17 August 1666', place: 'Agra', text: 'Escapes with Sambhaji. Other records give 18 or 19 August.' },
    { when: 'Late 1666', place: 'Rajgad', text: 'Home: September by one report, 20 November by a Maratha chronicle.' },
    { when: '1670', place: 'The Sahyadris', text: 'Takes back most of the forts given up at Purandar.' },
  ],
  sources: [
    { title: 'Wikipedia: Shivaji', url: 'https://en.wikipedia.org/wiki/Shivaji' },
    { title: 'Wikipedia: Treaty of Purandar (1665)', url: 'https://en.wikipedia.org/wiki/Treaty_of_Purandar_(1665)' },
    { title: 'Wikipedia: Ram Singh I', url: 'https://en.wikipedia.org/wiki/Ram_Singh_I' },
    { title: 'esamskriti: The saga of Raja Shivaji, from Agra to Salher', url: 'https://www.esamskriti.com/e/History/Indian-History/The-Saga-Of-Raja-Shivaji-~-From-Agra-To-Salher-1.aspx' },
    { title: 'Wikipedia: Murad Bakhsh', url: 'https://en.wikipedia.org/wiki/Murad_Bakhsh' },
    { title: 'Wikipedia: Shaista Khan', url: 'https://en.wikipedia.org/wiki/Shaista_Khan' },
    { title: 'Wikipedia: Aurangabad', url: 'https://en.wikipedia.org/wiki/Aurangabad' },
    { title: 'Wikipedia: Ajanta Caves', url: 'https://en.wikipedia.org/wiki/Ajanta_Caves' },
  ],
  ready: true,
};
