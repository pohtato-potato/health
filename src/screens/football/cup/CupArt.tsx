// Cup runs' drawings (visual rounds 1–3, approved 11 Nov): move cards as coaching-board diagrams with the cost top left,
// the value bottom right, the frame shape telling the kind, a slanted name plate and each axis in its own ink; the
// cups' silverware; heirlooms in chalk; real outline crests for both clubs; the cast as plain silhouettes.
import type { CSSProperties, ReactNode } from 'react';
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { actsAs, baseCost, CARD, cardName, roleOf } from '../../../football/cup/cards';
import type { HeirloomArt } from '../../../football/cup/heirlooms';
import type { Silverware } from '../../../football/cup/ladder';
import { fxOf, isPool } from '../../../football/cup/pool';
import type { Card, CardKind } from '../../../football/cup/types';
import { clubById } from '../../../football/data/load';
import { AXIS_INK } from '../../../ui/inks';

export const WILD_INK = '#f2c46d';
export const NONE_INK = '#a9a7b8';
export const inkOf = (c: Card): string => (c.axis ? AXIS_INK[c.axis] : c.kind === 'total' ? WILD_INK : NONE_INK);

/** Raw SVG in a span (the crest kit draws strings). */
export const Svg = ({ svg, className }: { svg: string; className?: string }) => <span className={`cup-svg ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;

export function Crest({ id, size = 28, own }: { id: string; size?: number; own?: { step: 1 | 2 | 3 | 4 | 5; opt: 'a' | 'b' | 'c' | 'd' | 'e' } }) {
  if (own) return <Svg svg={crestSvg(own.step, own.opt, size)} />;
  try { return <Svg svg={clubCrest(clubById(id), size)} />; } catch { return <span className="cup-crest-x" style={{ width: size, height: size }} />; }
}

/** The slanted white slab the tactics board uses for headings. */
export const Slab = ({ children }: { children: ReactNode }) => <span className="cup-slab"><span>{children}</span></span>;

// --- the diagrams ------------------------------------------------------------------------------------------------
const O = (x: number, y: number, r = 5) => <circle cx={x} cy={y} r={r} />;
const Xm = (x: number, y: number, s = 4) => <path d={`M${x - s} ${y - s}l${2 * s} ${2 * s}M${x + s} ${y - s}l${-2 * s} ${2 * s}`} opacity=".55" />;
const Ar = ({ d, dash, w = 2.4 }: { d: string; dash?: boolean; w?: number }) => <path d={d} strokeDasharray={dash ? '5 5' : undefined} strokeWidth={w} markerEnd="url(#cup-ah)" />;
const GOAL = <path d="M38 6h24v9H38z" opacity=".7" />;
type ArtKey = 'pass' | 'carry' | 'strike' | 'header' | 'thunder' | 'wind' | 'fuel' | 'hold' | 'fresh' | 'drill' | 'system' | 'total' | 'punt';
const ART: Record<ArtKey, ReactNode> = {
  pass: <>{O(26, 54)}{O(70, 40)}<Ar d="M32 52 L63 42" dash /><Ar d="M66 34 L46 20" dash /><Ar d="M26 47 Q28 28 40 20" /></>,
  carry: <>{O(40, 46)}{O(62, 54)}<Ar d="M68 52 Q88 36 70 14" /><Ar d="M46 44 L66 22" dash /></>,
  strike: <>{GOAL}{O(50, 54, 6)}<Ar d="M50 46 L50 20" w={4} /></>,
  header: <>{GOAL}{O(48, 32)}<Ar d="M10 56 Q30 14 43 28" dash /><Ar d="M52 28 L56 17" w={3} /></>,
  thunder: <>{GOAL}{O(50, 62, 6)}<Ar d="M50 54 L50 18" w={5} /><path d="M34 30l-8-4M66 30l8-4M30 44l-9 0M70 44l9 0" opacity=".8" /></>,
  wind: <>{O(50, 36, 7)}<Ar d="M30 36 A20 20 0 0 1 64 22" /><Ar d="M70 36 A20 20 0 0 1 36 50" /></>,
  fuel: <>{O(50, 46, 6)}<path d="M38 30l12-10 12 10M38 18l12-10 12 10" /></>,
  hold: <><path d="M10 40h80" strokeWidth={3.2} />{O(22, 40)}{O(41, 40)}{O(60, 40)}{O(79, 40)}{Xm(34, 14)}{Xm(66, 14)}<path d="M34 20v10M28 30h12M66 20v10M60 30h12" opacity=".7" /></>,
  fresh: <>{O(30, 36, 6)}{O(70, 36, 6)}<Ar d="M38 28 Q50 16 62 28" /><Ar d="M62 46 Q50 58 38 46" /></>,
  drill: <>{O(50, 14)}{O(24, 54)}{O(76, 54)}<Ar d="M45 20 L29 46" dash /><Ar d="M32 55 L68 55" dash /><Ar d="M72 46 L56 20" dash /></>,
  system: <>{[[50, 62], [20, 48], [40, 50], [60, 50], [80, 48], [30, 34], [50, 36], [70, 34], [22, 16], [50, 12], [78, 16]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={3.4} />)}</>,
  total: <>{O(50, 36, 5)}{[[1, 0], [0.5, 0.87], [-0.5, 0.87], [-1, 0], [-0.5, -0.87], [0.5, -0.87]].map(([c, s]) => <circle key={`${c}${s}`} cx={50 + 26 * c} cy={36 + 22 * s} r={3.4} />)}<Ar d="M76 30 A27 23 0 0 0 56 14" dash /></>,
  punt: <>{O(22, 58)}<Ar d="M26 52 Q52 -10 84 30" dash /><text x="80" y="54" fontSize="20" fontWeight="700" fill="currentColor" stroke="none">?</text></>,
};
const START_ART: Partial<Record<CardKind, ArtKey>> = {
  'one-two': 'pass', overlap: 'carry', strike: 'strike', header: 'header', thunderbolt: 'thunder', 'second-wind': 'wind', fuelled: 'fuel',
  hold: 'hold', 'fresh-legs': 'fresh', drilled: 'drill', system: 'system', total: 'total', punt: 'punt', loan: 'strike',
};
function artFor(c: Card): ArtKey {
  if (!isPool(c.kind)) return START_ART[c.kind as CardKind] ?? 'pass';
  const f = fxOf(c.kind, c.level);
  switch (roleOf(c.kind)) {
    case 'pass': return 'pass';
    case 'carry': return 'carry';
    case 'finish': return f.perPass ? 'header' : f.anywhere || f.fromMid || (f.shot ?? 0) >= 10 ? 'thunder' : 'strike';
    case 'stamina': return f.nextStamina ? 'fuel' : 'wind';
    case 'cover': return f.fit ? 'fresh' : 'hold';
    case 'system': return 'system';
    default: return 'drill';
  }
}
/** The SVG markers the diagrams share; drawn once per screen. */
export const ArtDefs = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <defs><marker id="cup-ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke" stroke="none" /></marker></defs>
  </svg>
);

/** The frame by kind: square for passes and carries, a cut corner for finishes, a rounded foot for cover, cut shoulders for systems, a rounded head for stamina. */
function frameOf(c: Card): string {
  const r = roleOf(actsAs(c).kind);
  if (c.kind === 'total') return 'system';
  return r === 'finish' ? 'finish' : r === 'cover' ? 'cover' : r === 'system' ? 'system' : r === 'stamina' ? 'fuel' : '';
}
/** The big number and its label, bottom right. */
function valueOf(c: Card): [string, string] {
  const { kind, level } = actsAs(c);
  if (c.kind === 'total') return ['', 'ANY'];
  if (isPool(kind)) {
    const f = fxOf(kind, level);
    switch (roleOf(kind)) {
      case 'finish': return [String(f.shot ?? 0), 'SHOT'];
      case 'cover': return f.cover ? [String(f.cover), 'COVER'] : f.threatDown ? [`−${f.threatDown}`, 'ATTACK'] : [`+${f.fit ?? 0}`, 'FIT'];
      case 'stamina': return f.stamina ? [`+${f.stamina}`, 'STAMINA'] : f.nextStamina ? [`+${f.nextStamina}`, 'NEXT'] : [`+${f.fit ?? 0}`, 'FIT'];
      case 'pass': return ['', 'PASS'];
      case 'carry': return ['', 'CARRY'];
      case 'system': return ['', 'STAYS'];
      default: return f.build ? [`+${f.build}`, 'BUILD'] : ['', 'RECYCLE'];
    }
  }
  switch (kind as CardKind) {
    case 'strike': return [String(CARD.strike[level]), 'SHOT'];
    case 'header': return [String(CARD.header[level]), 'SHOT'];
    case 'thunderbolt': return [String(CARD.thunderbolt), 'SHOT'];
    case 'punt': return [String(CARD.punt), 'SHOT'];
    case 'second-wind': return [`+${CARD.secondWind[level]}`, 'STAMINA'];
    case 'fuelled': return [`+${CARD.fuelled[level]}`, 'NEXT'];
    case 'hold': return [String(CARD.hold[level]), 'COVER'];
    case 'fresh-legs': return [String(CARD.freshCover[level]), 'COVER'];
    case 'one-two': return ['', 'PASS'];
    case 'overlap': return ['', 'CARRY'];
    case 'drilled': return ['', 'RECYCLE'];
    case 'system': return ['', 'STAYS'];
    default: return ['', ''];
  }
}
const ARROWS = { basic: '▲', good: '▲▲', great: '▲▲▲' };

/** A move card. `cost` overrides the printed cost (a free pass); `note` is a line under the card (a preview, a price). */
export function MoveCard({ c, cost, off, note, noteKind, className, small }: { c: Card; cost?: number; off?: boolean; note?: string; noteKind?: string; className?: string; small?: boolean }) {
  const ink = inkOf(c);
  const [val, lab] = valueOf(c);
  return (
    <span className={`cup-cd ${frameOf(c)} ${c.level === 'great' ? 'great' : ''} ${off ? 'off' : ''} ${small ? 'sm' : ''} ${className ?? ''}`} style={{ '--ink': ink, color: ink } as CSSProperties}>
      <span className="cup-cd-cost" aria-hidden="true">{cost ?? baseCost(c.kind)}</span>
      <span className="cup-cd-art" aria-hidden="true">
        <svg viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">{ART[artFor(c)]}</svg>
      </span>
      <span className="cup-cd-nm"><span>{cardName(c)}</span></span>
      <span className="cup-cd-ft">
        <span className="cup-cd-lv" aria-hidden="true">{c.kind === 'punt' ? '' : ARROWS[c.level]}</span>
        <span className="cup-cd-val">{val}<small>{lab}</small></span>
      </span>
      {note && <span className={`cup-cd-note k-${noteKind ?? ''}`}>{note}</span>}
    </span>
  );
}

// --- silverware --------------------------------------------------------------------------------------------------
const SILVER: Record<Silverware, string> = {
  shield: 'M8 6h28v14c0 10-8 16-14 18C16 36 8 30 8 20z',
  cup: 'M12 6h20v10a10 10 0 0 1-20 0zM12 9H6a6 6 0 0 0 7 8M32 9h6a6 6 0 0 1-7 8M22 26v6M14 38h16M16 32h12',
  lantern: 'M16 10h12l4 18H12zM18 10V6h8v4M12 28h20v4H12zM22 14v10',
  plate: 'M22 7a15 15 0 1 0 0.01 0zM22 14a8 8 0 1 0 0.01 0z',
  ewer: 'M17 6h10l-2 8c6 3 8 8 8 13a11 11 0 0 1-22 0c0-5 2-10 8-13zM15 38h14',
  ears: 'M14 6h16v14a8 8 0 0 1-16 0zM14 8C4 8 4 22 15 22M30 8c10 0 10 14-1 14M22 28v5M15 38h14l-2-5h-10z',
  tall: 'M14 4h16l-3 18a5 5 0 0 1-10 0zM10 8h4M30 8h4M22 27v6M16 38h12l-2-5h-8z',
  globe: 'M22 4a12 12 0 1 0 0.01 0zM10 16h24M22 4c-6 6-6 18 0 24M22 4c6 6 6 18 0 24M18 30l-2 8h12l-2-8',
};
export function Trophy({ kind, colour, size = 44, label }: { kind: Silverware; colour: string; size?: number; label?: string }) {
  return (
    <svg className="cup-trophy" viewBox="0 0 44 44" width={size} height={size} fill="none" stroke={colour} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 ${size > 80 ? 14 : 6}px ${colour})` }} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d={SILVER[kind]} />
    </svg>
  );
}

