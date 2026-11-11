import { HUE } from '../../ui/you/palette';

/** The five doors, in their fixed order. Later parts re-point Reports, Earned and Body at their new homes. */
export const DOORS: { label: 'Reports' | 'Earned' | 'Body' | 'Tracks' | 'Insights'; path: string; hue: string }[] = [
  { label: 'Reports', path: '/reports', hue: '#ff9a6b' },
  { label: 'Earned', path: '/earned', hue: HUE.gold },
  { label: 'Body', path: '/checkin', hue: HUE.shape },
  { label: 'Tracks', path: '/tracks', hue: HUE.steps },
  { label: 'Insights', path: '/insights', hue: HUE.train },
];
