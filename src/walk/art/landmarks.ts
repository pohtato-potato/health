import { ALL_STOPS } from '../../domain/walk';
import { regionAt } from '../../domain/regions';
import type { RegionId } from '../../ui/light';

/**
 * Landmark silhouettes, drawn in a 120-wide box standing on y = 0 (heights go negative).
 * Each is flat, layered paths: a main body, and sometimes windows that light up at night.
 */
export interface Landmark {
  kind: string;
  label: string;
  region: RegionId;
  /** Body paths, filled with the silhouette ink. */
  paths: string[];
  /** Small shapes lit warm at dusk and night: windows, lamps. */
  lights?: string[];
  /** Pale accents: snow, water. */
  accents?: string[];
}

type Shape = Pick<Landmark, 'paths' | 'lights' | 'accents'>;

const r = (n: number) => Math.round(n * 10) / 10;

/** Battlements along the top of a wall, from x0 to x1 at height y. */
function crenels(x0: number, x1: number, y: number, step = 6, depth = 4): string {
  let d = '';
  for (let x = x0; x < x1; x += step) d += `H${r(Math.min(x + step / 2, x1))}V${r(y + depth)}H${r(Math.min(x + step, x1))}V${y}`;
  return d;
}

const onion = (cx: number, base: number, w: number, h: number) =>
  `M${cx - w / 2} ${base}C${cx - w / 2} ${base - h * 0.55} ${cx - w * 0.08} ${base - h * 0.7} ${cx} ${base - h}C${cx + w * 0.08} ${base - h * 0.7} ${cx + w / 2} ${base - h * 0.55} ${cx + w / 2} ${base}Z`;
const minaret = (x: number, h: number, w = 4) => `M${x - w / 2} 0V${-h}H${x + w / 2}V0Z${onion(x, -h, w + 3, 7)}`;
const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const win = (x: number, y: number, w = 3, h = 5) => rect(x, y, w, h);

/** A row of arches from x0 to x1: piers down to `bottom`, and the walling above each arch up to `top`. */
function arches(x0: number, x1: number, n: number, top: number, bottom: number, pier = 4): string[] {
  const span = (x1 - x0 - pier) / n;
  const out: string[] = [];
  for (let i = 0; i <= n; i++) out.push(rect(r(x0 + i * span), top, pier, bottom - top));
  const spring = top + (bottom - top) * 0.45;
  for (let i = 0; i < n; i++) {
    const a = r(x0 + i * span + pier);
    const b = r(x0 + (i + 1) * span);
    out.push(`M${a} ${top}H${b}V${r(spring)}Q${r((a + b) / 2)} ${r(top - (spring - top) * 0.2)} ${a} ${r(spring)}Z`);
  }
  return out;
}

