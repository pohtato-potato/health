import type { RouteDef } from '../types';

/** Draft from the design prototype: not on the shelf until its writing is done and sourced. */
export const deccan: RouteDef = {
  id: 'deccan',
  name: 'The Deccan sultanates',
  era: '1347–1687',
  hook: 'Five rival courts, one alliance, and the fall of Hampi at Talikota.',
  group: 'india',
  km: 1300,
  record: 'none',
  region: 'india',
  ink: '#d9a0c8',
  places: [
    { name: 'Ahmadnagar', km: 0, at: 0, label: true },
    { name: 'Golconda', km: 1300, at: 6, label: true },
  ],
  signature: {
    title: 'Six courts',
    note: 'The five sultanates and Vijayanagara. Each capital you reach adds its court to your collection.',
    mark: 'shield',
    marks: [{ km: 216.7 }, { km: 433.3 }, { km: 650.0 }, { km: 866.7 }, { km: 1083.3 }, { km: 1300.0 }],
  },
  pages: [],
  sources: [],
  ready: false,
};
