import type { RouteDef } from '../types';

/** Draft from the design prototype: not on the shelf until its writing is done and sourced. */
export const shivaji: RouteDef = {
  id: 'shivaji',
  name: "Shivaji's escape from Agra",
  era: '1666',
  hook: "Out of Aurangzeb's Agra, by the most-told account in a basket of sweets.",
  group: 'india',
  km: 1300,
  record: 'estimated',
  region: 'india',
  ink: '#f0a070',
  places: [
    { name: 'Agra', km: 0, at: 0, label: true },
    { name: 'Rajgad', km: 1300, at: 6, label: true },
  ],
  signature: {
    title: 'Safe houses',
    note: 'The escape moved from shelter to shelter. Each one you reach is a door that opened.',
    mark: 'house',
    marks: [{ km: 108.3 }, { km: 216.7 }, { km: 325.0 }, { km: 433.3 }, { km: 541.7 }, { km: 650.0 }, { km: 758.3 }, { km: 866.7 }, { km: 975.0 }, { km: 1083.3 }, { km: 1191.7 }, { km: 1300.0 }],
  },
  pages: [],
  sources: [],
  ready: false,
};
