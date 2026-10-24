import type { StatusLine } from '../../walk/page';

/**
 * Up to three short lines under the title, then tomorrow's line. The block always keeps three lines' height, so
 * the page never jumps when a line comes or goes; tomorrow's line means it is rarely empty.
 */
export function StatusLines({ lines, tomorrow }: { lines: StatusLine[]; tomorrow?: string }) {
  const empty = lines.length === 0 && !tomorrow;
  return (
    <ul className="walk-lines" aria-hidden={empty ? true : undefined}>
      {lines.map((l) => (
        <li key={l.kind} className={`walk-line ${l.kind}`}>
          {l.text}
        </li>
      ))}
      {tomorrow && <li className="walk-tomorrow">{tomorrow}</li>}
    </ul>
  );
}
