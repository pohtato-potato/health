import type { Settings } from './types';

export interface SetupGap {
  id: 'birthYear' | 'height' | 'places' | 'plan' | 'lastfm' | 'goal';
  label: string;
  /** Where in Settings it is filled in. */
  at: string;
}

/** What is still missing for every feature to work, in the order worth fixing. */
export function setupGaps(s: Settings): SetupGap[] {
  const gaps: SetupGap[] = [];
  if (!s.birthYear) gaps.push({ id: 'birthYear', label: 'birth year', at: 'you' });
  if (!s.heightCm) gaps.push({ id: 'height', label: 'height', at: 'you' });
  if (!s.places?.length) gaps.push({ id: 'places', label: 'places', at: 'walking' });
  if (!s.plan) gaps.push({ id: 'plan', label: 'a training plan', at: 'training' });
  if (!s.goalDate) gaps.push({ id: 'goal', label: 'reveal day', at: 'you' });
  if (!s.lastfm?.key) gaps.push({ id: 'lastfm', label: 'Last.fm', at: 'lastfm' });
  return gaps;
}
