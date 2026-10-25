import type { StatusLine } from '../../walk/page';

/**
 * Today's walk, up to three short lines under the title, then tomorrow's line. The block always keeps three lines' height, so
 * the page never jumps when a line comes or goes; tomorrow's line means it is rarely empty. A line that leads
 * somewhere (a small stop) is a button.
 */
export function StatusLines({ lines, today, tomorrow, onOpen }: { lines: StatusLine[]; today?: string; tomorrow?: string; onOpen?: (path: string) => void }) {
  const empty = lines.length === 0 && !tomorrow && !today;
  return (
    <ul className="walk-lines" aria-hidden={empty ? true : undefined}>
      {today && <li className="walk-line today">{today}</li>}
      {lines.map((l) => (
        <li key={l.kind} className={`walk-line ${l.kind}`}>
          {l.open && onOpen ? (
            <button type="button" className="walk-linkline" onClick={() => onOpen(l.open!)}>
              {l.text}
            </button>
          ) : (
            l.text
          )}
        </li>
      ))}
      {tomorrow && <li className="walk-tomorrow">{tomorrow}</li>}
    </ul>
  );
}