// --- heirlooms in chalk ------------------------------------------------------------------------------------------
const HEIR_ART: Record<HeirloomArt, string> = {
  ball: '<circle cx="60" cy="60" r="46"/><path d="M60 34l22 16-8 26H46l-8-26zM60 34V14M82 50l20-8M74 76l12 18M46 76L34 94M38 50L18 42"/>',
  rake: '<path d="M30 100L86 24M70 14l32 24M74 18l-6 8M82 24l-6 8M90 30l-6 8M98 36l-6 8"/>',
  scarf: '<path d="M24 30q36-20 72 0l-8 14q-28-14-56 0zM32 44l-6 56h18l4-50M88 44l6 56H76l-4-50"/><path d="M26 86h18M76 86h18" opacity=".7"/>',
  bag: '<path d="M22 46h76v52H22zM42 46V32h36v14M60 60v24M48 72h24"/>',
  napkin: '<path d="M20 26h80v68H20zM20 26l80 68" opacity=".5"/><path d="M36 76l14-18 12 10 18-24" /><circle cx="36" cy="76" r="4"/><circle cx="80" cy="44" r="4"/>',
  turnstile: '<path d="M30 100V34h60v66M30 56h60M60 56v-22M60 56l24 18M60 56L36 74"/><circle cx="60" cy="56" r="6"/>',
  armband: '<path d="M22 46q38-16 76 0v28q-38-16-76 0z"/><text x="60" y="70" font-size="26" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none">C</text>',
  boot: '<path d="M30 24h22v40l40 12q10 4 6 18H26zM34 94v8M50 94v8M66 94v8M82 94v8"/>',
  needle: '<path d="M26 96L94 28M86 22q14-4 12 10M26 96l-6 4" /><path d="M40 70q10 20 30 10q14-8 4-22" opacity=".7"/>',
  board: '<path d="M16 22h88v62H16zM40 84l-10 20M80 84l10 20"/><circle cx="40" cy="44" r="5"/><path d="M50 44l26 18M74 40l8 8M82 40l-8 8"/>',
  book: '<path d="M60 30q-20-10-40-4v70q20-6 40 4q20-10 40-4V26q-20-6-40 4zM60 30v70"/><path d="M30 46h18M30 58h18M72 46h18M72 58h18" opacity=".7"/>',
  watch: '<circle cx="60" cy="66" r="34"/><path d="M52 24h16M60 24v8M60 66V44M60 66l14 10M44 48l10 14" /><path d="M80 40l-12 24" opacity=".6"/>',
  bulb: '<path d="M60 18a26 26 0 0 0-14 48v14h28V66a26 26 0 0 0-14-48zM48 90h24M52 100h16"/>',
  flag: '<path d="M40 104V18M40 20h44l-10 14 10 14H40"/>',
  drum: '<ellipse cx="60" cy="40" rx="36" ry="12"/><path d="M24 40v40q36 22 72 0V40M30 46l14 34M90 46L76 80M60 52v38"/>',
  boot2: '<path d="M22 70q20-30 46-20l30 10q8 6 2 16H22zM28 86l4 10M46 86l4 10M64 86l4 10M82 86l4 10"/>',
  crate: '<path d="M20 44h80v54H20zM20 62h80M20 80h80"/><path d="M34 44V24h10v20M56 44V20h10v24M78 44V26h10v18"/>',
  programme: '<path d="M30 16h60v88H30z"/><path d="M42 32h36M42 44h24" /><circle cx="60" cy="74" r="14"/><path d="M54 70l6-6 6 6-2 8h-8z" opacity=".8"/>',
  key: '<circle cx="40" cy="44" r="18"/><circle cx="40" cy="44" r="6"/><path d="M54 56l40 40M78 80l8-8M86 88l8-8"/>',
  tie: '<path d="M50 16h20l-4 12 12 60-18 16-18-16 12-60z"/><path d="M54 48l12 6M52 64l16 8" opacity=".6"/>',
  ticket: '<path d="M14 36h92v14a10 10 0 0 0 0 20v14H14V70a10 10 0 0 0 0-20zM76 36v48" stroke-dasharray="0"/><path d="M28 54h34M28 66h22" opacity=".7"/>',
  hamper: '<path d="M18 52h84l-8 48H26zM34 52q26-40 52 0M18 52h84M30 66h60M34 82h52" />',
  whistleless: '<circle cx="60" cy="60" r="40"/>',
};
export function HeirloomDrawing({ art, colour, size = 150 }: { art: HeirloomArt; colour: string; size?: number }) {
  return <svg viewBox="0 0 120 120" width={size} height={size} fill="none" stroke={colour} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ color: colour, filter: `drop-shadow(0 0 ${size > 60 ? 14 : 4}px ${colour})` }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: HEIR_ART[art] }} />;
}

/** A cast member: a plain silhouette until we know who they are. */
export const Silhouette = ({ size = 48 }: { size?: number }) => <i className="cup-sil" style={{ width: size, height: size }} aria-hidden="true" />;
