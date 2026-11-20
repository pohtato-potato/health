// Tonight's hero (boards 14, f14-stadium / f14-poster / f14-split): the match runs edge to edge instead of sitting in
// a card. Most nights are the Stadium; cups and big league nights the Poster; a rival's night the Split. Pure view:
// everything it shows comes in as props, so it renders without the router or the database.
import type { Comp } from '../../football/types';
import type { Result } from '../../football/types';

export type HeroLook = 'stadium' | 'poster' | 'split';

export interface HeroSide {
  name: string;
  /** The crest's svg markup. */
  crest: string;
  /** League position, when both clubs are in the same table. */
  pos?: number;
  /** Last results, oldest first. */
  form?: Result[];
  ink: string;
}

export interface HeroProps {
  look: HeroLook;
  us: HeroSide;
  /** Missing when the opponent is drawn on the night. */
  them?: HeroSide;
  /** The fixture as words: "League · Day 19 of 42 · away". */
  where: string;
  /** "Top-of-the-table clash", only when it is one. */
  tag?: string;
  /** Win, draw and loss in 100, and whether it is still a usual night's guess. */
  chance?: { p: [number, number, number]; usual: boolean };
  shine?: boolean;
}

const CUPS: Comp[] = ['bigcup', 'tiercup', 'playoff', 'worldcup', 'continental', 'clubworld'];

/** Which hero a night gets: a rival's night is the Split, cups and big league nights the Poster, the rest the Stadium. */
export function heroLook(o: { comp: Comp; rival: boolean; big: boolean }): HeroLook {
  if (o.rival) return 'split';
  if (CUPS.includes(o.comp) || o.big) return 'poster';
  return 'stadium';
}

export const ordinal = (n: number) => {
  const t = n % 100, s = t >= 11 && t <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
};

const standing = (s: HeroSide, form = true) => [s.pos ? ordinal(s.pos) : undefined, form && s.form?.length ? s.form.slice(-3).join(' ') : undefined].filter(Boolean).join(' · ');
const chanceWords = (p: [number, number, number]) => `${p[0]}% win, ${p[1]}% draw, ${p[2]}% loss`;
const WORDS = ['win', 'draw', 'loss'] as const;

