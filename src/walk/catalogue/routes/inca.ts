import type { RouteDef } from '../types';

/**
 * The Inca road, Cusco to Quito: the mountain trunk of the Qhapaq Ñan through the Andes, about 2,400 km by the
 * highland road (figures from about 2,000 km up are given). No record of one walk; told from the road's own
 * remains and the Spanish chroniclers who saw it working.
 */
const KM = 2400;
const TAMBOS = 96;

export const inca: RouteDef = {
  id: 'inca',
  name: 'The Inca road',
  era: '15th–16th century',
  hook: 'Along the spine of the Andes on the road of an empire that ran without writing.',
  group: 'world',
  km: KM,
  record: 'none',
  region: 'andes',
  ink: '#a0c8e0',
  places: [
    { name: 'Cusco', km: 0, at: 0, label: true },
    { name: 'Vilcashuamán', km: 270, at: 2 },
    { name: 'Hatun Xauxa', km: 612, at: 4 },
    { name: 'Huánuco Pampa', km: 918, at: 6, label: true },
    { name: 'Cajamarca', km: 1382, at: 8, label: true },
    { name: 'Huancabamba', km: 1682, at: 10 },
    { name: 'Tomebamba', km: 2017, at: 12, label: true },
    { name: 'Ingapirca', km: 2070, at: 13 },
    { name: 'Quito', km: KM, at: 16, label: true },
  ],
  signature: {
    title: 'Tambos',
    note: 'The road had a tambo, a waystation with stores, shelter and a keeper, about every day’s walk. Each mark is one, every 25 km or so.',
    mark: 'house',
    marks: Array.from({ length: TAMBOS }, (_, i) => ({ km: (i + 1) * 25, name: `Tambo ${i + 1}` })),
  },
  pages: [
    {
      km: 0,
      title: 'Cusco',
      line: 'From Cusco, the navel of the world, four roads leave for four quarters.',
      page: [
        'Cusco was the capital of Tawantinsuyu, the land of the four quarters, the Inca empire. Four great roads left its central square, one for each quarter. This one runs north-west into Chinchaysuyu, towards Quito.',
        'The whole network, the Qhapaq Ñan, ran to 30,000 or 40,000 km across what are now six countries. Much of it was older, built by peoples before the Incas, and joined up by them in less than a century of conquest.',
      ],
      deeper: {
        title: 'An empire that ran on knotted cords',
        text: 'The Incas ruled perhaps ten million people without writing as we know it. Officials kept records on khipu, bundles of knotted cords whose knots, colours and positions recorded numbers, of people, tribute and stores, and perhaps also names and stories. Specialists read them aloud. Spanish officials used khipu records in court cases for decades after the conquest. Most surviving khipu are numerical and can be read; whether some recorded language is still an open question. Labour was the empire’s tax: households owed turns of work, the mit’a, on roads, farms, mines and armies, and the state fed them from its stores while they worked.',
      },
    },
    {
      km: 120,
      title: 'The Apurímac',
      line: 'Down into the Apurímac gorge, crossed by a bridge of grass.',
      page: [
        'The road crossed the great gorge of the Apurímac on a hanging bridge of twisted grass rope. Bridges like it were rebuilt every year or two by the communities nearby, as their share of the work owed.',
        'One still is: at Q’eswachaka, upriver, four communities weave a new bridge every June, a tradition listed by UNESCO.',
      ],
    },
    {
      km: 270,
      title: 'Vilcashuamán',
      line: 'Vilcashuamán, a provincial capital with a stepped platform.',
      page: ['Vilcashuamán was an Inca provincial centre, built where several roads met. Its ushnu, a stepped stone platform from which the ruler or his officials presided, still stands, with a colonial church built on top of the old temple beside it.'],
    },
    {
      km: 450,
      title: 'The chasquis',
      line: 'Runners in relays carried the empire’s news.',
      page: [
        'Along the road, every few kilometres, stood small huts where pairs of runners, chasquis, waited. A runner sprinted to the next hut, called out his message or handed over a khipu, and the next man ran on.',
        'The chroniclers say messages could travel 200 km or more in a day, and that fresh fish reached the ruler in Cusco from the coast in two days. The numbers are theirs, but for fresh runners in relays every few kilometres they are not impossible.',
      ],
    },
    {
      km: 620,
      title: 'Hatun Xauxa',
      line: 'Hatun Xauxa, in the Mantaro valley, a city of stores.',
      page: ['In the fertile Mantaro valley, Hatun Xauxa was an Inca administrative town with rows of storehouses, qollqa, on the hills above it, holding maize, potatoes, cloth and weapons. The Spanish chronicler Pedro Cieza de León was amazed by such stores, still full years after the conquest.'],
    },
    {
      km: 918,
      title: 'Huánuco Pampa',
      line: 'Huánuco Pampa, a city built for the road, on a high plain.',
      page: ['Huánuco Pampa, at about 3,800 metres, was built from nothing by the Incas as a centre for the road: thousands of buildings, a great plaza with an ushnu, and hundreds of storehouses. It was abandoned soon after the conquest and never built over, so its plan survives.'],
    },
    {
      km: 1150,
      title: 'Steps and walls',
      line: 'Stone steps, drains and walls, across every kind of ground.',
      page: ['The road changed with the land: stone stairways up mountain sides, causeways over marshes, walls to keep llama trains on the track, and drains under the paving. It was built for people on foot and llamas, not for wheels, which the Incas did not use for transport.'],
    },
    {
      km: 1382,
      title: 'Cajamarca',
      line: 'At Cajamarca, in 1532, the Inca ruler is taken prisoner.',
      page: [
        'On 16 November 1532 Atahualpa, fresh from winning a civil war, met about 170 Spaniards under Francisco Pizarro in the square at Cajamarca. The Spanish attacked his unarmed escort, killed thousands and took him prisoner.',
        'He offered to fill a room with gold and two more with silver for his freedom. The ransom was paid, and the Spanish executed him anyway, in July 1533.',
      ],
      deeper: {
        title: 'The civil war the Spanish walked into',
        text: 'Around 1527 the ruler Huayna Capac died, probably of smallpox, which had spread south from Spanish settlements before any Spaniard reached Peru. His heir died too. Two of his sons, Huáscar in Cusco and Atahualpa with the northern army near Quito, fought a bitter civil war. Atahualpa won in 1532 and was on his way south to Cusco when Pizarro landed. The Spanish found an empire just torn in half, with many conquered peoples who hated Inca rule and joined them. As in Mexico, the conquest was won with Indigenous allies, and disease did much of the killing.',
      },
    },
    {
      km: 1682,
      title: 'Huancabamba',
      line: 'Through Huancabamba, where the Andes dip lowest.',
      page: ['Near Huancabamba the Andes are at their lowest and narrowest in Peru. The road climbed on into the northern highlands, the land the Incas had conquered last.'],
    },
    {
      km: 1850,
      title: 'The last conquests',
      line: 'North into the lands the Incas conquered last.',
      page: ['The Incas reached what is now Ecuador only in the late 15th century, under Tupac Inca Yupanqui and his son Huayna Capac. The peoples here fought them for years. The Incas moved whole communities, mitmaq, from one end of the empire to the other to hold new lands, and their descendants still live far from where their ancestors began.'],
    },
    {
      km: 2017,
      title: 'Tomebamba',
      line: 'Tomebamba, the northern capital, destroyed in the civil war.',
      page: ['Tomebamba, under today’s Cuenca, was built by Huayna Capac as a second Cusco in the north, among the Cañari people. In the civil war the Cañari sided with Huáscar, and Atahualpa’s army punished them and wrecked the city. They later sided with the Spanish.'],
    },
    {
      km: 2070,
      title: 'Ingapirca',
      line: 'Ingapirca, an Inca temple built on Cañari ground.',
      page: ['Ingapirca is the largest Inca site in Ecuador: an oval stone temple of fitted Inca masonry, built beside an older Cañari site. Both peoples’ buildings stand side by side.'],
    },
    {
      km: 2250,
      title: 'The avenue of volcanoes',
      line: 'North between the volcanoes towards Quito.',
      page: ['The road ran north between two lines of volcanoes, Chimborazo and Cotopaxi among them, through the high valleys of central Ecuador.'],
    },
    {
      km: KM,
      title: 'Quito',
      line: 'Quito, Atahualpa’s city, burned rather than surrendered.',
      page: [
        'Quito was the northern base of the empire and of Atahualpa’s army. When the Spanish came north in 1534, the general Rumiñawi, by the usual account, burned the city rather than let them have it.',
        'The Spanish built a new city on the ruins. The road decayed without the mit’a to keep it, but long stretches survive, and in 2014 UNESCO listed the Qhapaq Ñan as a World Heritage Site across six countries.',
      ],
    },
  ],
  chronicle: [
    { when: 'About 1438', place: 'Cusco', text: 'Pachacuti begins the Inca expansion, by the usual dating.' },
    { when: 'About 1527', place: 'Quito', text: 'Huayna Capac dies; civil war follows.' },
    { when: '16 November 1532', place: 'Cajamarca', text: 'Atahualpa is captured.' },
    { when: 'July 1533', place: 'Cajamarca', text: 'Atahualpa is executed.' },
    { when: '1534', place: 'Quito', text: 'The city is burned as the Spanish approach.' },
    { when: '1553', place: 'Seville', text: 'Cieza de León publishes his chronicle of Peru.' },
    { when: '2014', place: 'Six countries', text: 'The Qhapaq Ñan becomes a World Heritage Site.' },
  ],
  sources: [
    { title: 'UNESCO: Qhapaq Ñan, Andean Road System', url: 'https://whc.unesco.org/en/list/1459/' },
    { title: 'Wikipedia: Inca road system', url: 'https://en.wikipedia.org/wiki/Inca_road_system' },
    { title: 'Wikipedia: Chasqui', url: 'https://en.wikipedia.org/wiki/Chasqui' },
    { title: 'Wikipedia: Quipu', url: 'https://en.wikipedia.org/wiki/Quipu' },
    { title: 'Wikipedia: Q’eswachaka', url: 'https://en.wikipedia.org/wiki/Q%27eswachaka' },
    { title: 'Smithsonian National Museum of the American Indian: The Great Inka Road', url: 'https://americanindian.si.edu/inkaroad/' },
  ],
  ready: true,
};
