import { addDays, type DayKey } from './dates';

/**
 * Walk across India, in three chapters, a lap of home at a time.
 * 1: Delhi to Kanyakumari along the highways, about 2,870 km.
 * 2: on to Chennai, then round the Golden Quadrilateral, about 5,850 km.
 * 3: every state and territory not yet visited, ending in Leh.
 * Distances follow the roads roughly; a few legs to the islands go by sea.
 */
export const STRIDE_M = 0.74;

export interface Stop {
  name: string;
  /** Kilometres from the very start in Delhi. */
  km: number;
  x: number;
  y: number;
  /** Where the label sits relative to the dot. */
  side: 'l' | 'r';
  /** Reached by boat. */
  sea?: boolean;
}

export interface StateMark {
  name: string;
  km: number;
  /** A union territory rather than a state. */
  ut?: boolean;
}

/** Map positions use X = 9.4·lon − 627.2 and Y = 385 − 10·lat on a 300 × 322 board. */
export const ROUTE: Stop[] = [
  { name: 'Delhi', km: 0, x: 98.6, y: 98.9, side: 'l' },
  { name: 'Agra', km: 230, x: 106.1, y: 113.2, side: 'r' },
  { name: 'Gwalior', km: 350, x: 107.7, y: 122.8, side: 'r' },
  { name: 'Bhopal', km: 770, x: 100.5, y: 152.4, side: 'l' },
  { name: 'Nagpur', km: 1120, x: 116.2, y: 173.5, side: 'r' },
  { name: 'Hyderabad', km: 1620, x: 110.6, y: 211.1, side: 'r' },
  { name: 'Bengaluru', km: 2190, x: 102.1, y: 255.3, side: 'l' },
  { name: 'Madurai', km: 2625, x: 107.1, y: 285.7, side: 'r' },
  { name: 'Kanyakumari', km: 2870, x: 101.7, y: 304.2, side: 'l' },
];

/** Chapter 1's length, kept under its old name. */
export const TOTAL_KM = ROUTE[ROUTE.length - 1].km;

/** Roughly where chapter 1 crosses into each state. */
export const STATES: StateMark[] = [
  { name: 'Delhi', km: 0, ut: true },
  { name: 'Haryana', km: 25 },
  { name: 'Uttar Pradesh', km: 85 },
  { name: 'Rajasthan', km: 255 },
  { name: 'Madhya Pradesh', km: 285 },
  { name: 'Maharashtra', km: 950 },
  { name: 'Telangana', km: 1270 },
  { name: 'Andhra Pradesh', km: 1830 },
  { name: 'Karnataka', km: 2110 },
  { name: 'Tamil Nadu', km: 2225 },
];

const C2 = TOTAL_KM;
/** Chapter 2: Kanyakumari to Chennai, then Chennai–Kolkata–Delhi–Mumbai–Chennai. */
export const QUAD_ROUTE: Stop[] = [
  { name: 'Kanyakumari', km: C2, x: 101.7, y: 304.2, side: 'l' },
  { name: 'Chennai', km: C2 + 700, x: 127.3, y: 254.2, side: 'r' },
  { name: 'Nellore', km: C2 + 875, x: 124.7, y: 240.6, side: 'r' },
  { name: 'Vijayawada', km: C2 + 1150, x: 130.9, y: 219.9, side: 'r' },
  { name: 'Visakhapatnam', km: C2 + 1500, x: 155.1, y: 208.1, side: 'r' },
  { name: 'Bhubaneswar', km: C2 + 1945, x: 179.5, y: 182.0, side: 'r' },
  { name: 'Kolkata', km: C2 + 2385, x: 203.4, y: 159.3, side: 'r' },
  { name: 'Varanasi', km: C2 + 3065, x: 152.7, y: 131.8, side: 'r' },
  { name: 'Kanpur', km: C2 + 3395, x: 127.9, y: 120.5, side: 'r' },
  { name: 'Delhi', km: C2 + 3840, x: 98.6, y: 98.9, side: 'l' },
  { name: 'Jaipur', km: C2 + 4110, x: 85.2, y: 115.9, side: 'l' },
  { name: 'Udaipur', km: C2 + 4500, x: 65.7, y: 139.1, side: 'l' },
  { name: 'Ahmedabad', km: C2 + 4750, x: 55.0, y: 154.8, side: 'r' },
  { name: 'Surat', km: C2 + 5015, x: 57.4, y: 173.3, side: 'r' },
  { name: 'Mumbai', km: C2 + 5260, x: 57.9, y: 194.2, side: 'l' },
  { name: 'Pune', km: C2 + 5410, x: 67.1, y: 199.8, side: 'r' },
  { name: 'Belagavi', km: C2 + 5750, x: 73.1, y: 226.5, side: 'l' },
  { name: 'Hubballi', km: C2 + 5850, x: 78.9, y: 231.4, side: 'r' },
  { name: 'Bengaluru', km: C2 + 6260, x: 102.1, y: 255.3, side: 'l' },
  { name: 'Chennai', km: C2 + 6550, x: 127.3, y: 254.2, side: 'r' },
];

