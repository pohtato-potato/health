import type { RouteDef } from '../types';

/** Draft from the design prototype: not on the shelf until its writing is done and sourced. */
export const rann: RouteDef = {
  id: 'rann',
  name: 'The Rann of Kutch',
  era: 'Today',
  hook: 'Across the white salt desert, wild asses and flamingos included.',
  group: 'wild',
  km: 250,
  record: 'none',
  region: 'india',
  ink: '#e8e4dc',
  places: [
    { name: 'Bhuj', km: 0, at: 0, label: true },
    { name: 'Little Rann', km: 250, at: 3, label: true },
  ],
  signature: {
    title: 'Islands in the salt',
    note: 'The bets: rocky islands rising out of the white desert. Each one you reach is marked.',
    mark: 'island',
    marks: [{ km: 41.7 }, { km: 83.3 }, { km: 125.0 }, { km: 166.7 }, { km: 208.3 }, { km: 250.0 }],
  },
  pages: [],
  sources: [],
  ready: false,
};
