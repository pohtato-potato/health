import { fmtDuration } from '../domain/format';
import { Icon } from './Icon';

const hm = (m: number) => fmtDuration(m).replace(/ m$/, '');

/** The parts of a saved morning, in the order the form asks them. Only what was saved is listed. */
export function morningParts({ sleepMin, rested, weightKg, place }: { sleepMin?: number; rested?: number; weightKg?: number; place?: string }): string[] {
  return [
    sleepMin !== undefined && `Sleep ${hm(sleepMin)}`,
    rested !== undefined && `Rested ${rested}`,
    weightKg !== undefined && `${weightKg.toFixed(1)} kg`,
    place,
  ].filter((x): x is string => !!x);
}

/**
 * "Morning logged" (board 5 `s5-saved`): each part ticks in one after another, then the sleep ring fills and glows.
 * Reduced motion shows every tick and the full ring at once.
 */
export function MorningLogged({ parts, sleepMin, sleepTarget }: { parts: string[]; sleepMin?: number; sleepTarget?: number }) {
  const p = sleepMin !== undefined && sleepTarget ? Math.min(1, sleepMin / sleepTarget) : undefined;
  return (
    <div className="mlg">
      {parts.length > 0 && (
        <ul className="mlg-list">
          {parts.map((t, i) => (
            <li key={t} style={{ '--i': i } as React.CSSProperties}>
              <Icon name="check" size={16} stroke={2.6} /><span>{t}</span>
            </li>
          ))}
        </ul>
      )}
      {p !== undefined && (
        <div className="mlg-ring" style={{ '--i': parts.length } as React.CSSProperties}>
          <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden="true">
            <circle cx={20} cy={20} r={16} className="sr-track" />
            <circle cx={20} cy={20} r={16} pathLength={100} className="mlg-fill" strokeDasharray={`${p * 100} 100`} transform="rotate(-90 20 20)" style={{ '--p': p * 100 } as React.CSSProperties} />
          </svg>
          <span className="mlg-rw">
            <span>Sleep ring</span>
            <b className="tn">{hm(sleepMin!)} of {hm(sleepTarget!)}</b>
          </span>
        </div>
      )}
    </div>
  );
}