const SHAPES: Record<string, () => Shape> = {
  fort: () => ({
    paths: [
      `M4 0V-30${crenels(4, 30, -30)}H30V-44${crenels(30, 44, -44)}H44V-30${crenels(44, 82, -30)}H82V-48${crenels(82, 98, -48)}H98V-30${crenels(98, 116, -30)}H116V0Z`,
    ],
    lights: [win(36, -36), win(88, -40), win(60, -22), win(70, -22), win(14, -20)],
  }),
  dome: () => ({
    paths: [`M30 0V-26H90V0Z`, onion(60, -26, 34, 34), rect(57, -64, 6, 6), minaret(18, 44), minaret(102, 44), minaret(8, 34), minaret(112, 34)],
  }),
  arch: () => ({
    paths: [`M30 0V-52H90V0H70V-30C70 -38 50 -38 50 -30V0Z`, rect(26, -58, 68, 6), rect(40, -64, 40, 6)],
    lights: [rect(56, -36, 8, 2)],
  }),
  pillar: () => ({ paths: [rect(54, -40, 12, 40), rect(50, -44, 20, 4), rect(46, -6, 28, 6), `M56 -44L60 -52L64 -44Z`] }),
  charminar: () => ({
    paths: [`M28 0V-40H92V0H70V-22C70 -30 50 -30 50 -22V0Z`, rect(26, -44, 68, 4), minaret(28, 68, 7), minaret(92, 68, 7), onion(60, -44, 20, 14)],
  }),
  palace: () => ({
    paths: [rect(8, -26, 104, 26), rect(40, -40, 40, 14), onion(60, -40, 22, 20), onion(20, -26, 10, 9), onion(100, -26, 10, 9), onion(44, -40, 8, 8), onion(76, -40, 8, 8)],
    lights: [win(16, -18), win(26, -18), win(36, -18), win(78, -18), win(88, -18), win(98, -18), win(54, -34), win(63, -34)],
  }),
  hawa: () => {
    const tiers = [0, 1, 2, 3, 4].map((i) => rect(20 + i * 8, -16 - i * 12, 80 - i * 16, 12));
    const wins = [0, 1, 2, 3].flatMap((i) => [0, 1, 2, 3].map((j) => win(26 + i * 8 + j * 18 - i * 4, -12 - i * 12, 3, 4)));
    return { paths: [rect(14, -16, 92, 16), ...tiers, onion(60, -76, 12, 10)], lights: wins };
  },
  ghat: () => ({
    paths: [`M0 0V-6H120V0Z`, `M6 -6V-12H114V-6Z`, `M14 -12V-18H106V-12Z`, `M26 -18C25 -36 32 -48 36 -52C40 -48 47 -36 46 -18Z`, `M70 -18C69 -42 78 -58 84 -64C90 -58 99 -42 98 -18Z`, rect(52, -30, 12, 12)],
    lights: [win(56, -26, 2, 3), win(82, -26, 2, 3), win(34, -24, 2, 3)],
  }),
  rock: () => ({ paths: [`M10 0C12 -10 22 -16 36 -16C52 -16 60 -10 66 -4L76 0Z`, rect(26, -30, 22, 14), `M24 -30L37 -44L50 -30Z`, `M78 0C80 -6 88 -10 98 -10C106 -10 112 -6 114 0Z`, rect(92, -24, 6, 14)] }),
  lighthouse: () => ({ paths: [`M50 0L54 -62H66L70 0Z`, rect(52, -72, 16, 10), `M50 -72L60 -82L70 -72Z`], lights: [rect(55, -70, 10, 6)], accents: [rect(51, -40, 18, 6), rect(52, -22, 16, 6)] }),
  bridge: () => ({
    paths: [rect(0, -14, 120, 4), `M22 -10V-62H30V-10Z`, `M90 -10V-62H98V-10Z`, `M26 -60Q60 -24 94 -60L94 -56Q60 -20 26 -56Z`, `M0 -60Q12 -40 26 -14L22 -14Q10 -38 0 -54Z`, `M120 -60Q108 -40 94 -14L98 -14Q110 -38 120 -54Z`],
    lights: [rect(10, -13, 2, 2), rect(40, -13, 2, 2), rect(70, -13, 2, 2), rect(104, -13, 2, 2)],
  }),
  clocktower: () => ({ paths: [rect(48, -60, 24, 60), `M46 -60L60 -76L74 -60Z`, rect(40, -8, 40, 8)], lights: [`M60 -48m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0Z`] }),
  step: () => ({ paths: [`M10 0V-24H110V0Z`, `M24 -24V-34H96V-24Z`, rect(34, -46, 6, 12), rect(80, -46, 6, 12), rect(30, -48, 60, 4)], lights: [win(30, -18, 4, 8), win(48, -18, 4, 8), win(66, -18, 4, 8), win(84, -18, 4, 8)] }),
  peaks: () => ({
    paths: [`M0 0L28 -46L42 -30L66 -74L88 -40L100 -52L120 0Z`],
    accents: [`M56 -56L66 -74L76 -56L70 -60L66 -54L61 -60Z`, `M22 -36L28 -46L34 -38L30 -40Z`, `M96 -46L100 -52L105 -44Z`],
  }),
  hills: () => ({
    paths: [`M0 0C10 -24 30 -34 48 -30C64 -26 72 -44 92 -42C108 -40 116 -24 120 0Z`],
    accents: [`M14 -10h18v1.5h-18zM20 -16h20v1.5h-20zM60 -20h24v1.5h-24zM70 -28h20v1.5h-20zM96 -18h14v1.5h-14z`],
    lights: [win(40, -14, 3, 3), win(78, -16, 3, 3), win(56, -10, 3, 3)],
  }),
  lake: () => ({
    paths: [`M0 -9C16 -26 32 -30 50 -26C64 -23 78 -34 96 -31C108 -29 116 -20 120 -9Z`, `M22 -14H54L49 -9H27Z`, `M80 -12H98L95 -9H83Z`],
    // sails pale against the far shore, water below the hulls
    accents: [rect(0, -9, 120, 9), `M38 -15V-42L54 -17Z`, `M36 -16L24 -36V-16Z`, `M89 -13V-28L98 -14Z`],
    lights: [win(60, -26, 3, 3), win(104, -27, 3, 3)],
  }),
  riverbridge: () => ({ paths: [rect(0, -22, 120, 4), ...arches(2, 118, 5, -18, -2, 6)], accents: [rect(0, -2, 120, 2)], lights: [rect(14, -21, 2, 2), rect(46, -21, 2, 2), rect(78, -21, 2, 2), rect(106, -21, 2, 2)] }),
  hillriver: () => ({
    paths: [
      `M0 -4C16 -20 34 -42 58 -46C80 -48 100 -28 120 -4V0H0Z`,
    ],
    accents: [
      `M0 -4C30 -8 62 -1 120 -6V0H0Z`,
      // the elephant carved from the rock at the foot of the hill, beside the edicts
      `M66 -8C66 -22 74 -28 86 -28C96 -28 102 -22 102 -14V-8H97V-14H92V-8H78V-14H73V-8Z`,
      `M66 -20C61 -17 60 -10 63 -8H66Z`,
    ],
  }),
  arcade: () => ({
    paths: [rect(8, -34, 104, 34), rect(4, -38, 112, 4), `M44 -38C44 -58 76 -58 76 -38Z`, rect(59, -62, 2, 6), `M10 -38C10 -46 22 -46 22 -38Z`, `M98 -38C98 -46 110 -46 110 -38Z`],
    lights: [14, 30, 46, 64, 80, 96].map((x) => `M${x} -4V-18Q${x + 5} -28 ${x + 10} -18V-4Z`),
  }),
  museum: () => ({
    paths: [rect(14, -26, 92, 26), `M8 -26L24 -44H96L112 -26Z`, `M36 -44L48 -58H72L84 -44Z`, rect(59, -64, 2, 6)],
    lights: [win(22, -18), win(34, -18), win(46, -18), win(70, -18), win(82, -18), win(94, -18), win(58, -52, 4, 4)],
  }),
  houses: () => ({
    paths: [rect(6, -30, 34, 30), `M2 -30L23 -44L44 -30Z`, rect(44, -36, 34, 36), `M40 -36L61 -50L82 -36Z`, rect(82, -28, 34, 28), `M78 -28L99 -40L120 -28Z`],
    accents: [rect(48, -20, 26, 2), rect(10, -16, 26, 2), rect(86, -14, 26, 2)],
    lights: [win(14, -26), win(28, -26), win(52, -32), win(68, -32), win(92, -24), win(106, -24)],
  }),
  viaduct: () => ({
    paths: [...arches(4, 116, 6, -26, 0), ...arches(8, 112, 8, -46, -26, 3), rect(4, -50, 112, 4), rect(68, -58, 22, 8), rect(66, -60, 26, 2)],
    lights: [win(71, -56, 3, 3), win(77, -56, 3, 3), win(83, -56, 3, 3)],
  }),
  townhall: () => ({
    paths: [rect(10, -30, 100, 30), rect(6, -34, 108, 4), rect(50, -58, 20, 24), `M48 -58L60 -66L72 -58Z`],
    lights: [...[16, 28, 40, 74, 86, 98].map((x) => `M${x} -6V-18Q${x + 3} -23 ${x + 6} -18V-6Z`), `M60 -48m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z`],
  }),
  ridgepalace: () => ({
    paths: [`M0 0C20 -10 34 -18 50 -20H84C96 -16 108 -8 120 0Z`, `M44 -20L48 -76H90L94 -20Z`, rect(56, -82, 22, 6)],
    lights: [52, 62, 72, 82].flatMap((x) => [win(x, -66, 3, 4), win(x, -50, 3, 4), win(x, -34, 3, 4)]),
  }),
  hand: () => ({ paths: [`M54 0V-20H66V0Z`, `M44 -20C40 -36 42 -52 48 -60L50 -46C52 -60 56 -66 60 -66C64 -66 68 -60 70 -46L72 -60C78 -52 80 -36 76 -20Z`] }),
};