/** New states on chapter 2; the rest were crossed in chapter 1. */
export const QUAD_STATES: StateMark[] = [
  { name: 'Odisha', km: C2 + 1700 },
  { name: 'West Bengal', km: C2 + 2150 },
  { name: 'Jharkhand', km: C2 + 2640 },
  { name: 'Bihar', km: C2 + 2850 },
  { name: 'Gujarat', km: C2 + 4590 },
];

/** Where the Golden Quadrilateral closes, back in Chennai. */
export const QUAD_DONE_KM = QUAD_ROUTE[QUAD_ROUTE.length - 1].km;

const C3 = QUAD_DONE_KM;
/** Chapter 3: every state and territory still to see. Capitals stand in for each. */
export const TOUR_ROUTE: Stop[] = [
  { name: 'Chennai', km: C3, x: 127.3, y: 254.2, side: 'r' },
  { name: 'Puducherry', km: C3 + 150, x: 123.0, y: 265.6, side: 'r' },
  { name: 'Thiruvananthapuram', km: C3 + 770, x: 96.0, y: 299.8, side: 'l' },
  { name: 'Kavaratti', km: C3 + 1370, x: 55.6, y: 279.3, side: 'l', sea: true },
  { name: 'Panaji', km: C3 + 2520, x: 66.8, y: 230.1, side: 'l', sea: true },
  { name: 'Daman', km: C3 + 3220, x: 57.4, y: 181.0, side: 'l' },
  { name: 'Raipur', km: C3 + 4270, x: 140.1, y: 172.5, side: 'r' },
  { name: 'Port Blair', km: C3 + 6425, x: 244.5, y: 268.8, side: 'r', sea: true },
  { name: 'Gangtok', km: C3 + 8360, x: 205.7, y: 111.7, side: 'l', sea: true },
  { name: 'Dispur', km: C3 + 8890, x: 235.6, y: 123.6, side: 'l' },
  { name: 'Shillong', km: C3 + 8990, x: 236.6, y: 129.2, side: 'l' },
  { name: 'Agartala', km: C3 + 9440, x: 230.8, y: 146.7, side: 'l' },
  { name: 'Aizawl', km: C3 + 9740, x: 244.4, y: 147.7, side: 'r' },
  { name: 'Imphal', km: C3 + 10120, x: 255.8, y: 136.8, side: 'r' },
  { name: 'Kohima', km: C3 + 10260, x: 257.4, y: 128.3, side: 'r' },
  { name: 'Itanagar', km: C3 + 10580, x: 252.7, y: 114.2, side: 'r' },
  { name: 'Dehradun', km: C3 + 12580, x: 106.3, y: 81.8, side: 'r' },
  { name: 'Shimla', km: C3 + 12810, x: 98.2, y: 74.0, side: 'r' },
  { name: 'Chandigarh', km: C3 + 12930, x: 94.5, y: 77.7, side: 'l' },
  { name: 'Amritsar', km: C3 + 13160, x: 76.6, y: 68.7, side: 'l' },
  { name: 'Srinagar', km: C3 + 13640, x: 75.9, y: 44.2, side: 'l' },
  { name: 'Leh', km: C3 + 14060, x: 102.1, y: 43.5, side: 'r' },
];

