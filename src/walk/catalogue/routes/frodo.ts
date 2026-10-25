import type { RouteDef } from '../types';

/** Draft from the design prototype: not on the shelf until its writing is done and sourced. */
export const frodo: RouteDef = {
  id: 'frodo',
  name: 'Bag End to Mount Doom',
  era: '1954',
  hook: 'Carry the ring to the one fire that can unmake it.',
  group: 'books',
  km: 2600,
  record: 'story',
  region: 'fantasy',
  ink: '#b8d89a',
  places: [
    { name: 'Bag End', km: 0, at: 0, label: true },
    { name: 'Mount Doom', km: 2600, at: 6, label: true },
  ],
  signature: {
    title: 'The walkers',
    note: 'Nine set out from Rivendell. The marks follow who walks with Frodo, stretch by stretch (story mode only).',
    mark: 'walker',
    marks: [{ km: 288.9 }, { km: 577.8 }, { km: 866.7 }, { km: 1155.6 }, { km: 1444.4 }, { km: 1733.3 }, { km: 2022.2 }, { km: 2311.1 }, { km: 2600.0 }],
  },
  book: { by: 'J. R. R. Tolkien', synopsis: 'A hobbit inherits a ring that its maker wants back, and sets out on foot for the only place it can be destroyed.', fullSynopsis: '', chapters: [] },
  pages: [],
  sources: [],
  ready: false,
};
