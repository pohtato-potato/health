import { TOUR_ROUTE } from '../domain/walk';

const km = (name: string, back: number) => (TOUR_ROUTE.find((s) => s.name === name)?.km ?? 0) - back;

/** Chapter 3's high passes: named places on the road, reached by steps like any other. */
export const PASSES = [
  { id: 'banihal', name: 'the Banihal pass', heightM: 2832, km: km('Srinagar', 110) },
  { id: 'zoji', name: 'Zoji La', heightM: 3528, km: km('Srinagar', -100) },
  { id: 'fotu', name: 'Fotu La', heightM: 4108, km: km('Leh', 130) },
];

export type Pass = (typeof PASSES)[number];

/** The next pass ahead, when it comes before the next stop. */
export function passAhead(kmNow: number, nextStopKm: number | undefined): Pass | undefined {
  return PASSES.find((p) => p.km > kmNow && (nextStopKm === undefined || p.km < nextStopKm));
}
