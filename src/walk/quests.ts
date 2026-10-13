import { ALL_STOPS } from '../domain/walk';

const near = (city: string) => ALL_STOPS.find((s) => s.name === city)?.km ?? 0;

/** Optional detours near the route: a hill station, a beach, a desert fort. */
export const QUESTS = [
  { id: 'sanchi', name: 'Sanchi', detourKm: 46, nearKm: near('Bhopal'), reward: 'a carved-gateway souvenir', postcard: 'The great stupa at Sanchi, its four gateways carved with stories.' },
  { id: 'chambal', name: 'the Chambal river', detourKm: 30, nearKm: near('Gwalior') - 60, reward: 'a gharial postcard', postcard: 'Gharials sunning on the sandbanks of the Chambal.' },
  { id: 'hampi', name: 'Hampi', detourKm: 140, nearKm: near('Hubballi'), reward: 'a boulder-and-temple postcard', postcard: 'Hampi’s boulders and ruined bazaars at sunset.' },
  { id: 'mahabalipuram', name: 'Mahabalipuram', detourKm: 60, nearKm: near('Chennai'), reward: 'a shore-temple souvenir', postcard: 'The Shore Temple, salt-worn and standing.' },
  { id: 'konark', name: 'Konark', detourKm: 65, nearKm: near('Bhubaneswar'), reward: 'a stone-wheel postcard', postcard: 'The Sun Temple’s great stone wheels.' },
  { id: 'jaisalmer', name: 'Jaisalmer', detourKm: 280, nearKm: near('Jaipur'), reward: 'a golden-fort postcard', postcard: 'Jaisalmer’s fort, gold in the evening light.' },
  { id: 'lonavala', name: 'the Western Ghats at Lonavala', detourKm: 40, nearKm: near('Pune'), reward: 'a monsoon postcard', postcard: 'Waterfalls on every hill in the ghats.' },
  { id: 'munnar', name: 'Munnar', detourKm: 130, nearKm: near('Thiruvananthapuram'), reward: 'a tea-garden postcard', postcard: 'Tea terraces combing the hills at Munnar.' },
  { id: 'cherrapunji', name: 'Sohra (Cherrapunji)', detourKm: 55, nearKm: near('Shillong'), reward: 'a living-root-bridge postcard', postcard: 'A bridge grown from fig roots, crossed by everyone.' },
  { id: 'pangong', name: 'Pangong Lake', detourKm: 225, nearKm: near('Leh') - 10, reward: 'a blue-lake postcard', postcard: 'Pangong, changing blue by the hour.' },
];

export type Quest = (typeof QUESTS)[number];

/** How far ahead a detour may be to be offered. */
const LOOKAHEAD = 400;

/**
 * Offered only after a week that beat your step average: the next detour ahead within reach,
 * not one already taken or declined.
 */
export function questOffer(weekAvg: number, overallAvg: number, kmNow: number, seen: Set<string>): Quest | undefined {
  if (weekAvg <= overallAvg) return undefined;
  return QUESTS.filter((q) => !seen.has(q.id) && q.nearKm >= kmNow - 50 && q.nearKm <= kmNow + LOOKAHEAD).sort((a, b) => a.nearKm - b.nearKm)[0];
}

/** Extra kilometres a detour adds: there and back. */
export function questCost(q: Quest): number {
  return q.detourKm * 2;
}

/** Kilometres spent on detours taken: they don't move you along the route. */
export function detourKm(records: { id: string; data?: Record<string, unknown> }[]): number {
  return records.reduce((n, r) => {
    const q = QUESTS.find((x) => `quest:${x.id}` === r.id);
    return n + (q && r.data?.taken ? questCost(q) : 0);
  }, 0);
}
