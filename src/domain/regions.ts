import type { RegionId } from '../ui/light';
import { ALL_STATES } from './walk';

/** Which landscape each state or territory is drawn in. */
const REGION_OF: Record<string, RegionId> = {
  Delhi: 'plains',
  Haryana: 'plains',
  'Uttar Pradesh': 'plains',
  Punjab: 'plains',
  Chandigarh: 'plains',
  Rajasthan: 'desert',
  Gujarat: 'desert',
  'Madhya Pradesh': 'ravines',
  Maharashtra: 'deccan',
  Telangana: 'deccan',
  'Andhra Pradesh': 'deccan',
  Karnataka: 'deccan',
  Chhattisgarh: 'deccan',
  Kerala: 'ghats',
  Goa: 'ghats',
  'Tamil Nadu': 'coast',
  Puducherry: 'coast',
  'Dadra and Nagar Haveli and Daman and Diu': 'coast',
  Lakshadweep: 'coast',
  'Andaman and Nicobar Islands': 'coast',
  Odisha: 'east',
  Jharkhand: 'east',
  Bihar: 'east',
  'West Bengal': 'east',
  Assam: 'northeast',
  Meghalaya: 'northeast',
  'Arunachal Pradesh': 'northeast',
  Nagaland: 'northeast',
  Manipur: 'northeast',
  Mizoram: 'northeast',
  Tripura: 'northeast',
  Sikkim: 'northeast',
  Uttarakhand: 'himalaya',
  'Himachal Pradesh': 'himalaya',
  'Jammu and Kashmir': 'himalaya',
  Ladakh: 'himalaya',
};

/** The state the walk is in at this distance. */
export function stateAt(km: number): string {
  let name = ALL_STATES[0].name;
  for (const s of ALL_STATES) if (s.km <= km) name = s.name;
  return name;
}

/** The landscape region at this distance along the walk. */
export function regionAt(km: number): RegionId {
  return REGION_OF[stateAt(km)] ?? 'plains';
}
