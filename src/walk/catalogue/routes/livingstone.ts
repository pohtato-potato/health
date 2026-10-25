import type { RouteDef } from '../types';

/**
 * Livingstone's last journey, 1873–74: after David Livingstone died at Chitambo, his companions carried his body to
 * the coast at Bagamoyo. Told as their journey. About 1,600 km, the figure usually given (their real path was
 * probably longer); dated at its ends and at Unyanyembe, the line between estimated.
 */
const KM = 1600;

export const livingstone: RouteDef = {
  id: 'livingstone',
  name: 'Carrying Livingstone home',
  era: '1873–1874',
  hook: 'His companions carried the explorer’s body across East Africa to the sea, and the world credited him.',
  group: 'world',
  km: KM,
  record: 'estimated',
  region: 'eastafrica',
  ink: '#e0b8a0',
  places: [
    { name: 'Chitambo', km: 0, at: 0, label: true },
    { name: 'The Chambeshi', km: 176, at: 2 },
    { name: 'Lake Tanganyika', km: 408, at: 4, label: true },
    { name: 'Ufipa', km: 514, at: 5 },
    { name: 'Unyanyembe', km: 873, at: 7, label: true },
    { name: 'Ugogo', km: 1227, at: 9 },
    { name: 'Mpwapwa', km: 1313, at: 10 },
    { name: 'Usagara', km: 1454, at: 11 },
    { name: 'Bagamoyo', km: KM, at: 12, label: true },
  ],
  signature: {
    title: 'Carried, a hundred kilometres at a time',
    note: 'The body was carried on a pole, the bearers taking turns. Each mark is another hundred kilometres of the carrying.',
    mark: 'walker',
    marks: Array.from({ length: KM / 100 }, (_, i) => ({ km: (i + 1) * 100, name: `${(i + 1) * 100} km carried` })),
  },
  pages: [
    {
      km: 0,
      title: 'Chitambo',
      line: 'At Chitambo, in May 1873, Livingstone dies, and his companions decide.',
      page: [
        'David Livingstone, the Scottish missionary and explorer, had spent seven years searching for the source of the Nile, sick and often lost. He died at the village of the chief Chitambo, south of Lake Bangweulu in what is now Zambia, on about 1 May 1873.',
        'His companions, led by Abdullah Susi and James Chuma, met and decided to carry his body to the coast, to be sent home to Britain. It had never been done, and no one had asked them to.',
      ],
      deeper: {
        title: 'Their journey, long told as his',
        text: 'For a century the story was told as Livingstone’s: the great man dying on his knees, his faithful servants bringing him home. The servants were men with their own histories. Chuma, a Yao, had been freed from slave traders by Livingstone in 1861. Susi had worked for him since the 1860s. Jacob Wainwright, also Yao, had been freed from a slave ship and schooled at a mission in Nashik in India before joining. Together they ran a caravan of about sixty people through country at war, made the decisions, bargained with chiefs and kept the body hidden from people who feared a corpse. Historians now treat the carrying as an achievement in its own right, and the decision as theirs.',
      },
    },
    {
      km: 20,
      title: 'The heart under a tree',
      line: 'His heart is buried under a tree, and the body dried in the sun.',
      page: [
        'They removed his heart and organs and buried them in a tin under a mvula tree at Chitambo. Jacob Wainwright read the burial service and carved an inscription on the tree.',
        'They dried the body in the sun for about two weeks, wrapped it in calico, bound it in bark and lashed it to a pole for carrying.',
      ],
    },
    {
      km: 176,
      title: 'The Chambeshi',
      line: 'North across the Chambeshi, in the wet country.',
      page: ['The country around Lake Bangweulu is a maze of swamp and rivers. Livingstone had struggled through it for months before he died. Going north, the caravan crossed the Chambeshi, the river that feeds the lake and, though nobody knew it yet, one of the far sources of the Congo, not the Nile.'],
    },
    {
      km: 300,
      title: 'Sickness',
      line: 'Fever on the road, and the first deaths.',
      page: ['Several of the caravan fell sick, and some died on the way. The bearers had to persuade villages to let them pass: many people believed a corpse brought bad luck, and the caravan often told them it was carrying bales of cloth.'],
    },
    {
      km: 408,
      title: 'Lake Tanganyika',
      line: 'Past the south end of Lake Tanganyika.',
      page: ['Lake Tanganyika is one of the longest and deepest lakes in the world. Two years before, in November 1871, the journalist Henry Morton Stanley had found Livingstone at Ujiji, on its eastern shore, and asked, so he wrote, “Dr Livingstone, I presume?”'],
    },
    {
      km: 600,
      title: 'Through Ufipa',
      line: 'North through the plateau of Ufipa.',
      page: ['The route north crossed the highlands of Ufipa towards the trade road. Months had passed; the body had been carried through the dry season and into the rains.'],
    },
    {
      km: 740,
      title: 'News goes ahead',
      line: 'Messengers run ahead with the news.',
      page: ['As they neared the trade road, the caravan sent messengers ahead to Unyanyembe with the news of Livingstone’s death. It was the first the outside world heard of it.'],
    },
    {
      km: 873,
      title: 'Unyanyembe',
      line: 'At Unyanyembe, a British officer tells them to bury him here.',
      page: [
        'In October 1873 they reached Unyanyembe, near today’s Tabora, a trading town on the main caravan road. There they met a British expedition under Lieutenant Verney Lovett Cameron, sent to find Livingstone.',
        'Cameron told them to bury the body there. They refused, and went on.',
      ],
    },
    {
      km: 1050,
      title: 'The caravan road',
      line: 'East on the caravan road, the slave road to the coast.',
      page: ['From Unyanyembe the road to the coast was the main route of the ivory and slave caravans. Thousands of captives a year were marched along it to Bagamoyo and shipped to Zanzibar.'],
      deeper: {
        title: 'The trade he wrote against',
        text: 'The East African slave trade was run by Swahili and Arab traders from Zanzibar, with African partners inland, and fed plantations on Zanzibar and markets in Arabia and the Persian Gulf. In July 1871 Livingstone watched slavers fire into a crowded market at Nyangwe on the Lualaba, killing hundreds. His account caused outrage in Britain, and Britain pressed the Sultan of Zanzibar. On 5 June 1873, a month after Livingstone died, the Sultan closed the Zanzibar slave market. The trade went on illegally for years, inland and by smaller boats. Britain’s campaign against it was also, in time, one of the reasons it gave itself for taking over East Africa.',
      },
    },
    {
      km: 1227,
      title: 'Ugogo',
      line: 'Through Ugogo, where every chief takes a toll.',
      page: ['Ugogo, the dry central plateau, was famous among caravans for its chiefs, who charged a tribute in cloth for the right to pass and to draw water. Every caravan crossing to the coast had to pay it.'],
    },
    {
      km: 1400,
      title: 'Down to the coast',
      line: 'Down through the hills of Usagara towards the sea.',
      page: ['From the plateau the road dropped through the green hills of Usagara to the hot coastal plain. The bearers had been walking for about nine months.'],
    },
    {
      km: KM,
      title: 'Bagamoyo',
      line: 'At Bagamoyo, the sea, and a quick goodbye.',
      page: [
        'In February 1874 the caravan reached Bagamoyo, on the coast opposite Zanzibar. The body was handed over to British officials and shipped home. The bearers were paid their wages and sent away.',
        'On 18 April 1874 Livingstone was buried in Westminster Abbey. Of those who had carried him, only Jacob Wainwright was there, as a pallbearer. Susi and Chuma came to England later that year to help prepare his journals for publication, and the Royal Geographical Society gave medals to the bearers. The heart stayed at Chitambo, where a memorial stands.',
      ],
    },
  ],
  chronicle: [
    { when: '1866', place: 'Zanzibar', text: 'Livingstone sets out to find the source of the Nile.' },
    { when: 'July 1871', place: 'Nyangwe', text: 'He witnesses the massacre at the market.' },
    { when: 'November 1871', place: 'Ujiji', text: 'Stanley finds him.' },
    { when: 'About 1 May 1873', place: 'Chitambo', text: 'Livingstone dies.' },
    { when: '5 June 1873', place: 'Zanzibar', text: 'The slave market is closed.' },
    { when: 'October 1873', place: 'Unyanyembe', text: 'The caravan meets Cameron and refuses to bury him.' },
    { when: 'February 1874', place: 'Bagamoyo', text: 'The caravan reaches the coast.' },
    { when: '18 April 1874', place: 'London', text: 'Burial in Westminster Abbey.' },
  ],
  sources: [
    { title: 'Wikipedia: David Livingstone', url: 'https://en.wikipedia.org/wiki/David_Livingstone' },
    { title: 'Wikipedia: Jacob Wainwright', url: 'https://en.wikipedia.org/wiki/Jacob_Wainwright' },
    { title: 'Wikipedia: James Chuma', url: 'https://en.wikipedia.org/wiki/James_Chuma' },
    { title: 'Livingstone Online', url: 'https://livingstoneonline.org/' },
    { title: 'The Blantyre Project: bringing back Livingstone', url: 'https://blantyreproject.com/2015/08/bringing-back-livingstone-from-africa/' },
  ],
  ready: true,
};
