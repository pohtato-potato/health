import { useSettings } from '../db/hooks';
import { homePlace } from '../domain/places';
import type { Place } from '../domain/types';

/** Round 5's place marks: home sage house, a second home lavender house-heart, office apricot building, trip blue suitcase, friends rose figures, a night out gold glass. */
export type PlaceMarkKind = 'home' | 'home2' | 'office' | 'trip' | 'friends' | 'night';

export const PLACE_INKS: Record<PlaceMarkKind, string> = {
  home: 'var(--sage)',
  home2: 'var(--lavender)',
  office: 'var(--apricot)',
  trip: 'var(--blue)',
  friends: 'var(--rose)',
  night: 'var(--gold)',
};

export const PLACE_LABELS: Record<PlaceMarkKind, string> = { home: 'home', home2: 'second home', office: 'office', trip: 'trip', friends: 'friends', night: 'night out' };

/** The drawn shape for a place mark, centred in a 24-unit box. */
export function placePath(kind: PlaceMarkKind): string {
  switch (kind) {
    case 'home':
      return 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10 19v-5h4v5';
    case 'home2':
      return 'M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M12 17.2l-2.4-2.3a1.4 1.4 0 0 1 2-2l.4.4.4-.4a1.4 1.4 0 0 1 2 2Z';
    case 'office':
      return 'M5 20V5.5h9V20M14 9h5v11M3.5 20h17M8 9h3M8 12.5h3M8 16h3';
    case 'trip':
      return 'M4.5 8.5h15v10h-15ZM9 8.5V6h6v2.5M4.5 13h15';
    case 'friends':
      return 'M8.5 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4 19c0-2.8 2-4.5 4.5-4.5S13 16.2 13 19M16 10.5a2 2 0 1 0 0-4M15.5 14.6c2.3.2 4.5 1.8 4.5 4.4';
    case 'night':
      return 'M7 4.5h10l-1.2 6.5a3.8 3.8 0 0 1-7.6 0ZM12 14.8V19M8.5 19.5h7M7.6 8h8.8';
  }
}

export function markFor(place: Pick<Place, 'id' | 'kind'>, homeId: string): PlaceMarkKind {
  if (place.kind === 'home') return place.id === homeId ? 'home' : 'home2';
  return place.kind;
}

/** A place's mark, drawn in its colour. */
export function PlaceIcon({ place, size = 16, kind }: { place?: Pick<Place, 'id' | 'kind'>; size?: number; kind?: PlaceMarkKind }) {
  const settings = useSettings();
  const k = kind ?? (place && settings ? markFor(place, homePlace(settings).id) : 'home');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none', verticalAlign: '-2px' }}>
      <path d={placePath(k)} fill="none" stroke={PLACE_INKS[k]} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