export const TOUR_STATES: StateMark[] = [
  { name: 'Puducherry', km: C3 + 150, ut: true },
  { name: 'Kerala', km: C3 + 700 },
  { name: 'Lakshadweep', km: C3 + 1370, ut: true },
  { name: 'Goa', km: C3 + 2480 },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', km: C3 + 3220, ut: true },
  { name: 'Chhattisgarh', km: C3 + 4100 },
  { name: 'Andaman and Nicobar Islands', km: C3 + 6425, ut: true },
  { name: 'Sikkim', km: C3 + 8300 },
  { name: 'Assam', km: C3 + 8700 },
  { name: 'Meghalaya', km: C3 + 8950 },
  { name: 'Tripura', km: C3 + 9400 },
  { name: 'Mizoram', km: C3 + 9700 },
  { name: 'Manipur', km: C3 + 10050 },
  { name: 'Nagaland', km: C3 + 10230 },
  { name: 'Arunachal Pradesh', km: C3 + 10500 },
  { name: 'Uttarakhand', km: C3 + 12500 },
  { name: 'Himachal Pradesh', km: C3 + 12750 },
  { name: 'Chandigarh', km: C3 + 12930, ut: true },
  { name: 'Punjab', km: C3 + 13100 },
  { name: 'Jammu and Kashmir', km: C3 + 13450, ut: true },
  { name: 'Ladakh', km: C3 + 13900, ut: true },
];

export interface Chapter {
  n: number;
  name: string;
  route: Stop[];
  states: StateMark[];
  start: number;
  end: number;
}

export const CHAPTERS: Chapter[] = [
  { n: 1, name: 'Delhi to Kanyakumari', route: ROUTE, states: STATES, start: 0, end: TOTAL_KM },
  { n: 2, name: 'The Golden Quadrilateral', route: QUAD_ROUTE, states: QUAD_STATES, start: C2, end: QUAD_DONE_KM },
  { n: 3, name: 'Every state', route: TOUR_ROUTE, states: TOUR_STATES, start: C3, end: TOUR_ROUTE[TOUR_ROUTE.length - 1].km },
];

export const FINAL_KM = CHAPTERS[CHAPTERS.length - 1].end;

/** Every stop in order; a chapter's first stop is the last one's end, so it's listed once. */
export const ALL_STOPS: (Stop & { chapter: number })[] = CHAPTERS.flatMap((c, i) => c.route.slice(i ? 1 : 0).map((s) => ({ ...s, chapter: c.n })));
export const ALL_STATES: (StateMark & { chapter: number })[] = CHAPTERS.flatMap((c) => c.states.map((s) => ({ ...s, chapter: c.n })));
/** 28 states and 8 union territories. */
export const STATE_COUNT = ALL_STATES.filter((s) => !s.ut).length;
export const PLACE_COUNT = ALL_STATES.length;

export function chapterAt(km: number): Chapter {
  return CHAPTERS.find((c) => km < c.end) ?? CHAPTERS[CHAPTERS.length - 1];
}

/** The Golden Quadrilateral, drawn faintly on the map as a teaser during chapter 1. */
export const QUAD = [
  { name: 'Mumbai', x: 57.9, y: 194.2 },
  { name: 'Chennai', x: 127.3, y: 254.2 },
  { name: 'Kolkata', x: 203.4, y: 159.3 },
];

export const INDIA_OUTLINE =
  'M54.3 21 L62.8 16 L76.9 14.5 L86.3 18 L96.6 26 L104.1 29 L112.6 25 L121 25.5 L127.6 32 L123.9 42 L119.2 58 L113.5 62 L113.5 71 L120.1 75 L126.7 82 L125.7 96 L136.1 101 L149.2 110 L163.3 111 L175.6 117 L189.7 120 L200 121 L200.9 112 L205.6 104 L208.5 112 L208.5 115.5 L218.8 117 L238.5 116 L235.7 107 L251.7 102 L269.6 92 L280.8 97 L288.4 103 L283.7 111 L273.3 113 L267.7 119 L262 129 L257.3 145 L250.8 152 L247 165 L242.3 162 L240.4 155 L234.8 155.5 L230.1 151 L231 144 L237.6 142 L240.4 138 L235.7 133.5 L218.8 133 L216.9 130 L217.9 125.5 L210.3 124.5 L203.8 122.5 L200.9 129 L200 134 L205.6 142 L207.5 151 L208.5 161 L210.3 168 L202.8 169 L195.3 169 L189.7 174 L185.9 181 L180.3 186 L172.7 191 L166.2 197 L156.8 206 L147.4 215 L139.8 222 L135.1 227 L127.6 231 L125.7 241 L127.6 254 L123.9 264 L122.9 271 L123.4 282 L118.2 284 L118.2 292 L111.6 296 L106.9 300 L101.7 304.2 L97.5 301 L92.8 296 L89.1 286 L85.3 273 L80.6 265 L75.9 256 L72.2 243 L68.4 234 L65.6 226 L61.8 215 L58.1 199 L57.1 189 L57.1 179 L55.2 170 L55.2 162 L50.5 168 L48.7 173 L42.1 177 L34.6 176 L27 170 L21.4 162 L32.7 156 L25.2 156.5 L17.6 153 L13.9 149 L18.6 145 L27 142 L36.4 141 L41.1 139 L36.4 131 L31.7 125 L26.1 119 L31.7 109 L44 105 L53.4 96 L62.8 86 L68.4 81 L73.1 74 L74 69 L76.9 62 L73.1 59 L64.6 53 L63.7 46 L61.8 37 L58.1 31 L54.3 25 Z';

