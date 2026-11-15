/** The doors, in their fixed order, in board one's inks: Tracks green, Earned gold, Insights blue, Reports lavender. */
export const DOORS: { label: 'Reports' | 'Earned' | 'Body' | 'Tracks' | 'Insights'; path: string; hue: string }[] = [
  { label: 'Tracks', path: '/tracks', hue: '#8fdcb6' },
  { label: 'Earned', path: '/earned', hue: '#f2c46d' },
  { label: 'Insights', path: '/insights', hue: '#93c3dc' },
  { label: 'Reports', path: '/reports', hue: '#c2b2ff' },
  { label: 'Body', path: '/checkin', hue: '#f4aedb' },
];
