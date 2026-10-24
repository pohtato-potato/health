import { fmtDayMonth } from '../../domain/format';
import type { DayKey } from '../../domain/dates';
import { kindOf, type RouteDef } from '../../walk/catalogue';
import { signatureOf } from '../../walk/signature';
import { markPath } from '../../walk/ui/MarkShape';

/** Drawn at this width on a 360 px phone; every size below is in its own units. */
export const VISA_PX = 220;

/** The mark at the visa's centre, in visa units: 24-unit marks at this scale are about 36 px on screen. */
export const VISA_MARK_SCALE = 1.5;

/** Long names fit by measured shrinking, never by cutting them off. */
const fit = (text: string, chars: number, width: number) => (text.length > chars ? { textLength: width, lengthAdjust: 'spacingAndGlyphs' as const } : {});

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
  if (def.book)
    return (
      <svg className="walk-visa book" viewBox="0 0 230 150" role="img" aria-label={`Book route admission: ${def.name}, by ${def.book.by}${finished ? ', finished' : ''}`}>
        <rect x="4" y="4" width="222" height="142" rx="8" className="paper" />
        <rect x="12" y="12" width="206" height="126" rx="4" className="rule" />
        <line x1="12" y1="40" x2="218" y2="40" className="rule thin" />
        <text x="24" y="32" fontFamily={MONO} fontSize="14" letterSpacing="1">
          BOOK ROUTE · ADMITTED
        </text>
        {m(24, 54)}
        <text x="72" y="76" fontFamily={SERIF} fontSize="17" {...fit(name, 13, 138)}>
          {name}
        </text>
        <text x="72" y="98" fontFamily={MONO} fontSize="14" {...fit(def.book.by, 16, 138)}>
          {def.book.by.toUpperCase()}
        </text>
        <text x="24" y="126" fontFamily={MONO} fontSize="14" {...fit(day, 22, 182)}>
          {day}
        </text>
      </svg>
    );
  if (kindOf(def) === 'expedition')
    return (
      <svg className="walk-visa exp" viewBox="0 0 220 220" role="img" aria-label={`Expedition visa: ${def.name}${finished ? ', finished' : ''}`}>
        <circle cx="110" cy="110" r="104" className="paper" />
        <circle cx="110" cy="110" r="96" className="rule" />
        <circle cx="110" cy="110" r="88" className="rule dotted" />
        <path id={`visa-rim-${def.id}`} d="M28 110 A82 82 0 0 1 192 110" fill="none" />
        <text fontFamily={MONO} fontSize="14" letterSpacing="3">
          <textPath href={`#visa-rim-${def.id}`} startOffset="50%" textAnchor="middle">
            EXPEDITION VISA
          </textPath>
        </text>
        {m(92, 66)}
        <text x="110" y="134" textAnchor="middle" fontFamily={SERIF} fontSize="17" {...fit(name, 15, 150)}>
          {name}
        </text>
        <text x="110" y="156" textAnchor="middle" fontFamily={MONO} fontSize="14" {...fit(day, 18, 140)}>
          {day}
        </text>
      </svg>
    );
  return (
    <svg className="walk-visa ch" viewBox="0 0 220 160" role="img" aria-label={`Challenge visa: ${def.name}${finished ? ', finished' : ''}`}>
      <path d="M110 4 L214 34 V126 L110 156 L6 126 V34 Z" className="paper" />
      <path d="M110 13 L205 40 V120 L110 147 L15 120 V40 Z" className="rule" />
      <text x="110" y="49" textAnchor="middle" fontFamily={MONO} fontSize="14" letterSpacing="1">
        VISA · CHALLENGE
      </text>
      {m(92, 53)}
      <text x="110" y="105" textAnchor="middle" fontFamily={SERIF} fontSize="17" {...fit(name, 16, 160)}>
        {name}
      </text>
      <text x="110" y="124" textAnchor="middle" fontFamily={MONO} fontSize="14" {...fit(day, 16, 128)}>
        {day}
      </text>
    </svg>
  );
}
