import { useState } from 'react';
import { byId, fmt, inkOf } from './walkArt';
import { contentFor } from './walkContent';
import { MarkShape, RouteMap, markPath } from './walkRoutePage';
import { ROUTE_ART } from './walkRoutes';
import { EXPEDITION_KM, KM_A_DAY, RECORD_NAMES } from './walkSample';

/**
 * Design prototype: joining any route. The page takes the route's own character: its ink, its whole road drawing
 * itself on its land, a visa in its own shape (a hexagon for a challenge, a double-ringed seal for an expedition,
 * an admission slip for a book route) carrying the route's signature mark, and its collection waiting empty.
 * Book routes ask here, once, whether to walk with the story or with places only.
 */

function timeAt(km: number) {
  const days = Math.round(km / KM_A_DAY);
  if (days < 14) return `about ${days} days`;
  if (days < 75) return `about ${Math.round(days / 7)} weeks`;
  if (days < 540) return `about ${Math.round(days / 30)} months`;
  return `about ${(days / 365).toFixed(1)} years`;
}

/** The visa, drawn per kind of road, with the route's name fitted and its mark at the centre. */
function Visa({ id }: { id: string }) {
  const r = byId(id);
  const expedition = r.km > EXPEDITION_KM;
  const book = !!r.book;
  const name = r.name.toUpperCase();
  const fit = name.length > 16 ? { textLength: 150, lengthAdjust: 'spacingAndGlyphs' as const } : {};
  const mark = contentFor(id).signature.mark;
  if (expedition)
    return (
      <svg className="wp-visa2" viewBox="0 0 220 220" role="img" aria-label={`Expedition visa: ${r.name}`}>
        <circle cx="110" cy="110" r="104" fill="#eee8dc" />
        <circle cx="110" cy="110" r="96" fill="none" stroke="#2a2620" strokeWidth="1.6" />
        <circle cx="110" cy="110" r="88" fill="none" stroke="#2a2620" strokeWidth="0.8" strokeDasharray="2 3" />
        <path id={`vt-${id}`} d="M30 110 A80 80 0 0 1 190 110" fill="none" />
        <text fontFamily="DM Mono" fontSize="13" letterSpacing="3" fill="#2a2620">
          <textPath href={`#vt-${id}`} startOffset="50%" textAnchor="middle">
            EXPEDITION VISA
          </textPath>
        </text>
        <g transform="translate(86 72) scale(2)" className="wp-visa-mark">
          {markPath(mark)}
        </g>
        <text x="110" y="150" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontSize="16" fill="#2a2620" {...fit}>
          {name}
        </text>
        <text x="110" y="170" textAnchor="middle" fontFamily="DM Mono" fontSize="13" fill="#2a2620">
          DAY 1 · {r.era}
        </text>
      </svg>
    );
  if (book)
    return (
      <svg className="wp-visa2" viewBox="0 0 230 150" role="img" aria-label={`Book route admission: ${r.name}`}>
        <rect x="4" y="4" width="222" height="142" rx="8" fill="#eee8dc" />
        <rect x="12" y="12" width="206" height="126" rx="4" fill="none" stroke="#2a2620" strokeWidth="1.4" />
        <line x1="12" y1="40" x2="218" y2="40" stroke="#2a2620" strokeWidth="0.8" />
        <text x="24" y="31" fontFamily="DM Mono" fontSize="13" letterSpacing="2" fill="#2a2620">
          BOOK ROUTE · ADMITTED
        </text>
        <g transform="translate(24 54) scale(1.7)" className="wp-visa-mark">
          {markPath(mark)}
        </g>
        <text x="74" y="76" fontFamily="Fraunces Variable, Georgia, serif" fontSize="16" fill="#2a2620" {...(name.length > 14 ? { textLength: 136, lengthAdjust: 'spacingAndGlyphs' as const } : {})}>
          {name}
        </text>
        <text x="74" y="96" fontFamily="DM Mono" fontSize="13" fill="#2a2620">
          {r.book!.by.toUpperCase().slice(0, 18)}
        </text>
        <text x="24" y="126" fontFamily="DM Mono" fontSize="13" fill="#2a2620">
          JOINED DAY 1 · {r.era}
        </text>
      </svg>
    );
  return (
    <svg className="wp-visa2" viewBox="0 0 220 160" role="img" aria-label={`Challenge visa: ${r.name}`}>
      <path d="M110 4 L214 34 V126 L110 156 L6 126 V34 Z" fill="#eee8dc" />
      <path d="M110 13 L205 40 V120 L110 147 L15 120 V40 Z" fill="none" stroke="#2a2620" strokeWidth="1.4" />
      <text x="110" y="46" textAnchor="middle" fontFamily="DM Mono" fontSize="13" letterSpacing="2" fill="#2a2620">
        VISA · JOINED
      </text>
      <g transform="translate(91 54) scale(1.6)" className="wp-visa-mark">
        {markPath(mark)}
      </g>
      <text x="110" y="112" textAnchor="middle" fontFamily="Fraunces Variable, Georgia, serif" fontSize="16" fill="#2a2620" {...fit}>
        {name}
      </text>
      <text x="110" y="130" textAnchor="middle" fontFamily="DM Mono" fontSize="13" fill="#2a2620">
        DAY 1 · {r.era}
      </text>
    </svg>
  );
}

