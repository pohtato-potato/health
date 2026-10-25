import { fmtDayMonth } from '../../domain/format';
import type { DayKey } from '../../domain/dates';
import { kindOf, type RouteDef } from '../../walk/catalogue';
import { signatureOf } from '../../walk/signature';
import { markPath } from '../../walk/ui/MarkShape';

/** Drawn at this width on a 360 px phone; every size below is in its own units. */
export const VISA_PX = 220;

/** The mark at the visa's centre, in visa units: 24-unit marks at this scale are about 36 px on screen. */
export const VISA_MARK_SCALE = 1.5;

/** Long lines fit by measured shrinking, never by cutting them off. */
const fit = (text: string, chars: number, width: number) => (text.length > chars ? { textLength: width, lengthAdjust: 'spacingAndGlyphs' as const } : {});

/** Serif capitals run about 0.67 of their size wide. */
const serifWidth = (text: string, size: number) => text.length * size * 0.67;

/**
 * A name on one line if it fits, squeezed by no more than 15%; otherwise on two, broken at the most even word break,
 * each squeezed only as far as it must be. Legibility first: never squeezed hard to fit one line.
 */
export function nameLines(name: string, width: number): { text: string; size: number; textLength?: number }[] {
  const one = (text: string, size: number) => ({ text, size, ...(serifWidth(text, size) > width ? { textLength: width } : {}) });
  if (serifWidth(name, 17) * 0.85 <= width || !name.includes(' ')) return [one(name, 17)];
  const words = name.split(' ');
  let best = 1;
  for (let k = 1; k < words.length; k++) {
    const worst = (n: number) => Math.max(words.slice(0, n).join(' ').length, words.slice(n).join(' ').length);
    if (worst(k) < worst(best)) best = k;
  }
  return [one(words.slice(0, best).join(' '), 16), one(words.slice(best).join(' '), 16)];
}

/** The name's lines, from the first line's baseline down. */
function Name({ name, x, y, width, anchor }: { name: string; x: number; y: number; width: number; anchor?: 'middle' }) {
  return (
    <>
      {nameLines(name, width).map((l, i) => (
        <text key={i} className="walk-visa-name" x={x} y={y + i * 18} textAnchor={anchor} fontFamily={SERIF} fontSize={l.size} {...(l.textLength ? { textLength: l.textLength, lengthAdjust: 'spacingAndGlyphs' as const } : {})}>
          {l.text}
        </text>
      ))}
    </>
  );
}

const MONO = 'DM Mono, ui-monospace, monospace';
const SERIF = 'Fraunces Variable, Georgia, serif';

/** The gold exit stamp a finished route's visa carries: earned, so gold. Drawn on its own, over the visa's corner. */
function ExitStamp({ on }: { on: DayKey }) {
  return (
    <svg className="walk-visa-exit" viewBox="0 0 100 100" aria-hidden="true">
      <g transform="translate(50 50) rotate(-12)">
        <circle r="46" />
        <circle r="39" className="in" />
        <text y="-3" textAnchor="middle" fontFamily={MONO} fontSize="14">
          FINISHED
        </text>
        <text y="16" textAnchor="middle" fontFamily={MONO} fontSize="14">
          {fmtDayMonth(on).toUpperCase()}
        </text>
      </g>
    </svg>
  );
}

/**
 * A route's visa, in the shape of its kind: a hexagon for a challenge, a double-ringed seal with "EXPEDITION VISA"
 * round its rim for an expedition, an admission slip with the author for a book or film. Its collection's mark sits at
 * the centre. With `stamp`, the gold exit stamp of the day it was finished.
 */
export function Visa({ def, stamp, joined }: { def: RouteDef; stamp?: DayKey; joined?: DayKey }) {
  if (stamp)
    return (
      <span className="walk-visa-wrap">
        <VisaBody def={def} joined={joined} finished />
        <ExitStamp on={stamp} />
      </span>
    );
  return <VisaBody def={def} joined={joined} />;
}

function VisaBody({ def, joined, finished }: { def: RouteDef; joined?: DayKey; finished?: boolean }) {
  const name = def.name.toUpperCase();
  const mark = signatureOf(def).mark;
  const day = joined ? `JOINED ${fmtDayMonth(joined).toUpperCase()}` : def.era;
  const m = (x: number, y: number) => (
    <g transform={`translate(${x} ${y}) scale(${VISA_MARK_SCALE})`} className="walk-visa-mark">
      {markPath(mark)}
    </g>
  );
  const done = finished ? ', finished' : '';
  if (def.book) {
    const two = nameLines(name, 130).length === 2;
    return (
      <svg className="walk-visa book" viewBox="0 0 220 150" role="img" aria-label={`Book route admission: ${def.name}, by ${def.book.by}${done}`}>
        <rect x="4" y="4" width="212" height="142" rx="8" className="paper" />
        <rect x="12" y="12" width="196" height="126" rx="4" className="rule" />
        <line x1="12" y1="40" x2="208" y2="40" className="rule thin" />
        <text x="22" y="32" fontFamily={MONO} fontSize="14">
          BOOK ROUTE · ADMITTED
        </text>
        {m(20, 52)}
        <Name name={name} x={70} y={two ? 70 : 76} width={130} />
        <text x="70" y={two ? 110 : 98} fontFamily={MONO} fontSize="14" {...fit(def.book.by, 15, 130)}>
          {def.book.by.toUpperCase()}
        </text>
        <text x="22" y="128" fontFamily={MONO} fontSize="14" {...fit(day, 22, 176)}>
          {day}
        </text>
      </svg>
    );
  }
  if (kindOf(def) === 'expedition') {
    const two = nameLines(name, 150).length === 2;
    return (
      <svg className="walk-visa exp" viewBox="0 0 220 220" role="img" aria-label={`Expedition visa: ${def.name}${done}`}>
        <circle cx="110" cy="110" r="104" className="paper" />
        <circle cx="110" cy="110" r="96" className="rule" />
        <circle cx="110" cy="110" r="88" className="rule dotted" />
        <path id={`visa-rim-${def.id}`} d="M28 110 A82 82 0 0 1 192 110" fill="none" />
        <text fontFamily={MONO} fontSize="14" letterSpacing="3">
          <textPath href={`#visa-rim-${def.id}`} startOffset="50%" textAnchor="middle">
            EXPEDITION VISA
          </textPath>
        </text>
        {m(92, two ? 60 : 66)}
        <Name name={name} x={110} y={two ? 128 : 134} width={150} anchor="middle" />
        <text x="110" y={two ? 168 : 156} textAnchor="middle" fontFamily={MONO} fontSize="14" {...fit(day, 16, 128)}>
          {day}
        </text>
      </svg>
    );
  }
  const two = nameLines(name, 160).length === 2;
  return (
    <svg className="walk-visa ch" viewBox="0 0 220 160" role="img" aria-label={`Challenge visa: ${def.name}${done}`}>
      <path d="M110 4 L214 34 V126 L110 156 L6 126 V34 Z" className="paper" />
      <path d="M110 13 L205 40 V120 L110 147 L15 120 V40 Z" className="rule" />
      <text x="110" y="49" textAnchor="middle" fontFamily={MONO} fontSize="14" letterSpacing="1">
        VISA · CHALLENGE
      </text>
      {m(92, two ? 46 : 53)}
      <Name name={name} x={110} y={two ? 97 : 105} width={two ? 150 : 160} anchor="middle" />
      <text x="110" y={two ? 133 : 124} textAnchor="middle" fontFamily={MONO} fontSize="14" {...fit(day, 14, 110)}>
        {day}
      </text>
    </svg>
  );
}
