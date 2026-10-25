import type { RouteDef } from '../types';

/**
 * Hadrian's Wall, walked east to west along today's National Trail, 135 km from Wallsend to Bowness-on-Solway.
 * Rome's frontier from AD 122; nobody walked it end to end that we know of, so the forts carry the history.
 */
const KM = 135;
const MILECASTLES = 80;

export const hadrian: RouteDef = {
  id: 'hadrian',
  name: 'Hadrian’s Wall',
  era: 'AD 122',
  hook: 'Coast to coast along Rome’s northern frontier, fort by fort.',
  group: 'world',
  km: KM,
  record: 'none',
  region: 'britain',
  ink: '#b8c4d8',
  places: [
    { name: 'Wallsend', km: 0, at: 0, label: true },
    { name: 'Newcastle', km: 7, at: 1 },
    { name: 'Heddon-on-the-Wall', km: 24, at: 3 },
    { name: 'Chesters', km: 48, at: 5 },
    { name: 'Housesteads', km: 63, at: 7, label: true },
    { name: 'Birdoswald', km: 84, at: 9 },
    { name: 'Carlisle', km: 112, at: 11, label: true },
    { name: 'Burgh by Sands', km: 122, at: 12 },
    { name: 'Bowness-on-Solway', km: KM, at: 13, label: true },
  ],
  signature: {
    title: 'Milecastles',
    note: 'A small gated fort every Roman mile, 80 in all. Archaeologists number them from east to west, so they count up as you walk.',
    mark: 'milecastle',
    marks: Array.from({ length: MILECASTLES }, (_, i) => ({ km: Math.round((((i + 1) * KM) / MILECASTLES) * 10) / 10, name: `Milecastle ${i + 1}` })),
  },
  pages: [
    {
      km: 0,
      title: 'Segedunum',
      line: 'At Wallsend, the wall’s eastern end, on the Tyne.',
      page: [
        'The wall began at the fort of Segedunum, on a bend of the Tyne. The town is still called Wallsend.',
        'From here it ran about 117 km, 80 Roman miles, to the Solway Firth in the west. The trail you walk is longer, because it winds with the ground.',
      ],
      deeper: {
        title: 'What was a frontier for?',
        text: 'A late Roman biography says Hadrian built the wall to separate the Romans from the barbarians, but it was written about 250 years later. Historians read the wall several ways. It could not have stopped a real army, and its gates at every mile let people through. It may have been mostly a customs line, controlling who came and went and taxing what they carried. It was also a statement in stone: Hadrian had given up some of his predecessor Trajan’s conquests, and the wall said where Rome now chose to end. Whatever it was for, it took a garrison of perhaps 10,000 men to hold.',
      },
    },
    {
      km: 7,
      title: 'Pons Aelius',
      line: 'Newcastle, once Pons Aelius, the bridge named for Hadrian.',
      page: ['Hadrian’s family name was Aelius, and the Roman bridge and fort here were named Pons Aelius after him. The Norman castle that gave Newcastle its name was built on the fort’s site a thousand years later.'],
    },
    {
      km: 24,
      title: 'The first stones',
      line: 'At Heddon, the first long stretch of wall still standing.',
      page: [
        'East of here the wall is almost all under the city. At Heddon-on-the-Wall a stretch survives at nearly its full width, about three metres.',
        'Three legions built it, from about AD 122, in short lengths: each gang carved its unit’s name on stones at the ends of its section.',
      ],
    },
    {
      km: 35,
      title: 'Ditch and vallum',
      line: 'A ditch to the north, and a great earthwork to the south.',
      page: ['The wall was more than a wall. North of it ran a ditch. South of it the army dug the vallum, a broad ditch between two banks, which marked off the military zone and could only be crossed at the forts.'],
    },
    {
      km: 48,
      title: 'Chesters',
      line: 'Chesters, a cavalry fort by the North Tyne.',
      page: ['Chesters, Roman Cilurnum, housed a cavalry regiment of about 500 men. Its bath house is one of the best preserved in Britain, and across the river stand the stone footings of the bridge that carried the wall over it.'],
    },
    {
      km: 63,
      title: 'Housesteads',
      line: 'Housesteads, high on the crags, with its stone latrine.',
      page: [
        'Vercovicium, now Housesteads, sits on the Whin Sill, a ridge of hard volcanic rock that the wall follows for miles. About 800 infantry lived here.',
        'Its latrine had seats over a flushing channel, and the soldiers probably cleaned themselves with sponges on sticks.',
      ],
    },
    {
      km: 67,
      title: 'Sycamore Gap',
      line: 'A dip in the crags where a lone tree stood for over a century.',
      page: ['A sycamore grew in a gap in the wall here for well over a century, probably planted in the late 1800s, and became one of the most photographed trees in England. In September 2023 it was cut down overnight, deliberately; two men were later convicted. Seedlings from it have been planted across the country.'],
    },
    {
      km: 70,
      title: 'Vindolanda',
      line: 'Just south of the wall, Vindolanda and its letters.',
      page: [
        'The fort of Vindolanda is older than the wall, from about AD 85. In its waterlogged ground archaeologists found more than a thousand wooden writing tablets, among the oldest handwritten documents from Britain.',
        'One is a birthday invitation from Claudia Severa to her friend Sulpicia Lepidina, partly in her own hand. Another mentions socks, sandals and two pairs of underpants sent to a soldier.',
      ],
      deeper: {
        title: 'Life in a garrison town',
        text: 'The tablets show a frontier full of ordinary life: accounts, leave requests, a complaint about a beating, orders for beer. Soldiers lived with families outside the walls, in towns of traders, wives and children, though serving soldiers could not legally marry until about AD 197. One report calls the locals Brittunculi, little Britons, a rare glimpse of how soldiers talked about them. The tablets also show how far the army was from a garrison of Italians: its units were raised all over the empire, and by the 2nd century many were recruited locally.',
      },
    },
    {
      km: 75,
      title: 'Soldiers from far away',
      line: 'The men on this wall came from across the empire.',
      page: ['At Carvoran, just ahead, the garrison for a time was a unit of Hamian archers from Syria. Units from what are now Belgium, the Netherlands, Spain and Romania served along the wall. At South Shields, near the eastern end, a Syrian from Palmyra set up a tombstone for his wife Regina, a freed slave from southern Britain.'],
    },
    {
      km: 84,
      title: 'Birdoswald',
      line: 'Birdoswald, above the Irthing gorge.',
      page: ['Banna, now Birdoswald, was held into the 5th century. Archaeologists found timber halls built inside it after the Roman army stopped being paid, a sign that someone, perhaps the garrison’s descendants, stayed on.'],
    },
    {
      km: 95,
      title: 'Turf into stone',
      line: 'West of the Irthing, the first wall was turf.',
      page: ['From the Irthing westwards the first wall was built of turf, perhaps because there was no good limestone for mortar nearby. Within a few decades it was rebuilt in stone.'],
    },
    {
      km: 112,
      title: 'Carlisle',
      line: 'Carlisle, Luguvalium, the wall’s western town.',
      page: ['Luguvalium was a Roman town before the wall and grew into its main town in the west. The fort at Stanwix, across the river, held the largest unit on the wall: a cavalry regiment of a thousand men.'],
    },
    {
      km: 122,
      title: 'Burgh by Sands',
      line: 'Aballava, where a unit of Moors was posted.',
      page: ['In the 3rd century the fort at Burgh by Sands was garrisoned by a unit of Moors from North Africa. In 1307 the English king Edward I died here on his way to fight the Scots.'],
    },
    {
      km: KM,
      title: 'Bowness-on-Solway',
      line: 'At Bowness, the wall’s western end, on the Solway.',
      page: [
        'Maia, at Bowness, was the second largest fort on the wall. Beyond it the defences carried on down the Cumbrian coast as a line of towers.',
        'About twenty years after the wall was built, the next emperor pushed the frontier north to the Antonine Wall in Scotland; within about twenty years more the army was back here. It stayed until the end of Roman Britain, about AD 410.',
      ],
      deeper: {
        title: 'Why Rome stopped',
        text: 'Hadrian came to power in 117 and soon gave up land in Mesopotamia that Trajan had just taken. His policy was to hold, not grow. Historians argue over why. The empire may simply have reached the limit of what it could govern and pay for: armies cost money, and northern Britain, poor and hard to hold, would not pay for its own conquest. Rome tried again in Scotland under Antoninus Pius and Septimius Severus, and each time came back to this line.',
      },
    },
  ],
  chronicle: [
    { when: 'About AD 85', place: 'Vindolanda', text: 'The first fort is built, on the earlier Stanegate road.' },
    { when: 'AD 122', place: 'Britain', text: 'Hadrian visits; building begins.' },
    { when: 'About AD 142', place: 'Scotland', text: 'The Antonine Wall moves the frontier north.' },
    { when: 'About AD 160s', place: 'The wall', text: 'The army returns to Hadrian’s line.' },
    { when: 'About AD 410', place: 'Britain', text: 'Roman rule ends.' },
    { when: '1987', place: 'The wall', text: 'Named a UNESCO World Heritage Site.' },
    { when: '2003', place: 'Wallsend to Bowness', text: 'The National Trail opens.' },
    { when: 'September 2023', place: 'Sycamore Gap', text: 'The tree is felled.' },
  ],
  sources: [
    { title: 'Wikipedia: Hadrian’s Wall', url: 'https://en.wikipedia.org/wiki/Hadrian%27s_Wall' },
    { title: 'English Heritage: Hadrian’s Wall history', url: 'https://www.english-heritage.org.uk/visit/places/hadrians-wall/history-and-stories/' },
    { title: 'Vindolanda Tablets Online', url: 'http://vindolanda.csad.ox.ac.uk/' },
    { title: 'National Trails: Hadrian’s Wall Path', url: 'https://www.nationaltrail.co.uk/en_GB/trails/hadrians-wall-path/' },
    { title: 'Wikipedia: Sycamore Gap tree', url: 'https://en.wikipedia.org/wiki/Sycamore_Gap_tree' },
  ],
  ready: true,
};