export function JoinMoment({ id, onStart }: { id: string; onStart: () => void }) {
  const r = byId(id);
  const c = contentFor(id);
  const [from, to] = ROUTE_ART[id].ends;
  const expedition = r.km > EXPEDITION_KM;
  const [story, setStory] = useState(true);
  return (
    <main className={`wp-moment join ${expedition ? 'exp' : ''}`} style={inkOf(id)}>
      <div className="wp-join-road" aria-hidden="true">
        <RouteMap id={id} frac={1} />
      </div>
      <div className="wp-join-stamp">
        <span className="wp-join-ring" aria-hidden="true" />
        <span className="wp-join-ring r2" aria-hidden="true" />
        <span className="wp-join-visa">
          <Visa id={id} />
        </span>
        <span className="wp-dust" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} style={{ ['--a' as string]: `${i * 30}deg` }} />
          ))}
        </span>
      </div>
      <div className="wp-col center">
        <h1 className="wp-moment-title late1">{expedition ? `Your expedition begins: ${r.name}` : `You've joined ${r.name}`}</h1>
        <p className="wp-para center late2">
          {fmt(r.km)} km, {from} to {to}. {expedition ? 'It runs in the background beside your challenges, with your same steps' : 'Your steps count from today'}: {timeAt(r.km)} at your pace, with no deadline.
        </p>
        <ul className="wp-join-facts late2">
          <li>{RECORD_NAMES[r.record]}</li>
          <li>{r.era}</li>
          <li>{expedition ? 'Expedition 2 of 2' : 'Challenge 2 of 2'}</li>
        </ul>
      </div>

      <section className="wp-join-sig wp-col late3" aria-label={`${c.signature.title}: 0 of ${c.signature.count}`}>
        <span className="wp-label">Your collection · {c.signature.title}</span>
        <span className="wp-join-marks" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <i key={i}>
              <MarkShape mark={c.signature.mark} />
            </i>
          ))}
        </span>
        <span className="wp-quiet">
          0 of {fmt(c.signature.count)}. {c.signature.note}
        </span>
      </section>

      {r.book && (
        <div className="wp-col late3">
          <span className="wp-label">How would you like to walk it?</span>
          <div className="wp-chips" role="group" aria-label="Story or places">
            <button type="button" className={story ? 'on' : ''} onClick={() => setStory(true)}>
              With the story
            </button>
            <button type="button" className={!story ? 'on' : ''} onClick={() => setStory(false)}>
              Places only
            </button>
          </div>
          <p className="wp-quiet">{story ? 'The plot unfolds as you walk. You can pause it any time to read on yourself.' : 'Real places and history only; the plot stays hidden until you choose.'}</p>
        </div>
      )}

      <div className="wp-moment-btns late3">
        <button type="button" className="wp-primary" onClick={onStart}>
          {expedition ? 'Set out' : 'Start walking'}
        </button>
        {!expedition && <button type="button" className="wp-ghost">Add a target date</button>}
      </div>
    </main>
  );
}