export const kmFromSteps = (steps: number) => (steps * STRIDE_M) / 1000;

export interface WalkPosition {
  km: number;
  /** The last stop reached and the next one. */
  from: Stop;
  to?: Stop;
  x: number;
  y: number;
  /** Every chapter walked. */
  done: boolean;
  chapter: Chapter;
}

export function positionAt(km: number): WalkPosition {
  const k = Math.max(0, Math.min(km, FINAL_KM));
  for (let i = 0; i < ALL_STOPS.length - 1; i++) {
    const a = ALL_STOPS[i];
    const b = ALL_STOPS[i + 1];
    if (k < b.km) {
      const f = (k - a.km) / (b.km - a.km);
      return { km: k, from: a, to: b, x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, done: false, chapter: chapterAt(k) };
    }
  }
  const last = ALL_STOPS[ALL_STOPS.length - 1];
  return { km: k, from: last, x: last.x, y: last.y, done: true, chapter: CHAPTERS[CHAPTERS.length - 1] };
}

/** The day each point along the way was passed, walking the running total day by day. */
export function crossings<T extends { name: string; km: number }>(stepsByDay: Map<DayKey, number>, stops: T[]): (T & { date: DayKey })[] {
  const days = [...stepsByDay.keys()].sort();
  const out: (T & { date: DayKey })[] = [];
  if (!days.length) return out;
  const sorted = [...stops].sort((a, b) => a.km - b.km);
  let km = 0;
  let next = 0;
  while (next < sorted.length && sorted[next].km <= 0) out.push({ ...sorted[next++], date: days[0] });
  for (let d = days[0]; d <= days[days.length - 1]; d = addDays(d, 1)) {
    km += kmFromSteps(stepsByDay.get(d) ?? 0);
    while (next < sorted.length && km >= sorted[next].km) out.push({ ...sorted[next++], date: d });
  }
  return out;
}

/** Every stop reached, in order, with its chapter. Cities met twice appear twice. */
export function arrivals(stepsByDay: Map<DayKey, number>): { name: string; km: number; date: DayKey; chapter: number }[] {
  return crossings(
    stepsByDay,
    ALL_STOPS.map((s) => ({ name: s.name, km: s.km, chapter: s.chapter })),
  );
}

/** The first day in each state or territory. */
export function stateEntries(stepsByDay: Map<DayKey, number>): { name: string; km: number; date: DayKey; ut?: boolean }[] {
  const seen = new Set<string>();
  return crossings(stepsByDay, ALL_STATES).filter((s) => !seen.has(s.name) && seen.add(s.name));
}

/** States and territories reached, each once. */
export function statesReached(km: number): StateMark[] {
  const seen = new Set<string>();
  return ALL_STATES.filter((s) => s.km <= km && !seen.has(s.name) && seen.add(s.name));
}

/** Distinct cities along the whole walk, in the order you first reach them. */
export const CITIES: string[] = [...new Set(ALL_STOPS.map((s) => s.name))];

