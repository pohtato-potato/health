import { HUE } from '../../ui/you/palette';

/** The six doors, in their fixed order. Later parts re-point Reports, Earned and Body at their new homes. */
export const DOORS: { label: 'Reports' | 'Earned' | 'Body' | 'Tracks' | 'Diary' | 'Insights'; path: string; hue: string }[] = [
  { label: 'Reports', path: '/week', hue: '#ff9a6b' },
  { label: 'Earned', path: '/earned', hue: HUE.gold },
  { label: 'Body', path: '/checkin', hue: HUE.shape },
  { label: 'Tracks', path: '/tracks', hue: HUE.steps },
  { label: 'Diary', path: '/diary', hue: HUE.sleep },
  { label: 'Insights', path: '/insights', hue: HUE.train },
];
