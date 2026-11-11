export interface GoToHit { label: string; path: string }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Everywhere the box can take you. `words` are other names people reach for. */
export const GO_TO: (GoToHit & { words?: string[] })[] = [
  { label: 'Today', path: '/today' },
  { label: 'Train', path: '/train', words: ['workout', 'session', 'gym'] },
  { label: 'Walk', path: '/walk', words: ['road', 'map'] },
  { label: 'Tracks', path: '/tracks', words: ['steps', 'sleep', 'food', 'drinks'] },
  { label: 'Reports', path: '/reports', words: ['week', 'story', 'receipt'] },
  { label: 'Monthly film', path: '/film', words: ['month'] },
  { label: 'Earned', path: '/earned', words: ['titles', 'trophies', 'themes'] },
  { label: 'Achievements', path: '/achievements' },
  { label: 'Records', path: '/records', words: ['best'] },
  { label: 'Check-in', path: '/checkin', words: ['body', 'weight', 'measure'] },
  { label: 'Photos', path: '/photos' },
  { label: 'Insights', path: '/insights', words: ['heatmap', 'patterns'] },
  { label: 'Medicines', path: '/medicines', words: ['pills'] },
  { label: 'Reveal day', path: '/reveal' },
  { label: 'Your year', path: '/year', words: ['almanac', 'anniversary'] },
  { label: 'Settings', path: '/settings', words: ['targets', 'preferences'] },
  { label: 'Backup', path: '/settings', words: ['save', 'restore', 'export'] },
];

export function monthLabel(month: string): string {
  return `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
}

/** Filters pages and months as you type. `months` are `YYYY-MM` with data. */
export function matchGoTo(q: string, months: string[]): GoToHit[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const hits: GoToHit[] = months
    .map((m) => ({ label: monthLabel(m), path: `/film?m=${m}` }))
    .filter((h) => h.label.toLowerCase().includes(s));
  for (const g of GO_TO) {
    if (g.label.toLowerCase().includes(s) || g.words?.some((w) => w.includes(s))) hits.push({ label: g.label, path: g.path });
  }
  return hits;
}
