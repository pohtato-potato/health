import { seeded } from './creatures';
import type { DayKey } from './dates';
import { statDeck } from './shakeStats';
import type { Day, FoodEntry, Measurement, SetEntry, Settings, TrainingSession } from './types';

export interface BrowseInput {
  today: DayKey;
  settings: Settings;
  days: Day[];
  entries: FoodEntry[];
  sessions: TrainingSession[];
  sets: SetEntry[];
  measurements: Measurement[];
}
/** One true thing from your own logs, picked by the seed. */
export function surprise(seed: string, i: BrowseInput): { text: string; sub?: string } | undefined {
  if (!i.days.length) return undefined;
  const deck = statDeck(i);
  return deck.length ? deck[Math.floor(seeded(`surprise:${seed}`)() * deck.length)] : undefined;
}
