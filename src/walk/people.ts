import type { DayKey } from '../domain/dates';
import { regionAt } from '../domain/regions';
import type { Day } from '../domain/types';
import { kmFromSteps } from '../domain/walk';
import type { RegionId } from '../ui/light';

export interface Traveller {
  name: string;
  /** Who they are, in a few words. */
  who: string;
  /** What they were doing or said: specific, never a postcard cliché. */
  line: string;
  region: RegionId;
}

/** People met on the road, a few per region, each doing something particular. */
export const PEOPLE_ON_THE_ROAD: Traveller[] = [
  { region: 'plains', name: 'Rekha', who: 'a seed-shop owner', line: 'Was weighing mustard seed by the fistful and swore the scale was only for show.' },
  { region: 'plains', name: 'Imran', who: 'a truck driver on the Agra run', line: 'Shared his thermos of ginger tea and a theory about which dhabas use real ghee.' },
  { region: 'plains', name: 'Sunita', who: 'a schoolteacher on a bicycle', line: 'Was carrying forty answer sheets in a cloth bag and grading them at red lights.' },
  { region: 'plains', name: 'Harpreet', who: 'a mechanic', line: 'Fixed a stranger’s chain for free and refused to be thanked twice.' },
  { region: 'plains', name: 'Gopal', who: 'a retired postman', line: 'Still walks his old route every morning, just to see who has moved.' },
  { region: 'ravines', name: 'Bhanwar', who: 'a boatman on the Chambal', line: 'Pointed out three gharials before you had seen one.' },
  { region: 'ravines', name: 'Kamla', who: 'a forest guard', line: 'Counts the birds at dawn and writes the numbers in a notebook older than her phone.' },
  { region: 'ravines', name: 'Aslam', who: 'a potter', line: 'Was drying a hundred kulhads in the sun, every one a slightly different shape.' },
  { region: 'ravines', name: 'Devika', who: 'a history student', line: 'Was measuring a fort wall with a tailor’s tape, for reasons she promised were academic.' },
  { region: 'desert', name: 'Moti Ram', who: 'a camel breeder', line: 'Knew each of his forty camels by the way it complained.' },
  { region: 'desert', name: 'Jasoda', who: 'a block printer', line: 'Had indigo up to her wrists and a pattern she has printed since she was nine.' },
  { region: 'desert', name: 'Farid', who: 'a folk singer’s nephew', line: 'Was tuning his uncle’s kamaicha and pretending not to practise.' },
  { region: 'desert', name: 'Kavita', who: 'a solar-panel installer', line: 'Was cleaning dust off a rooftop of panels with a long-handled mop and great patience.' },
  { region: 'deccan', name: 'Sudha', who: 'a bus conductor', line: 'Remembered every regular’s stop and called it before they asked.' },
  { region: 'deccan', name: 'Raghav', who: 'a weather-station volunteer', line: 'Reads the rain gauge at eight sharp and has not missed a morning in six years.' },
  { region: 'deccan', name: 'Lakshmi', who: 'a jowar farmer', line: 'Was arguing, cheerfully, with a parrot that had found her field.' },
  { region: 'deccan', name: 'Salim', who: 'a bangle seller', line: 'Could tell your size from across the road and was rarely wrong.' },
  { region: 'deccan', name: 'Meera', who: 'a geologist', line: 'Was photographing basalt and explaining lava flows to anyone who slowed down.' },
  { region: 'ghats', name: 'Anil', who: 'a tea taster', line: 'Slurped six cups in a row and described each like an old friend.' },
  { region: 'ghats', name: 'Rosamma', who: 'a cardamom grower', line: 'Showed how the pods hide low under the leaves, where only patient hands find them.' },
  { region: 'ghats', name: 'Vinod', who: 'a trail runner', line: 'Was training on the hairpin bends and lapped you twice, apologising both times.' },
  { region: 'ghats', name: 'Shreya', who: 'a frog researcher', line: 'Was listening for one call in the rain that only a handful of people have recorded.' },
  { region: 'coast', name: 'Joseph', who: 'a net mender', line: 'Was mending a net longer than the street, by feel, while talking about cricket.' },
  { region: 'coast', name: 'Hetal', who: 'an architecture student', line: 'Was sketching doorways for her thesis and says the best ones are never on the main road.' },
  { region: 'coast', name: 'Fatima', who: 'a dry-fish trader', line: 'Laid out silver rows to dry and knew to the hour when the rain would come.' },
  { region: 'coast', name: 'Prakash', who: 'a lighthouse keeper', line: 'Climbs a hundred and forty steps twice a day and still counts them.' },
  { region: 'coast', name: 'Leela', who: 'a toddy tapper’s daughter', line: 'Was sending a message to her brother up a palm using only whistles.' },
  { region: 'east', name: 'Bishnu', who: 'a ferryman on the Hooghly', line: 'Has crossed the river four thousand times by his count and still watches the light.' },
  { region: 'east', name: 'Moumita', who: 'a terracotta artisan', line: 'Was pressing a horse into clay with a mould her grandmother carved.' },
  { region: 'east', name: 'Rafiq', who: 'a jute weaver', line: 'Explained why a good sack outlives the man who sews it.' },
  { region: 'east', name: 'Ananya', who: 'a chess coach', line: 'Was teaching an opening to six children on one board under a banyan.' },
  { region: 'northeast', name: 'Lalthan', who: 'a bamboo builder', line: 'Was lashing a bridge together without a single nail and checked every knot twice.' },
  { region: 'northeast', name: 'Dipali', who: 'a tea-estate nurse', line: 'Walks four gardens a day with a bag of medicines and a very good umbrella.' },
  { region: 'northeast', name: 'Tenzing', who: 'a weaver', line: 'Was weaving a pattern that, she said, tells you which village it came from.' },
  { region: 'northeast', name: 'Kiran', who: 'an orchid grower', line: 'Keeps a notebook of every flower that has opened since 2019.' },
  { region: 'himalaya', name: 'Dorje', who: 'a road-crew foreman', line: 'Clears the pass every spring and knows each bend by the snow it holds.' },
  { region: 'himalaya', name: 'Padma', who: 'an apricot grower', line: 'Was drying apricots on a roof and sorting them into sweet and very sweet.' },
  { region: 'himalaya', name: 'Stanzin', who: 'a trekking cook', line: 'Makes butter tea for twelve on one stove and has opinions about salt.' },
  { region: 'himalaya', name: 'Neha', who: 'a glaciologist', line: 'Was planting stakes in the ice to measure how far it moves by autumn.' },
];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967295;
};

/**
 * Someone met on the road every three to five walking days, from the region you were walking
 * through, chosen by the date so the journal never changes and nobody appears twice in a row.
 */
export function peopleMet(days: Pick<Day, 'date' | 'steps'>[]): { date: DayKey; who: Traveller; region: RegionId }[] {
  const out: { date: DayKey; who: Traveller; region: RegionId }[] = [];
  let km = 0;
  let wait = 3;
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!d.steps) continue;
    km += kmFromSteps(d.steps);
    if (--wait > 0) continue;
    const region = regionAt(km);
    const pool = PEOPLE_ON_THE_ROAD.filter((p) => p.region === region && p.name !== out.at(-1)?.who.name);
    if (pool.length) out.push({ date: d.date, who: pool[Math.floor(hash(d.date) * pool.length)], region });
    wait = 3 + Math.floor(hash(`${d.date}w`) * 3);
  }
  return out;
}
