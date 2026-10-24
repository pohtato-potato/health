import type { RouteDef } from '../types';

/** Draft from the design prototype: not on the shelf until its writing is done and sourced. */
export const meerut: RouteDef = {
  id: 'meerut',
  name: 'The night ride from Meerut',
  era: '1857',
  hook: 'Sepoys rise at Meerut and ride through the night to Delhi.',
  group: 'india',
  km: 70,
  record: 'dated',
  region: 'india',
  ink: '#e88a7a',
  places: [
    { name: 'Meerut', km: 0, at: 0, label: true },
    { name: 'Delhi', km: 70, at: 2, label: true },
  ],
  signature: {
    title: 'The hours of the night',
    note: 'The sepoys rode from Meerut to Delhi through one night. Each hour of their ride is a mark.',
    mark: 'moon',
    marks: [{ km: 5.8 }, { km: 11.7 }, { km: 17.5 }, { km: 23.3 }, { km: 29.2 }, { km: 35.0 }, { km: 40.8 }, { km: 46.7 }, { km: 52.5 }, { km: 58.3 }, { km: 64.2 }, { km: 70.0 }],
  },
  pages: [],
  sources: [],
  ready: false,
};
