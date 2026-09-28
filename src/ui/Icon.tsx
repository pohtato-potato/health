import type { CSSProperties, ReactNode } from 'react';

/** Stroke line icons only, drawn on a 24 px grid. No food pictures, ever. */
const PATHS: Record<string, ReactNode> = {
  today: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  train: <path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11" />,
  tracks: (
    <>
      <path d="M3.5 16.5l5-5.5 4 3.5 7.5-8" />
      <path d="M3.5 20.5h17" />
    </>
  ),
  journey: (
    <>
      <path d="M4.5 19c4 0 4-6 7.5-6s3.5-6 7.5-6" />
      <circle cx="4.5" cy="19" r="1.5" />
      <circle cx="19.5" cy="7" r="1.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  right: <path d="M9 5l7 7-7 7" />,
  left: <path d="M15 5l-7 7 7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  up: <path d="M6 15l6-6 6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  food: (
    <>
      <path d="M4 11h16a8 8 0 0 1-16 0z" />
      <path d="M9 7.5c0-1.5 1-2 1-3.5M14 7.5c0-1.5 1-2 1-3.5" />
    </>
  ),
  water: <path d="M12 3.5c-3 4-5.5 7-5.5 10a5.5 5.5 0 0 0 11 0c0-3-2.5-6-5.5-10z" />,
  steps: (
    <>
      <ellipse cx="9" cy="8" rx="2.6" ry="3.8" />
      <ellipse cx="15.5" cy="14.5" rx="2.6" ry="3.8" />
      <path d="M8 14h2.2M14.4 20.3h2.2" />
    </>
  ),
  weight: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M8.5 10a4.5 4.5 0 0 1 7 0l-2.5 2.5" />
    </>
  ),
  sleep: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  drink: (
    <>
      <path d="M7 4h10l-1.2 15a1.5 1.5 0 0 1-1.5 1.4H9.7a1.5 1.5 0 0 1-1.5-1.4z" />
      <path d="M7.6 9h8.8" />
    </>
  ),
  night: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  free: (
    <>
      <path d="M4.5 7c4.6-2.7 10.4-2.7 15 0L12 20.5z" />
      <circle cx="10.5" cy="10" r="1" />
      <circle cx="13.5" cy="13.5" r="1" />
    </>
  ),
  pill: (
    <>
      <rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(-45 12 12)" />
      <path d="M9.2 9.2l5.6 5.6" />
    </>
  ),
  win: (
    <>
      <path d="M8 4h8M9 4v2.5c-2 .8-3 2.4-3 4.5V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7c0-2.1-1-3.7-3-4.5V4" />
      <path d="M12 11.5l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
    </>
  ),
  camera: (
    <>
      <rect x="3.5" y="7" width="17" height="12" rx="3" />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M9 7l1.5-2.5h3L15 7" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </>
  ),
  tape: (
    <>
      <path d="M4 9.5a8 3.5 0 0 1 16 0v5a8 3.5 0 0 1-16 0z" />
      <path d="M4 9.5a8 3.5 0 0 0 16 0M8 15.5v2M12 16v2.5M16 15.5v2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </>
  ),
  trend: <path d="M3.5 16.5l5-5.5 4 3.5 7.5-8" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </>
  ),
  tempo: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 13V9.5M9.5 2.5h5" />
    </>
  ),
  swap: <path d="M7 7h11l-3-3M17 17H6l3 3" />,
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  save: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  edit: <path d="M5 19h4L19 9l-4-4L5 15zM13.5 6.5l4 4" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />,
  stopwatch: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5V10M10 3h4M18 6.5l1.5-1.5" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="18.5" cy="12" r="1" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  color = 'currentColor',
  stroke = 1.6,
  style,
  label,
}: {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={{ flexShrink: 0, ...style }}
    >
      {PATHS[name]}
    </svg>
  );
}