/** Which landmark each stop gets, and its label. */
const STOP_ART: Record<string, [string, string]> = {
  Delhi: ['arch', 'India Gate'],
  Agra: ['dome', 'the Taj Mahal'],
  Gwalior: ['fort', 'the fort'],
  Bhopal: ['lake', 'the Upper Lake'],
  Nagpur: ['pillar', 'the Zero Mile Stone'],
  Hyderabad: ['charminar', 'the Charminar'],
  Bengaluru: ['palace', 'Vidhana Soudha'],
  Madurai: ['arcade', 'Thirumalai Nayak Palace'],
  Kanyakumari: ['rock', 'the rock memorial'],
  Chennai: ['lighthouse', 'the Marina lighthouse'],
  Nellore: ['riverbridge', 'the bridge over the Penna'],
  Vijayawada: ['bridge', 'the Prakasam barrage'],
  Visakhapatnam: ['hills', 'the Kailasagiri hills'],
  Bhubaneswar: ['hillriver', 'Dhauli hill above the Daya'],
  Kolkata: ['bridge', 'the Howrah Bridge'],
  Varanasi: ['ghat', 'the ghats'],
  Kanpur: ['clocktower', 'the Ghanta Ghar'],
  Jaipur: ['hawa', 'the Hawa Mahal'],
  Udaipur: ['palace', 'the City Palace'],
  Ahmedabad: ['step', 'the Adalaj stepwell'],
  Surat: ['fort', 'the old castle'],
  Mumbai: ['arch', 'the Gateway of India'],
  Pune: ['fort', 'Shaniwar Wada'],
  Belagavi: ['fort', 'the Belagavi fort'],
  Hubballi: ['lake', 'Unkal Lake'],
  Puducherry: ['lighthouse', 'the old lighthouse'],
  Thiruvananthapuram: ['museum', 'the Napier Museum'],
  Kavaratti: ['lighthouse', 'the lagoon lighthouse'],
  Panaji: ['houses', 'the Fontainhas houses'],
  Daman: ['fort', 'the Moti Daman fort'],
  Raipur: ['clocktower', 'the old clock tower'],
  'Port Blair': ['fort', 'the Cellular Jail'],
  Gangtok: ['peaks', 'Kangchenjunga'],
  Dispur: ['hills', 'the tea gardens'],
  Shillong: ['hills', 'the pine hills'],
  Agartala: ['palace', 'the Ujjayanta Palace'],
  Aizawl: ['hills', 'the ridge-top town'],
  Imphal: ['hills', 'Loktak Lake'],
  Kohima: ['hills', 'the hill town'],
  Itanagar: ['peaks', 'the eastern Himalaya'],
  Dehradun: ['clocktower', 'the Ghanta Ghar'],
  Shimla: ['viaduct', "the toy train's viaduct"],
  Chandigarh: ['hand', 'the Open Hand'],
  Amritsar: ['townhall', 'the Town Hall'],
  Srinagar: ['peaks', 'the Zabarwan range'],
  Leh: ['ridgepalace', 'Leh Palace'],
};

export const LANDMARKS: Record<string, Landmark> = Object.fromEntries(
  Object.entries(STOP_ART).map(([city, [kind, label]]) => {
    const stop = ALL_STOPS.find((s) => s.name === city);
    return [city, { kind, label, region: regionAt(stop?.km ?? 0), ...SHAPES[kind]() }];
  }),
);

export function landmarkFor(city: string): Landmark | undefined {
  return LANDMARKS[city];
}
