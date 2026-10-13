import type { RegionId } from '../ui/light';
import type { RingStyle } from '../ui/rings/styles';
import type { DayKey } from './dates';

export type CalendarKind = 'festival' | 'world' | 'sky' | 'nerdy' | 'nature' | 'personal';

export interface CalendarEntry {
  id: string;
  name: string;
  kind: CalendarKind;
  from: DayKey;
  to: DayKey;
  /** One plain line on why today is special. */
  why: string;
  ring: RingStyle;
  /** Two inks for the day's accents; the metric inks never change. */
  palette: [string, string];
  /** Preferred when the walk is in this region. */
  region?: RegionId;
}

/*
 * Moving festivals are listed by year from published calendars (drikpanchang and others for
 * Indian festivals). They are worth checking against a current calendar before relying on them.
 */
const MOVING: [string, string, CalendarKind, [DayKey, DayKey][], string, RingStyle, [string, string], RegionId?][] = [
  ['diwali', 'Diwali', 'festival', [['2026-11-08', '2026-11-08'], ['2027-10-29', '2027-10-29'], ['2028-10-17', '2028-10-17']], 'The festival of lights: diyas on every ledge, and the year turning toward winter.', 'scallop', ['#f2c46d', '#e98a5b']],
  ['holi', 'Holi', 'festival', [['2026-03-04', '2026-03-04'], ['2027-03-22', '2027-03-22'], ['2028-03-11', '2028-03-11']], 'Colour thrown at everyone, spring arriving, old quarrels let go.', 'thrown', ['#e79a9a', '#b7a6f0']],
  ['lunar-new-year', 'Lunar New Year', 'world', [['2026-02-17', '2026-02-17'], ['2027-02-06', '2027-02-06'], ['2028-01-26', '2028-01-26']], 'The new moon that starts the year across much of East Asia, red lanterns everywhere.', 'lantern', ['#e79a9a', '#f2c46d']],
  ['eid-al-fitr', 'Eid al-Fitr', 'festival', [['2026-03-20', '2026-03-20'], ['2027-03-10', '2027-03-10'], ['2028-02-27', '2028-02-27']], 'The end of Ramzan: sewaiyan, new clothes and visits that last all day.', 'stars', ['#8fc9b0', '#f2c46d']],
  ['durga-puja', 'Durga Puja', 'festival', [['2026-10-17', '2026-10-20'], ['2027-10-06', '2027-10-09'], ['2028-09-24', '2028-09-27']], 'Pandals across Bengal, dhak drums and the goddess’s homecoming.', 'blossom', ['#e98a5b', '#e79a9a'], 'east'],
  ['ganesh-chaturthi', 'Ganesh Chaturthi', 'festival', [['2026-09-14', '2026-09-14'], ['2027-09-04', '2027-09-04'], ['2028-08-23', '2028-08-23']], 'Ganesha arrives in homes and streets; modak for everyone.', 'marigold', ['#f2c46d', '#e98a5b'], 'deccan'],
  ['onam', 'Onam', 'festival', [['2026-08-26', '2026-08-26'], ['2027-09-12', '2027-09-12'], ['2028-08-31', '2028-08-31']], 'Kerala’s harvest festival: pookalam flower carpets and a sadya on banana leaves.', 'blossom', ['#f2c46d', '#8fc9b0'], 'ghats'],
  ['navratri', 'Navratri', 'festival', [['2026-10-11', '2026-10-19'], ['2027-09-30', '2027-10-08'], ['2028-09-19', '2028-09-27']], 'Nine nights of garba and dandiya, Gujarat dancing till late.', 'scallop', ['#e79a9a', '#f2c46d'], 'desert'],
  ['raksha-bandhan', 'Raksha Bandhan', 'festival', [['2026-08-28', '2026-08-28'], ['2027-08-17', '2027-08-17'], ['2028-08-05', '2028-08-05']], 'Rakhis tied on wrists, and sweets passed between siblings.', 'ripple', ['#e79a9a', '#f2c46d']],
];

