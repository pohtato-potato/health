import type { RouteDef } from '../types';

/**
 * Hannibal's march, 218 BC: New Carthage to the plains of the Po, about 1,500 km, laid out on Polybius's stage
 * distances (about 8,400 stades). The route beyond the Rhône, and the pass over the Alps, are still argued over;
 * the line takes a middle way and the pages say so.
 */
const KM = 1500;
const ELEPHANTS = 37;

export const hannibal: RouteDef = {
  id: 'hannibal',
  name: 'Hannibal over the Alps',
  era: '218 BC',
  hook: 'New Carthage to Italy, with war elephants over the snow.',
  group: 'world',
  km: KM,
  record: 'estimated',
  region: 'med',
  ink: '#c8b4ac',
  places: [
    { name: 'New Carthage', km: 0, at: 0, label: true },
    { name: 'Saguntum', km: 260, at: 2 },
    { name: 'The Ebro', km: 480, at: 3, label: true },
    { name: 'Tarraco', km: 540, at: 4 },
    { name: 'Emporion', km: 750, at: 5 },
    { name: 'The Pyrenees', km: 790, at: 6, label: true },
    { name: 'Ruscino', km: 815, at: 7 },
    { name: 'The Rhône crossing', km: 1035, at: 9, label: true },
    { name: 'The Island', km: 1130, at: 10 },
    { name: 'The high pass', km: 1400, at: 13, label: true },
    { name: 'The Taurini', km: KM, at: 14, label: true },
  ],
  signature: {
    title: 'The elephants',
    note: 'Ancient writers say Hannibal brought 37 war elephants out of Spain. One mark for each of them, all the way to Italy.',
    mark: 'elephant',
    marks: Array.from({ length: ELEPHANTS }, (_, i) => ({ km: Math.round(((i + 1) * KM) / ELEPHANTS), name: `Elephant ${i + 1}` })),
  },
  then: { who: 'Hannibal’s army', totalDays: 150, places: [{ name: 'The Taurini', theirDay: 150 }], source: 'Polybius says the march from New Carthage took five months, fifteen days of it in the Alps.' },
  pages: [
    {
      km: 0,
      title: 'New Carthage',
      line: 'From New Carthage, in spring 218 BC, an army sets out for Italy.',
      page: [
        'New Carthage, now Cartagena, was the capital of Carthage’s empire in Spain, built by Hannibal’s family. In 219 BC Hannibal besieged Saguntum, a city allied to Rome, and Rome declared war.',
        'Rome expected to fight in Spain and Africa. In late spring 218 BC Hannibal marched the other way, overland for Italy, with, says Polybius, 90,000 infantry and 12,000 cavalry, and, says Appian, 37 elephants.',
      ],
      deeper: {
        title: 'Carthage, told by its enemies',
        text: 'Carthage was a Phoenician city in what is now Tunisia, the richest power in the western Mediterranean before Rome. Rome destroyed it in 146 BC, and its books were lost or given away; one famous exception, a treatise on farming by a Carthaginian called Mago, was translated into Latin by order of the Roman Senate. So almost everything we know of Hannibal comes from his enemies: Polybius, a Greek who lived in Rome among the family that defeated Carthage, and Livy, a Roman writing two centuries later. Both admired his skill. Both also told stories of Carthaginian cruelty and faithlessness that suited Rome. Archaeology at Carthage has filled in a city of harbours, trade and craft that its enemies barely describe.',
      },
    },
    {
      km: 130,
      title: 'Up the coast',
      line: 'North along the coast of Spain.',
      page: ['Hannibal was about 29. His father Hamilcar had fought Rome in the first war between them, and Hannibal later told how, as a boy of nine, he swore at an altar never to be a friend of Rome.'],
    },
    {
      km: 260,
      title: 'Saguntum',
      line: 'Past Saguntum, the city whose siege started the war.',
      page: ['Saguntum held out for eight months in 219 BC before Hannibal took it. Rome had promised to protect it and did nothing in time. When Roman envoys at Carthage demanded Hannibal be handed over, one of them, Livy says, held up a fold of his toga and offered war or peace; the Carthaginians told him to choose, and he chose war.'],
    },
    {
      km: 360,
      title: 'An army of many peoples',
      line: 'An army of Africans, Spaniards and, soon, Gauls.',
      page: ['Few of Hannibal’s soldiers were from Carthage itself. His infantry were Libyans and Spaniards, his best cavalry Numidians from North Africa, who rode without bridles, and his slingers came from the Balearic islands. Holding together an army of so many languages was one of his great achievements.'],
    },
    {
      km: 480,
      title: 'The Ebro',
      line: 'Across the Ebro, the line Carthage had promised not to cross.',
      page: ['A treaty of 226 BC had set the Ebro as the limit of Carthage’s power in Spain. Crossing it, Hannibal fought his way through the tribes to the north and left part of his army to hold them down. Polybius gives the distance from New Carthage to the river as 2,600 stades, about 480 km.'],
    },
    {
      km: 600,
      title: 'Leaving men behind',
      line: 'North of the Ebro, the army shrinks.',
      page: ['Hannibal left 10,000 infantry and 1,000 cavalry to hold the country north of the Ebro, and sent home another 10,000 Spanish soldiers who were unwilling to go on. Others deserted. The army that reached the Pyrenees was much smaller than the one that left New Carthage.'],
    },
    {
      km: 750,
      title: 'Emporion',
      line: 'Past the Greek trading town of Emporion.',
      page: ['Emporion, now Empúries, was a Greek trading colony on the coast, allied to Rome’s friend Massalia, now Marseille. Its ruins still stand above the beach.'],
    },
    {
      km: 790,
      title: 'The Pyrenees',
      line: 'Over the Pyrenees into Gaul.',
      page: ['The army crossed the eastern Pyrenees, probably near Le Perthus, where a Roman road later ran, and came down into Gaul at Ruscino, near today’s Perpignan.'],
    },
    {
      km: 920,
      title: 'Through Gaul',
      line: 'Through southern Gaul, buying passage where he could.',
      page: ['In Gaul Hannibal paid and talked his way through, rather than fighting. A Roman army under Publius Scipio had landed at Massalia to stop him on the coast, but Hannibal was already marching inland, further north than anyone expected.'],
    },
    {
      km: 1035,
      title: 'The Rhône',
      line: 'Elephants on rafts across the Rhône.',
      page: [
        'At the Rhône the Volcae, a Gaulish people, waited on the far bank. Hannibal sent men upstream to cross at night and attack them from behind, and the army crossed on boats and dugouts.',
        'For the elephants, Polybius says, his engineers built great rafts covered with earth so the animals thought they were still on land. Some panicked and fell in. They walked along the river bottom with their trunks up to breathe, and reached the shore.',
      ],
    },
    {
      km: 1130,
      title: 'The Island',
      line: 'North to the Island, where two rivers meet.',
      page: ['Four days upriver the army reached a place Polybius calls the Island, a triangle of land between the Rhône and another river, probably the Isère. Hannibal settled a quarrel between two brothers there over its kingship, and was given food, clothing and guides in return.'],
    },
    {
      km: 1260,
      title: 'The Alps',
      line: 'Into the Alps as autumn ends.',
      page: ['It was late in the year: Polybius dates the top of the climb by the setting of the Pleiades, at the end of October or early November. The Allobroges ambushed the column in a gorge; horses and pack animals fell from the narrow track.'],
    },
    {
      km: 1330,
      title: 'Which pass?',
      line: 'Which pass did they cross? Nobody agrees.',
      page: ['Polybius walked the route himself, but his description fits several passes. Scholars have argued for the Little St Bernard, Mont Cenis, the Col de Clapier, Montgenèvre and the Col de la Traversette, among others. In 2016 a team reported a thick layer of disturbed earth and horse dung, dated to about the right time, in a bog below the Traversette. Others say it proves nothing about Hannibal.'],
    },
    {
      km: 1400,
      title: 'The high pass',
      line: 'At the top, snow, and a view of Italy.',
      page: [
        'At the summit, Polybius says, the old snow was already covered with new. Hannibal showed his men the plains of the Po below and pointed out where Rome lay; Livy has him say they were climbing the walls of Rome itself.',
        'On the way down a landslip had carried away the track. The army spent days cutting a new one; Livy adds that they cracked a great rock with fire and sour wine, a story Polybius does not tell.',
      ],
    },
    {
      km: KM,
      title: 'The Taurini',
      line: 'Into the plains of Italy, with half the army gone.',
      page: [
        'The army came down into the plains near the Taurini, around today’s Turin, five months after leaving New Carthage. Hannibal himself later recorded, in an inscription Polybius saw, that he reached Italy with 20,000 infantry and 6,000 cavalry.',
        'Within weeks he beat the Romans at the Ticinus and the Trebia. Most of the elephants died in the cold that winter. Polybius and Livy say only one survived, and Hannibal rode it through the marshes of the Arno the next spring.',
      ],
      deeper: {
        title: 'Why invade by land?',
        text: 'Rome had won control of the sea in the first war. A seaborne invasion of Italy would have been sunk or met on the beach. By land, Hannibal could arrive where he was not expected, and recruit Gauls in the north who hated Rome. His real aim was to break Rome’s alliances in Italy: beat its armies, free its allies, and leave it too weak to fight. He fought in Italy for fifteen years, winning most famously at Cannae in 216 BC, but most of the allies held. He never besieged Rome. In 202 BC, recalled to Africa, he lost to Scipio at Zama, and Carthage made peace.',
      },
    },
  ],
  chronicle: [
    { when: '219 BC', place: 'Saguntum', text: 'Hannibal besieges and takes the city.' },
    { when: 'Late spring 218 BC', place: 'New Carthage', text: 'The march begins.' },
    { when: 'Late summer 218 BC', place: 'The Rhône', text: 'The army and the elephants cross.' },
    { when: 'About November 218 BC', place: 'The Alps', text: 'The crossing, in fifteen days.' },
    { when: 'December 218 BC', place: 'The Trebia', text: 'A Roman army is destroyed.' },
    { when: '216 BC', place: 'Cannae', text: 'Hannibal’s greatest victory.' },
    { when: '202 BC', place: 'Zama', text: 'Scipio defeats him in Africa.' },
    { when: '146 BC', place: 'Carthage', text: 'Rome destroys the city.' },
  ],
  sources: [
    { title: 'Polybius, Histories, book 3 (LacusCurtius)', url: 'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Polybius/3*.html' },
    { title: 'Livy, History of Rome, book 21 (Perseus)', url: 'https://www.perseus.tufts.edu/hopper/text?doc=Liv.+21' },
    { title: 'Wikipedia: Hannibal’s crossing of the Alps', url: 'https://en.wikipedia.org/wiki/Hannibal%27s_crossing_of_the_Alps' },
    { title: 'Mahaney et al. (2016), Biostratigraphic evidence relating to the age-old question of Hannibal’s invasion of Italy, Archaeometry' },
    { title: 'Wikipedia: Carthage', url: 'https://en.wikipedia.org/wiki/Carthage' },
  ],
  ready: true,
};
