import type { AppFamily } from '../../ui/kit/families';

/**
 * You's doors, by the kind of place they open (ledger O40): Looking back (Tracks, Insights, Reports), Earned, then the
 * Body. Board one's own inks gave way to the family colours, so blue no longer reads as sleep or lavender as protein.
 */
export const DOORS: { label: 'Reports' | 'Earned' | 'Body' | 'Tracks' | 'Insights'; path: string; family: AppFamily }[] = [
  { label: 'Tracks', path: '/tracks', family: 'back' },
  { label: 'Insights', path: '/insights', family: 'back' },
  { label: 'Reports', path: '/reports', family: 'back' },
  { label: 'Earned', path: '/earned', family: 'earned' },
  { label: 'Body', path: '/checkin', family: 'body' },
];
