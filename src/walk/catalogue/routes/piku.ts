import type { RouteDef } from '../types';

/** Draft from the design prototype: not on the shelf until its writing is done and sourced. */
export const piku: RouteDef = {
  id: 'piku',
  name: 'Piku',
  era: '2015 film',
  hook: 'Delhi to Kolkata by road, with a father, a daughter and a reluctant driver.',
  group: 'books',
  km: 1500,
  record: 'story',
  region: 'india',
  ink: '#f0b48a',
  places: [
    { name: 'Delhi', km: 0, at: 0, label: true },
    { name: 'Kolkata', km: 1500, at: 4, label: true },
  ],
  signature: {
    title: 'Stops on the road',
    note: "The family's halts between Delhi and Kolkata, each with its argument.",
    mark: 'house',
    marks: [{ km: 187.5 }, { km: 375.0 }, { km: 562.5 }, { km: 750.0 }, { km: 937.5 }, { km: 1125.0 }, { km: 1312.5 }, { km: 1500.0 }],
  },
  book: { by: 'Shoojit Sircar', synopsis: 'A short-tempered architect drives her hypochondriac father home to Kolkata, with a taxi owner who never wanted the job.', fullSynopsis: '', chapters: [] },
  pages: [],
  sources: [],
  ready: false,
};
