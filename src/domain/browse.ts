import type { DayKey } from './dates';
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