function Crest({ s, className }: { s?: HeroSide; className?: string }) {
  return s
    ? <span className={`lth-cr ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: s.crest }} />
    : <span className={`lth-cr lth-unknown ${className ?? ''}`} aria-hidden="true" />;
}

const themName = (them?: HeroSide) => them?.name ?? 'Drawn on the night';

function Caption({ chance }: { chance: NonNullable<HeroProps['chance']> }) {
  return <p className="lth-cap">{chance.usual ? 'On a usual night' : 'Tonight’s chance, as it stands'}</p>;
}

function Stadium({ us, them, where, tag, chance, shine }: HeroProps) {
  const crowd = Array.from({ length: 48 }, (_, n) => (n % 24 < 12 ? us.ink : them?.ink ?? '#c4c1cf'));
  const [comp, ...rest] = where.split(' · ');
  return (
    <div className="lth lth-stadium">
      <span className="lth-bm l" aria-hidden="true" /><span className="lth-bm r" aria-hidden="true" /><span className="lth-bm c" aria-hidden="true" />
      <span className="lth-lamp l" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</span>
      <span className="lth-lamp r" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</span>
      <div className="lth-face">
        <div className="lth-sd" style={{ ['--g' as string]: us.ink }}>
          <Crest s={us} className={shine ? 'mo-shine' : undefined} />
          <b className="lth-nm">{us.name}</b>
          {standing(us) && <small>{standing(us)}</small>}
        </div>
        <div className="lth-vv" aria-hidden="true"><span>v</span></div>
        <div className="lth-sd" style={{ ['--g' as string]: them?.ink ?? '#c4c1cf' }}>
          <Crest s={them} />
          <b className={`lth-nm${themName(them).length > 12 ? ' long' : ''}`}>{themName(them)}</b>
          {them && standing(them) && <small>{standing(them)}</small>}
        </div>
      </div>
      {tag && <span className="lth-tag">{tag}</span>}
      {chance && (
        <>
          <div className="lth-board" role="img" aria-label={chanceWords(chance.p)}>
            {chance.p.map((n, i) => (
              <div key={WORDS[i]} style={{ ['--c' as string]: i === 0 ? us.ink : i === 1 ? 'var(--lth-draw)' : them?.ink ?? 'var(--lth-draw)', ['--d' as string]: `${1.2 + i * 0.2}s` }}>
                <b>{n}%</b><span>{WORDS[i]}</span>
              </div>
            ))}
          </div>
          <Caption chance={chance} />
        </>
      )}
      <div className="lth-stand" aria-hidden="true">{crowd.map((c, n) => <i key={n} style={{ ['--c' as string]: c, ['--d' as string]: `${((n * 37) % 11) / 10}s` }} />)}</div>
      <div className="lth-pitch" aria-hidden="true"><div className="lth-gr" /><span className="lth-ball" /></div>
      <p className="lth-where">{comp}{rest.length > 0 && <span>{rest.join(' · ')}</span>}</p>
    </div>
  );
}

function Poster({ us, them, where, shine }: HeroProps) {
  return (
    <div className="lth lth-poster">
      <div className="lth-sa" aria-hidden="true" /><div className="lth-sb" aria-hidden="true" />
      <svg className="lth-seam" viewBox="0 0 300 470" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="301" x2="300" y2="207" /></svg>
      <span className="lth-med ma"><Crest s={us} className={shine ? 'mo-shine' : undefined} /></span>
      <div className="lth-na"><b className={`lth-nm${us.name.length > 10 ? ' long' : ''}`}>{us.name}</b>{standing(us) && <span>{standing(us)}</span>}</div>
      <span className="lth-med mb"><Crest s={them} /></span>
      <div className="lth-nb"><b className={`lth-nm${themName(them).length > 10 ? ' long' : ''}`}>{themName(them)}</b>{them && standing(them) && <span>{standing(them)}</span>}</div>
      <span className="lth-vb" aria-hidden="true">v</span>
      <p className="lth-chip">{where}</p>
    </div>
  );
}

function Split({ us, them, where, shine }: HeroProps) {
  return (
    <div className="lth lth-split">
      <div className="lth-h a"><Crest s={us} className={shine ? 'mo-shine' : undefined} /><b className="lth-nm">{us.name}</b>{standing(us) && <small>{standing(us)}</small>}</div>
      <div className="lth-h b"><Crest s={them} /><b className={`lth-nm${themName(them).length > 12 ? ' long' : ''}`}>{themName(them)}</b>{them && standing(them) && <small>{standing(them)}</small>}</div>
      <svg className="lth-bolt" viewBox="0 0 44 440" preserveAspectRatio="none" aria-hidden="true"><polyline points="22,0 30,60 12,110 34,170 10,230 32,290 14,350 28,400 22,440" /></svg>
      <span className="lth-vb" aria-hidden="true">v</span>
      <p className="lth-meta"><span>{where}</span></p>
    </div>
  );
}

/** The chance under the Poster (three numbers, the loss largest) and the Split (three bubbles sized by likelihood). */
function Below({ look, us, them, tag, chance }: HeroProps) {
  if (look === 'stadium') return null;
  const ink = (i: number) => (i === 0 ? us.ink : i === 1 ? 'var(--lth-draw)' : them?.ink ?? 'var(--lth-draw)');
  const big = chance ? chance.p.indexOf(Math.max(...chance.p)) : -1;
  return (
    <div className={`lth-below ${look}`}>
      {tag && <span className="lth-tag">{tag}</span>}
      {chance && look === 'poster' && (
        <div className="lth-num" role="img" aria-label={chanceWords(chance.p)}>
          {chance.p.map((n, i) => (
            <div key={WORDS[i]} className={i === big ? 'big' : undefined} style={{ ['--c' as string]: ink(i), ['--d' as string]: `${0.9 + i * 0.15}s` }}><b>{n}%</b><i /><span>{WORDS[i]}</span></div>
          ))}
        </div>
      )}
      {chance && look === 'split' && (
        <div className="lth-bub" role="img" aria-label={chanceWords(chance.p)}>
          {chance.p.map((n, i) => (
            <div key={WORDS[i]} style={{ ['--c' as string]: ink(i), ['--s' as string]: `${Math.min(150, Math.round(56 + n * 1.4))}px`, ['--d' as string]: `${1 + i * 0.15}s` }}><b>{n}%</b><span>{WORDS[i]}</span></div>
          ))}
        </div>
      )}
      {chance && <Caption chance={chance} />}
    </div>
  );
}

export function TonightHero(p: HeroProps) {
  const label = `${p.where}: ${p.us.name} v ${themName(p.them)}`;
  return (
    <section className={`lth-wrap lth-${p.look}-wrap`} aria-label={label} data-look={p.look}>
      {p.look === 'stadium' ? <Stadium {...p} /> : p.look === 'poster' ? <Poster {...p} /> : <Split {...p} />}
      <Below {...p} />
    </section>
  );
}
