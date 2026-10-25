import { Icon } from '../../ui/Icon';

const DOORS: [string, string][] = [
  ['Passport', '/passport'],
  ['Map', '/map'],
  ['Departures', '/departures'],
  ['Wrapped', '/road'],
];

/** The ways on from the Walk tab, each a full-width row. */
export function WalkDoors({ onGo }: { onGo: (path: string) => void }) {
  return (
    <nav className="walk-doors" aria-label="More of the walk">
      {DOORS.map(([label, path]) => (
        <button key={path} type="button" onClick={() => onGo(path)}>
          <span>{label}</span>
          <Icon name="right" size={16} stroke={1.8} />
        </button>
      ))}
    </nav>
  );
}
