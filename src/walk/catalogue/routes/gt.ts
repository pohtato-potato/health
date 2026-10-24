import type { RouteDef } from '../types';

/** Draft from the design prototype: not on the shelf until its writing is done and sourced. */
export const gt: RouteDef = {
  id: 'gt',
  name: 'The Grand Trunk Road',
  era: '300 BC–today',
  hook: "Sher Shah's highway, and Kim's road, from Bengal to the Khyber.",
  group: 'india',
  km: 2500,
  record: 'none',
  region: 'india',
  ink: '#a8c8a0',
  places: [
    { name: 'Kolkata', km: 0, at: 0, label: true },
    { name: 'Peshawar', km: 2500, at: 9, label: true },
  ],
  signature: {
    title: 'Capitals of the road',
    note: 'Every empire that held north India held this road. Each old capital you reach adds its seal.',
    mark: 'seal',
    marks: [{ km: 250.0 }, { km: 500.0 }, { km: 750.0 }, { km: 1000.0 }, { km: 1250.0 }, { km: 1500.0 }, { km: 1750.0 }, { km: 2000.0 }, { km: 2250.0 }, { km: 2500.0 }],
  },
  pages: [],
  sources: [],
  ready: false,
};
