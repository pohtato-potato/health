/** Where a fact comes from. */
export interface Source {
  title: string;
  url?: string;
}

/** A named stretch of the main walk: one to two weeks of road, ending where the land changes. */
export interface Stretch {
  id: string;
  /** The storybook name. */
  name: string;
  /** The plain route, "Agra to Gwalior". */
  plain: string;
  fromKm: number;
  toKm: number;
  /** The long page: history, politics, people and land, told from every side. */
  page: string[];
  deeper?: { title: string; text: string };
  sources: Source[];
}

export type StopKind = 'river' | 'border' | 'food' | 'fort' | 'wildlife' | 'strange';

export const STOP_KINDS: StopKind[] = ['river', 'border', 'food', 'fort', 'wildlife', 'strange'];

/** Every kind says what it is in words, never only by its mark. */
export const STOP_WORDS: Record<StopKind, string> = {
  river: 'River',
  border: 'Border',
  food: 'Food',
  fort: 'Forts and temples',
  wildlife: 'Wildlife',
  strange: 'Strange but true',
};

/** A small stop: a place on the road with three to five facts, shown one at a time. */
export interface SmallStop {
  id: string;
  kind: StopKind;
  km: number;
  name: string;
  facts: string[];
  /** Wildlife stops: the creature from Today's morning reveal, once that exists. */
  creature?: string;
  sources: Source[];
}