/** A line for each city's postcard. */
export const POSTCARDS: Record<string, string> = {
  Delhi: 'The walk starts in the capital, with 2,870 km ahead, one lap of home at a time.',
  Agra: 'Shah Jahan began the Taj Mahal in 1632, and the whole complex took about two decades. Next stop: the fort at Gwalior.',
  Gwalior: 'Gwalior Fort sits on a sandstone hill; Babur called it the pearl among the fortresses of Hind. Next stop: Bhopal, the city of lakes.',
  Bhopal: 'Bhopal is built around its lakes, and the Upper Lake is about a thousand years old. Next stop: Nagpur and the Zero Mile Stone.',
  Nagpur: 'The Zero Mile Stone here once marked the centre of British India. Next stop: Hyderabad.',
  Hyderabad: 'Charminar has stood here since 1591, and the biryani has been the city’s pride for about as long. Next stop: Bengaluru.',
  Bengaluru: 'The garden city: the glasshouse at Lalbagh was modelled on London’s Crystal Palace. Next stop: Madurai.',
  Madurai: 'The towers of the Meenakshi Temple are covered in thousands of painted figures. Next stop: the southern tip.',
  Kanyakumari: 'Three seas meet at the southern tip of India, and you walked here from Delhi. Chapter 1 is done.',
  Chennai: 'Marina Beach stretches for kilometres along the Bay of Bengal. The Golden Quadrilateral starts here, and ends here too.',
  Nellore: 'Nellore sits on the Penna river, and its rice is known across the south.',
  Vijayawada: 'The Prakasam Barrage crosses the Krishna here, and the railway junction is one of the busiest in the country.',
  Visakhapatnam: 'Vizag keeps a real submarine as a museum, right on the beach.',
  Bhubaneswar: 'The temple city: hundreds of old temples, with the Lingaraj among the grandest.',
  Kolkata: 'The Howrah Bridge carries a river of people across the Hooghly every day. A quarter of the quadrilateral is done.',
  Varanasi: 'One of the oldest living cities in the world, its ghats stepping down to the Ganga.',
  Kanpur: 'Kanpur grew as an industrial city on the Ganga, long famous for its leather.',
  Jaipur: 'The Pink City: the old town was painted pink to welcome the Prince of Wales in 1876.',
  Udaipur: 'The city of lakes, with the City Palace looking out over Lake Pichola.',
  Ahmedabad: 'India’s first UNESCO World Heritage City, and home to the Sabarmati Ashram.',
  Surat: 'Most of the world’s diamonds are cut and polished here.',
  Mumbai: 'The Gateway of India faces the Arabian Sea, and the local trains carry millions every day.',
  Pune: 'Shaniwar Wada, the Peshwas’ fort-palace, still stands in the old city.',
  Belagavi: 'On the Karnataka–Maharashtra border, and famous for a sweet called kunda.',
  Hubballi: 'Hubballi and Dharwad are twin cities, and Dharwad pedha is the one to try.',
  Puducherry: 'The French Quarter keeps its yellow walls and bougainvillea, a short walk from the promenade.',
  Thiruvananthapuram: 'Kerala’s capital, and home to the Padmanabhaswamy Temple.',
  Kavaratti: 'Lakshadweep means a hundred thousand islands; only about ten are lived on. You sailed here.',
  Panaji: 'Goa’s capital sits on the Mandovi, with Portuguese-era houses in the Fontainhas quarter.',
  Daman: 'Old Portuguese forts stand where the Daman Ganga meets the sea.',
  Raipur: 'The capital of Chhattisgarh, the state they call the rice bowl of India.',
  'Port Blair': 'The Cellular Jail, now a national memorial, looks out over the sea. Another one by boat.',
  Gangtok: 'On a clear day, Kangchenjunga fills the sky over Gangtok.',
  Dispur: 'Assam’s capital, near the Brahmaputra. Assam grows more tea than anywhere else in India.',
  Shillong: 'The Scotland of the East, up in the pine-covered Khasi Hills.',
  Agartala: 'The white Ujjayanta Palace sits at the heart of Tripura’s capital.',
  Aizawl: 'Aizawl is built along steep ridges, its houses stacked up the hillsides.',
  Imphal: 'Loktak Lake nearby has floating islands of vegetation called phumdis.',
  Kohima: 'Every December the Hornbill Festival brings Nagaland’s tribes together near Kohima.',
  Itanagar: 'Arunachal is the land of the dawn-lit mountains, where India’s day begins.',
  Dehradun: 'In the Doon Valley, between the Himalaya and the Shivaliks.',
  Shimla: 'The old summer capital, with a toy train that climbs up from Kalka.',
  Chandigarh: 'Le Corbusier planned the city, and Nek Chand’s Rock Garden grew in a corner of it.',
  Amritsar: 'The Golden Temple’s langar serves free meals to tens of thousands of people a day.',
  Srinagar: 'Houseboats line Dal Lake, and shikaras glide between them.',
  Leh: 'About 3,500 metres up. Every state and territory in India, on foot at home: you walked them all.',
};
