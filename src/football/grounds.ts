// Grounds (spec §5.5, board 10). Most clubs share their tier's shape; rivals, the elite and a seeded twelve get their
// own; finals are at a neutral bowl; Brabo play at the borrowed Kaai ground.
import { CLUBS, type ClubDef } from './data/load';
import { ANTIGOON } from './rivals';
import { hashSeed, rng, shuffle } from './rng';
import type { Tier } from './types';

export type GroundKind = 'tier' | 'own' | 'neutral' | 'kaai';
export interface GroundShape { kind: GroundKind; key: string; name: string; svg: string }

const ST = 'class="st"', RK = 'class="rk"', MS = 'class="ms"';
/** Six tier shapes, from a two-stand rec ground (tier 6) to a full bowl with a roof (tier 1). */
const TIER_SHAPE: Record<Tier, string> = {
  6: `<path d="M60 150 V112 H300 V150" ${ST}/><path d="M68 128 H292 M68 140 H292" ${RK}/><path d="M20 150 V132 H60 M300 132 H340 V150" ${RK}/>`,
  5: `<path d="M40 150 V104 H320 V150" ${ST}/><path d="M48 120 H312 M48 134 H312" ${RK}/><line x1="30" y1="150" x2="30" y2="60" ${MS}/><line x1="330" y1="150" x2="330" y2="60" ${MS}/>`,
  4: `<path d="M30 150 V96 L180 88 L330 96 V150" ${ST}/><path d="M38 116 L322 116 M38 132 L322 132" ${RK}/><path d="M24 96 L180 80 L336 96" ${ST}/>`,
  3: `<path d="M24 150 V86 H336 V150" ${ST}/><path d="M32 104 H328 M32 120 H328 M32 136 H328" ${RK}/><path d="M16 84 H344" ${ST}/><line x1="180" y1="84" x2="180" y2="62" ${MS}/>`,
  2: `<path d="M18 150 V80 Q180 60 342 80 V150" ${ST}/><path d="M26 102 Q180 84 334 102 M26 124 Q180 108 334 124" ${RK}/><path d="M10 76 Q180 50 350 76" ${ST}/>`,
  1: `<path d="M14 150 V100 Q180 50 346 100 V150" ${ST}/><path d="M24 128 Q180 88 336 128" ${RK}/><path d="M34 112 Q180 70 326 112" ${RK}/><path d="M6 92 Q180 34 354 92" ${ST}/>`,
};
const BOWL = `<path d="M14 150 V100 Q180 50 346 100 V150" ${ST}/><path d="M24 128 Q180 88 336 128" ${RK}/><path d="M34 112 Q180 70 326 112" ${RK}/><path d="M6 92 Q180 34 354 92" ${ST}/>`;
const KAAI = `<path d="M28 150 V108 H96 V150" ${ST}/><path d="M96 150 V82 L264 74 V150" ${ST}/><path d="M104 126 L256 120 M104 138 L256 133" ${RK}/><line x1="44" y1="108" x2="44" y2="34" ${MS}/><line x1="248" y1="76" x2="248" y2="30" ${MS}/>`;

/** A ground of a club's own, drawn from its id: stand heights, a roof line and floodlight masts. */
export function ownShape(id: string): string {
  const r = rng(hashSeed('ground', id));
  const h = [0, 1, 2, 3].map(() => 64 + Math.floor(r() * 56));
  const xs = [16, 100, 180, 260, 344];
  const stands = h.map((y, i) => `<path d="M${xs[i] + 4} 150 V${y} H${xs[i + 1] - 4} V150" ${ST}/>`).join('');
  const rakes = h.map((y, i) => `<path d="M${xs[i] + 10} ${y + 20} H${xs[i + 1] - 10} M${xs[i] + 10} ${y + 36} H${xs[i + 1] - 10}" ${RK}/>`).join('');
  const roof = r() < 0.5 ? `<path d="M10 ${Math.min(...h) - 10} Q180 ${Math.min(...h) - 40} 350 ${Math.min(...h) - 10}" ${ST}/>` : '';
  const masts = r() < 0.6 ? [40, 320].map((x) => `<line x1="${x}" y1="150" x2="${x}" y2="${20 + Math.floor(r() * 20)}" ${MS}/>`).join('') : '';
  return stands + rakes + roof + masts;
}

/** The seeded handful of ordinary clubs that get a ground of their own: always the same twelve. */
export const LUCKY_TWELVE: string[] = shuffle(rng(hashSeed('grounds', 'twelve')), CLUBS.filter((c) => c.kind !== 'own' && !c.elite && c.id !== ANTIGOON).map((c) => c.id)).slice(0, 12);

export function groundFor(club: ClubDef, tier: Tier = club.tier, rivals: string[] = [], neutral = false): GroundShape {
  if (neutral) return { kind: 'neutral', key: 'bowl', name: 'A neutral ground', svg: BOWL };
  if (club.kind === 'own') return { kind: 'kaai', key: 'kaai', name: 'The Kaai (borrowed)', svg: KAAI };
  const own = club.elite || club.id === ANTIGOON || rivals.includes(club.id) || LUCKY_TWELVE.includes(club.id);
  if (own) return { kind: 'own', key: `own:${club.id}`, name: club.ground || `${club.name}'s ground`, svg: ownShape(club.id) };
  return { kind: 'tier', key: `tier:${tier}`, name: club.ground || 'Their ground', svg: TIER_SHAPE[tier] };
}

export const groundSvg = (g: GroundShape, label?: string) =>
  `<svg class="fb-ground" viewBox="0 0 360 160" ${label ? `role="img" aria-label="${label.replace(/"/g, '&quot;')}"` : 'aria-hidden="true"'}><path d="M0 150 H360" class="pt"/>${g.svg}</svg>`;
