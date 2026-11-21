// The Kaai at dusk, the picture that leads the Club page (look pass, boards two and four). It grows with the club:
// each step up the divisions redraws it larger, and each building finished on the quay is added to it.
import type { Tier } from '../../../football/types';
import type { CSSProperties } from 'react';

/** Works team in the bottom two divisions, town club in the middle two, city club at the top. */
export const kaaiStage = (tier: Tier): 1 | 2 | 3 => (tier >= 5 ? 1 : tier >= 3 ? 2 : 3);
const has = (done: string[], prefix: string) => done.some((d) => d === prefix || d.startsWith(`${prefix}-`));

/** `stage` draws one stage on its own (the ground's "How the Kaai grows"); otherwise the division decides it. */
/** `site`: the Kaai Stand is not up yet, so the ground is drawn as plans on the quay (dashed, dim), not a finished home. */
/** `share`: on a site, how much of the Kaai Stand is built (0 to 1); that part rises, solid, inside the dashed outline. */
export function Kaai({ tier, done, height = 104, stage: only, site = false, share = 0 }: { tier: Tier; done: string[]; height?: number; stage?: 1 | 2 | 3; site?: boolean; share?: number }) {
  const stage = only ?? kaaiStage(tier);
  const sides = ['river-end', 'crane-stand', 'dock-end'].filter((x) => done.includes(x)).length;
  const lit = done.includes('floodlights');
  const words = [`stage ${stage} of 3`, sides ? `${sides} ${sides === 1 ? 'side stand' : 'side stands'}` : '', done.includes('roof') ? 'a roof' : '', has(done, 'cafe') ? 'the café' : '', has(done, 'shop') ? 'the shop' : '', has(done, 'ferry') ? 'the ferry stop' : '', done.includes('kaai-pressbox') ? 'the press box' : ''].filter(Boolean);
  return (
    <svg className="kc-kaai" viewBox="0 0 336 110" preserveAspectRatio="xMidYMax meet" style={{ height }} role="img" aria-label={site ? `Kaai 42 on the quay, being built: ${words.join(', ')}` : `The Kaai at dusk with its floodlights on: ${words.join(', ')}`}>
      <defs>
        <radialGradient id={`kc-fl${only ?? ""}`}>
          <stop offset="0" stopColor="#ffd9a8" stopOpacity={lit ? 1 : 0.85} />
          <stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="62" cy="18" r={lit ? 40 : 34} fill={`url(#kc-fl${only ?? ""})`} />
      <circle cx="274" cy="18" r={lit ? 40 : 34} fill={`url(#kc-fl${only ?? ""})`} />
      <g opacity={site ? 0.42 : 1}>
      {/* The ground itself: one stand at first. */}
      <path d="M0 110V78l40-14h256l40 14v32z" fill="#1a1d3d" />
      <path d="M40 64l20-22h216l20 22z" fill="#262a55" />
      <path d="M60 42h216" stroke="#ff9a4d" strokeWidth="2.5" />
      <path d="M62 64V16M274 64V16M52 16h20M264 16h20" stroke="#c4c1cf" strokeWidth="3" strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, i) => <rect key={i} x={56 + i * 26} y="74" width="10" height="8" fill="#f2c46d" opacity=".85" />)}
      {/* Town club: a second tier, and the buildings either side. */}
      {(stage >= 2 || sides >= 2) && <path d="M40 64l20-30h216l20 30z" fill="#2c3162" opacity=".95" />}
      {sides >= 1 && <><path d="M8 110V70h26v40z" fill="#232750" /><rect x="14" y="78" width="6" height="6" fill="#f2c46d" /></>}
      {sides >= 3 && <><path d="M302 110V60h26v50z" fill="#232750" /><rect x="310" y="70" width="6" height="6" fill="#f2c46d" /></>}
      {/* City club: a roof, the lit entrance, the quay wall in club purple. */}
      {(stage >= 3 || done.includes('roof')) && <><path d="M60 34l16-18h184l16 18z" fill="#343a72" /><path d="M76 16h184" stroke="#ffd9a8" strokeWidth="3" /></>}
      {stage >= 3 && <><path d="M150 110V84h36v26z" fill="#ff7a1a" opacity=".85" /><path d="M0 110h336" stroke="#9a74ec" strokeWidth="4" /></>}
      {/* The press box (ledger O40): a row of lit desks under the main stand's roof. */}
      {done.includes('kaai-pressbox') && <><rect x="128" y="64" width="80" height="9" rx="2" fill="#10122a" stroke="#93c3dc" strokeWidth="1.5" />{Array.from({ length: 5 }, (_, i) => <rect key={i} x={134 + i * 15} y="66.5" width="8" height="4" fill="#ffd9a8" />)}</>}
      {done.includes('scoreboard') && <rect x="150" y="22" width="36" height="12" rx="2" fill="#10122a" stroke="#ff9a4d" strokeWidth="1.5" />}
      {has(done, 'cafe') && <><path d="M36 110V92h22v18z" fill="#2a2450" /><rect x="41" y="96" width="12" height="6" fill="#ffb48a" /></>}
      {has(done, 'shop') && <><path d="M278 110V90h24v20z" fill="#2a2450" /><rect x="283" y="95" width="14" height="6" fill="#c2b2ff" /></>}
      {has(done, 'ferry') && <path d="M222 108h40M232 108v-8M252 108v-8" stroke="#93c3dc" strokeWidth="2.5" strokeLinecap="round" />}
      </g>
      {site && share > 0 && (
        <>
          <clipPath id={`kc-cl${only ?? ''}`}><rect className="kc-rise" x="0" y="42" width="336" height="68" style={{ '--share': Math.min(1, share) } as CSSProperties} /></clipPath>
          <g clipPath={`url(#kc-cl${only ?? ''})`}>
            <path d="M0 110V78l40-14h256l40 14v32z" fill="#1a1d3d" />
            <path d="M40 64l20-22h216l20 22z" fill="#262a55" />
            {Array.from({ length: 9 }, (_, i) => <rect key={i} className="kc-win" x={56 + i * 26} y="74" width="10" height="8" fill="#f2c46d" style={{ animationDelay: `${(i * 1.37) % 4}s` }} />)}
          </g>
        </>
      )}
      {site && <path className="kc-dash" d="M0 110V78l40-14 20-22h216l20 22 40 14v32" fill="none" stroke="#ffd9a8" strokeWidth="2" strokeDasharray="7 6" />}
    </svg>
  );
}
