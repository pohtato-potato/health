import type { SouvenirShape } from './souvenirs';

/** Line drawings in a 32-unit box, one per souvenir shape. */
const PATHS: Record<SouvenirShape, string> = {
  jali: 'M6 27V12a10 10 0 0 1 20 0v15ZM6 27h20M11 27V14M16 27V8M21 27V14M6 17h20M6 22h20',
  tile: 'M6 6h20v20H6ZM16 9c2 3 2 5 0 7-2-2-2-4 0-7ZM16 23c-2-3-2-5 0-7 2 2 2 4 0 7ZM9 16c3-2 5-2 7 0-2 2-4 2-7 0ZM23 16c-3 2-5 2-7 0 2-2 4-2 7 0Z',
  kite: 'M16 4 26 15 16 24 6 15ZM16 4v20M6 15h20M16 24c-1 2 1 3 0 5M14 27l2 2 2-2',
  shell: 'M16 26c-6 0-10-4-10-9 0-5 4-10 10-10s10 5 10 10c0 5-4 9-10 9ZM16 26V8M16 26l-6-16M16 26l6-16M16 26 7 15M16 26l9-11',
  lamp: 'M8 18c0 4 4 6 8 6s8-2 8-6ZM8 18h16M16 18c-2-3-2-6 0-10 2 4 2 7 0 10ZM12 24v3h8v-3',
  textile: 'M6 7h20v18H6ZM6 12h20M6 20h20M11 7v18M21 7v18M14 15l2 2 2-2-2-2Z',
  pottery: 'M12 6h8M13 6c0 3-6 5-6 11 0 5 4 9 9 9s9-4 9-9c0-6-6-8-6-11M9 15h14M10 20h12',
  mask: 'M7 8c3-2 15-2 18 0 0 10-4 18-9 18S7 18 7 8ZM11 14c1-1 3-1 4 0M17 14c1-1 3-1 4 0M13 21c2 1 4 1 6 0',
  boat: 'M4 19h24l-4 6H8ZM16 19V5M16 6l8 10h-8M16 9l-6 7h6',
  flower: 'M16 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM16 13c-1-4 0-7 0-7s1 3 0 7M19 16c4-1 7 0 7 0s-3 1-7 0M16 19c1 4 0 7 0 7s-1-3 0-7M13 16c-4 1-7 0-7 0s3-1 7 0M18 14c3-3 5-4 5-4s-1 2-5 4M14 18c-3 3-5 4-5 4s1-2 5-4M18 18c3 3 4 5 4 5s-2-1-4-5M14 14c-3-3-4-5-4-5s2 1 4 5',
  leaf: 'M7 25C7 14 14 7 25 7c0 11-7 18-18 18ZM7 25 19 13M12 20h5M15 17v-4',
  bell: 'M16 5v2M10 21c0-8 1-14 6-14s6 6 6 14ZM8 21h16M16 21v4M14 25h4',
};

export function SouvenirArt({ shape, size = 32, waiting }: { shape: SouvenirShape; size?: number; waiting?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ flex: 'none' }}>
      {!waiting && <ellipse cx="16" cy="28" rx="10" ry="2" fill="var(--gold)" opacity="0.18" />}
      <path
        d={PATHS[shape]}
        fill="none"
        stroke={waiting ? 'var(--dim)' : 'var(--gold)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={waiting ? '2 3' : undefined}
        opacity={waiting ? 0.6 : 1}
      />
    </svg>
  );
}