/** Fixed dates, the same every year. */
const FIXED: [string, string, CalendarKind, string, string, string, RingStyle, [string, string], RegionId?][] = [
  ['new-year', 'New Year', 'world', '01-01', '01-01', 'A new year, and the first steps of it.', 'sparks', ['#f2c46d', '#b7a6f0']],
  ['quadrantids', 'Quadrantids peak', 'sky', '01-03', '01-03', 'One of the year’s strongest meteor showers, best before dawn.', 'stars', ['#8fb6c9', '#b7a6f0']],
  ['uttarayan', 'Uttarayan', 'festival', '01-14', '01-14', 'Kites over every Gujarat rooftop as the sun turns north.', 'kite', ['#e98a5b', '#8fb6c9'], 'desert'],
  ['pongal', 'Pongal', 'festival', '01-15', '01-15', 'Tamil Nadu’s harvest: rice boiled over in a new pot, kolams at every door.', 'marigold', ['#f2c46d', '#8fc9b0'], 'coast'],
  ['pi-day', 'Pi Day', 'nerdy', '03-14', '03-14', '3.14, the ratio of every circle, these rings included.', 'digits', ['#e98a5b', '#b7a6f0']],
  ['equinox-march', 'March equinox', 'nature', '03-20', '03-20', 'Day and night are nearly equal everywhere today.', 'ripple', ['#8fc9b0', '#f2c46d']],
  ['hanami', 'Hanami', 'world', '04-01', '04-01', 'Cherry-blossom viewing in Japan, at its height around now.', 'blossom', ['#e79a9a', '#ede6da']],
  ['bihu', 'Rongali Bihu', 'festival', '04-14', '04-14', 'Assam’s new year: Bihu dances, pitha and the start of spring.', 'thrown', ['#8fc9b0', '#e79a9a'], 'northeast'],
  ['star-wars', 'Star Wars Day', 'nerdy', '05-04', '05-04', 'May the fourth be with you.', 'stars', ['#f2c46d', '#8fb6c9']],
  ['towel-day', 'Towel Day', 'nerdy', '05-25', '05-25', 'For Douglas Adams. Know where your towel is.', 'digits', ['#8fb6c9', '#f2c46d']],
  ['monsoon-kerala', 'The monsoon reaches Kerala', 'nature', '06-01', '06-01', 'The south-west monsoon usually arrives on Kerala’s coast around today.', 'ripple', ['#8fb6c9', '#8fc9b0'], 'ghats'],
  ['solstice-june', 'June solstice', 'nature', '06-21', '06-21', 'The longest day of the year in India.', 'sparks', ['#f2c46d', '#e98a5b']],
  ['monsoon-delhi', 'First monsoon rain', 'nature', '06-28', '06-28', 'The monsoon usually reaches Delhi around now: petrichor and chai.', 'ripple', ['#8fb6c9', '#8fc9b0'], 'plains'],
  ['perseids', 'Perseids peak', 'sky', '08-12', '08-12', 'The summer’s great meteor shower, if the clouds allow.', 'stars', ['#8fb6c9', '#f2c46d']],
  ['programmers-day', 'Programmers’ Day', 'nerdy', '09-13', '09-13', 'The 256th day of the year. 2⁸.', 'digits', ['#8fc9b0', '#b7a6f0']],
  ['equinox-september', 'September equinox', 'nature', '09-22', '09-22', 'Day and night balance again; nights lengthen from here.', 'ripple', ['#f2c46d', '#8fb6c9']],
  ['orionids', 'Orionids peak', 'sky', '10-21', '10-21', 'Dust from Halley’s comet, burning up overhead. Look east after midnight.', 'stars', ['#b7a6f0', '#8fb6c9']],
  ['mole-day', 'Mole Day', 'nerdy', '10-23', '10-23', '6.02 × 10²³, celebrated from 6:02 on 10/23.', 'digits', ['#b7a6f0', '#e98a5b']],
  ['dia-de-muertos', 'Día de Muertos', 'world', '11-02', '11-02', 'Mexico remembers its dead with marigolds and bright altars.', 'marigold', ['#e98a5b', '#b7a6f0']],
  ['leonids', 'Leonids peak', 'sky', '11-17', '11-17', 'A quick, bright meteor shower from the comet Tempel–Tuttle.', 'stars', ['#8fb6c9', '#ede6da']],
  ['geminids', 'Geminids peak', 'sky', '12-14', '12-14', 'Often the year’s best meteor shower, and in the early evening too.', 'stars', ['#ede6da', '#8fb6c9']],
  ['solstice-december', 'December solstice', 'nature', '12-21', '12-21', 'The shortest day. From tomorrow, the light comes back.', 'sparks', ['#b7a6f0', '#f2c46d']],
  ['christmas', 'Christmas', 'festival', '12-25', '12-25', 'Stars on balconies and plum cake in every bakery.', 'cane', ['#e79a9a', '#8fc9b0']],
];

const YEARS = [2026, 2027, 2028];

export const CALENDAR_DATA: CalendarEntry[] = [
  ...MOVING.flatMap(([id, name, kind, dates, why, ring, palette, region]) => dates.map(([from, to]) => ({ id: `${id}-${from.slice(0, 4)}`, name, kind, from, to, why, ring, palette, ...(region ? { region } : {}) }))),
  ...FIXED.flatMap(([id, name, kind, from, to, why, ring, palette, region]) => YEARS.map((y) => ({ id: `${id}-${y}`, name, kind, from: `${y}-${from}`, to: `${y}-${to}`, why, ring, palette, ...(region ? { region } : {}) }))),
];
