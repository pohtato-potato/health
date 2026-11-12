// Pieces of the fog (w3-atlas, w3-club, p3-scout): a hatched "?" for what is unseen, the known bar, a crest or its
// fogged stand-in.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { clubCrest } from '../../../football/art/crest';
import { clubById, STYLES } from '../../../football/data/load';
import { FACT_NAME, type Fact } from '../../../football/fog/fog';
import { CLUB_LORE } from '../../../football/fog/words';
import { weakSide } from '../../../football/matchday';
import '../../../styles/fog.css';

export function Art({ svg }: { svg: string }) {
  return <span className="fb-art" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** An unknown club's crest: hatched, with a "?". */
export const Unknown = ({ size = 28, label }: { size?: number; label?: string }) => (
  <span className="fg-unk" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ '--sz': `${size}px` } as CSSProperties}>?</span>
);

/** The club's crest when its kit and crest are known, else the fogged stand-in. */
export const CrestOrFog = ({ id, known, size = 28 }: { id: string; known: boolean; size?: number }) =>
  known ? <Art svg={clubCrest(clubById(id), size)} /> : <Unknown size={size} />;

/** One fact: its value when known, hatched with "?" when not. */
export function FactRow({ label, known, num, children }: { label: string; known: boolean; num?: boolean; children?: ReactNode }) {
  if (!known) return <div className="fg-fog" aria-label={`${label}: not known yet`}><span>{label}</span><b aria-hidden="true">?</b></div>;
  return <div className="fg-row"><span>{label}</span><b className={num ? 'num' : undefined}>{children}</b></div>;
}

/** Known %: the number and the bar. With `from`, the bar shows where it was and fills to where it is. */
export function Known({ pct, from, label = 'Known' }: { pct: number; from?: number; label?: string }) {
  // The bar starts where it was and fills to where it is.
  const [w, setW] = useState(from ?? pct);
  useEffect(() => { const t = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(t); }, [pct]);
  return (
    <>
      <div className="fg-row" style={{ borderBottom: 0 }}><span>{label}</span><span className="fg-pct">{from !== undefined && from !== pct ? `${from}% → ${pct}%` : `${pct}%`}</span></div>
      <div className="fg-kb" role="img" aria-label={`${label} ${pct}%`}>
        {from !== undefined && <i className="was" style={{ width: `${from}%` }} />}
        <i style={{ width: `${w}%` }} />
      </div>
    </>
  );
}

const WEAK: Record<string, string> = { left: 'Their left', middle: 'Through the middle', right: 'Their right' };
/** A known fact about a club, in words (the club page and the scout's report). `live`: this season's rating and style. */
export function factText(id: string, f: Fact, live?: { rating?: number; style?: string }): string {
  const c = clubById(id), lore = CLUB_LORE[id];
  const style = live?.style ?? c.style;
  switch (f) {
    case 'kit': return c.colours.length ? 'Seen up close' : 'Plain';
    case 'rating': return String(live?.rating ?? c.rating ?? '?');
    case 'style': return STYLES[style]?.say ?? style;
    case 'weak': return WEAK[weakSide(id)];
    case 'known': return c.known.length ? c.known.map((a) => `${a.name}${a.data ? ' [data]' : ''}: ${a.text}`).join(' · ') : 'None';
    case 'hidden': { const h = c.hidden ?? lore?.hiddenNew; return h ? `${h.name}${h.data ? ' [data]' : ''}: ${h.text}` : 'None found'; }
    case 'manager': return lore ? `${lore.manager.name}: ${lore.manager.line}` : 'Not on file yet';
    case 'history': return lore?.history ?? c.lore;
  }
}
export const factLabel = (f: Fact) => FACT_NAME[f];
