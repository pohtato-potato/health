import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { buzz } from '../audio';
import { fmtInt } from '../domain/format';
import { prefOn, type VoiceId } from '../domain/types';
import { voiceFor, voiceLine, type Moment } from '../domain/voice';
import { db } from '../db/db';
import { useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { Confetti } from './Confetti';
import { Icon, type IconName } from './Icon';
import { useUnlockedIds } from './Theme';
import { confettiPalette } from '../domain/rewards';
import { Backdrop } from './moments/Backdrop';
import type { MomentStyle } from '../domain/firsts';

export type Tier = 'b' | 's' | 'g' | 'p';

export const TIER_COLOR: Record<Tier, string> = { b: 'var(--bronze)', s: 'var(--silver)', g: 'var(--gold)', p: 'var(--platinum)' };
export const TIER_NAME: Record<Tier, string> = { b: 'Bronze', s: 'Silver', g: 'Gold', p: 'Platinum' };

export interface RecordPage {
  name: string;
  big: string;
  bigLabel: string;
  detail: string;
  previous?: string;
  next?: string;
}

export type MomentData =
  | { kind: 'perfect'; key: string; kcal: number; protein: number; steps: number; sub: string }
  | { kind: 'record'; key: string; pages: RecordPage[] }
  | { kind: 'streak'; key: string; count: number; unit: string; kicker: string; title: string; text: string; next?: string; segments: number }
  | {
      kind: 'milestone';
      key: string;
      value: string;
      unit?: string;
      title: string;
      text: string;
      spark?: { points: number[]; from: string; to: string };
      stats?: { value: string; label: string }[];
      icon?: IconName;
      voice?: Moment;
    }
  | { kind: 'achievement'; key: string; id: string; tier: Tier; name: string; desc: string; reward?: string; title?: boolean; icon: IconName }
  | { kind: 'golden'; key: string; kicker: string; title: string; place?: string; text: string; foot?: string }
  | { kind: 'first'; key: string; title: string; detail: string; count: number };

interface MomentsApi {
  show: (m: MomentData) => void;
}

const Ctx = createContext<MomentsApi>({ show: () => {} });

export function useMoments() {
  return useContext(Ctx);
}

/**
 * Celebrations take the whole screen, one after another. Each is recorded as
 * seen when it appears, so none ever repeats. Back closes the current one.
 */
export function MomentsProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<MomentData[]>([]);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const skipPop = useRef(false);
  const settings = useSettings();
  const unlocked = useUnlockedIds();
  const special = settings && unlocked ? confettiPalette(settings.confetti, unlocked) : undefined;
  const current = queue[0];

  const show = useCallback((m: MomentData) => {
    setQueue((q) => (q.some((x) => x.key === m.key) ? q : [...q, m]));
  }, []);

  useEffect(() => {
    if (!current) return;
    void db.seen.put({ id: current.key, at: Date.now() });
    if (settings && settings.prefs.buzz) buzz(current.kind === 'perfect' || current.kind === 'golden' ? [60, 50, 60, 50, 120] : [70, 50, 70]);
    history.pushState({ moment: true, inApp: history.state?.inApp }, '');
    // Only the key matters: a new moment gets its own history entry.
  }, [current?.key]);

  useEffect(() => {
    const onPop = () => {
      if (skipPop.current) {
        skipPop.current = false;
        return;
      }
      if (queueRef.current.length) setQueue((q) => q.slice(1));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const close = useCallback(() => {
    if (history.state?.moment) {
      skipPop.current = true;
      history.back();
    }
    setQueue((q) => q.slice(1));
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {current && settings && createPortal(<MomentView key={current.key} m={current} onClose={close} voice={settings.voice} shuffle={prefOn(settings.prefs, 'shuffleVoices')} special={special} />, document.body)}
    </Ctx.Provider>
  );
}

const ALL = ['var(--apricot)', 'var(--lavender)', 'var(--sage)', 'var(--gold)', 'var(--pearl)'];
const GOLD = ['var(--gold)', '#f0d79e', '#c9a85a', 'var(--gold)'];

function MomentView({ m, onClose, voice, shuffle, special }: { m: MomentData; onClose: () => void; voice: VoiceId; shuffle: boolean; special?: string[] }) {
  const today = useToday();
  const v = voiceFor(voice, shuffle, today);
  const line = (moment: Moment, vars = {}) => voiceLine(v, moment, `${today}${m.key}`, vars);

  const closeBtn = (
    <button type="button" className="icon-btn" aria-label="Close" onClick={onClose} style={{ position: 'absolute', top: 'calc(14px + var(--safe-top))', right: 14, zIndex: 2 }}>
      <Icon name="close" size={20} stroke={1.8} />
    </button>
  );

  let body: ReactNode;
  let foot: ReactNode;
  let confetti: string[] | null = null;

  let backdrop: MomentStyle | null = null;

  switch (m.kind) {
    case 'first':
      backdrop = 'polaroid';
      body = (
        <>
          <div className="first-ember" aria-hidden />
          <div className="col gap8" style={{ alignItems: 'center', textAlign: 'center' }}>
            <div className="sf" style={{ fontSize: 40, lineHeight: 1.05 }}>
              {m.title}
            </div>
            <div className="t15 q">{m.detail}</div>
            <div className="t13 gold">Firsts so far: {m.count}</div>
          </div>
        </>
      );
      foot = (
        <button type="button" className="btn lg block" onClick={onClose}>
          Back to training
        </button>
      );
      break;
    case 'perfect':
      backdrop = 'stars';
      confetti = ALL;
      body = (
        <>
          <GlowRings />
          <div className="col gap8" style={{ alignItems: 'center' }}>
            <div className="sf" style={{ fontSize: 44, lineHeight: 1 }}>
              Perfect day
            </div>
            <div className="t16 q">{m.sub}</div>
          </div>
          <div className="grid3" style={{ width: '100%' }}>
            <Stat value={fmtInt(m.kcal)} label="Calories" color="var(--apricot)" />
            <Stat value={`${Math.round(m.protein)} g`} label="Protein" color="var(--lavender)" />
            <Stat value={fmtInt(m.steps)} label="Steps" color="var(--sage)" />
          </div>
          <div className="voice" style={{ fontSize: 16 }}>
            {line('perfect')}
          </div>
        </>
      );
      foot = (
        <button type="button" className="btn lg block" onClick={onClose}>
          Lovely
        </button>
      );
      break;
    case 'record':
      return <RecordView m={m} onClose={onClose} closeBtn={closeBtn} voiceText={line('record')} palette={special ?? GOLD} />;
    case 'streak':
      confetti = ['var(--gold)', 'var(--sage)', '#f0d79e'];
      body = (
        <>
          <SegmentRing count={m.count} unit={m.unit} segments={m.segments} />
          <div className="col gap8" style={{ alignItems: 'center' }}>
            <div className="lbl gold">{m.kicker}</div>
            <div className="sf" style={{ fontSize: 36, lineHeight: 1.1 }}>
              {m.title}
            </div>
            <div className="t15 q lh">{m.text}</div>
            <div className="voice" style={{ fontSize: 16, marginTop: 6 }}>
              {line('streak')}
            </div>
          </div>
        </>
      );
      foot = (
        <>
          {m.next && <div className="t13 q center">{m.next}</div>}
          <button type="button" className="btn lg block" onClick={onClose}>
            Keep going
          </button>
        </>
      );
      break;
    case 'milestone':
      confetti = ['var(--pearl)', 'var(--gold)', 'var(--sage)'];
      body = (
        <>
          <div className="lbl gold">Milestone</div>
          <div className="num" style={{ fontSize: 76 }}>
            {m.value}
            {m.unit && <span style={{ fontSize: 26, color: 'var(--quiet)' }}> {m.unit}</span>}
          </div>
          <div className="col gap8" style={{ alignItems: 'center' }}>
            <div className="sf" style={{ fontSize: 30, lineHeight: 1.1 }}>
              {m.title}
            </div>
            <div className="t15 q lh">{m.text}</div>
          </div>
          {m.spark && <MomentSpark {...m.spark} />}
          {m.stats && (
            <div className="grid2" style={{ width: '100%' }}>
              {m.stats.map((s) => (
                <Stat key={s.label} value={s.value} label={s.label} color="var(--quiet)" />
              ))}
            </div>
          )}
          <div className="voice" style={{ fontSize: 16 }}>
            {line(m.voice ?? 'milestone')}
          </div>
        </>
      );
      foot = (
        <div className="row" style={{ gap: 10 }}>
          <button
            type="button"
            className="btn lg ghost grow"
            onClick={() => {
              onClose();
              go('/journey');
            }}
          >
            See your journey
          </button>
          <button type="button" className="btn lg grow" onClick={onClose}>
            Close
          </button>
        </div>
      );
      break;
    case 'achievement':
      confetti = [TIER_COLOR[m.tier], 'var(--gold)', TIER_COLOR[m.tier]];
      body = (
        <>
          <Medal tier={m.tier} icon={m.icon} />
          <div className="col gap8" style={{ alignItems: 'center' }}>
            <div className="lbl" style={{ color: TIER_COLOR[m.tier] }}>
              {TIER_NAME[m.tier]} achievement
            </div>
            <div className="sf" style={{ fontSize: 34, lineHeight: 1.1 }}>
              {m.name}
            </div>
            <div className="t15 q lh">{m.desc}</div>
          </div>
          {m.reward && (
            <div className="col gap4" style={{ padding: '14px 18px', border: '1px solid var(--gold-rule)', borderRadius: 18, background: '#15130e', textAlign: 'left', width: '100%' }}>
              <div className="lbl sm gold-text">Unlocked</div>
              <div className="t14 lh">{m.reward}</div>
            </div>
          )}
          <div className="voice" style={{ fontSize: 16 }}>
            {line('achievement')}
          </div>
        </>
      );
      foot = (
        <div className="row" style={{ gap: 10 }}>
          <button
            type="button"
            className="btn lg ghost grow"
            onClick={() => {
              onClose();
              go('/achievements');
            }}
          >
            All
          </button>
          <button type="button" className="btn lg grow" onClick={onClose}>
            Lovely
          </button>
        </div>
      );
      break;
    case 'golden':
      backdrop = 'stars';
      body = (
        <>
          <svg width="100%" height="200" viewBox="0 0 390 200" aria-hidden="true" style={{ position: 'absolute', top: 60, left: 0, pointerEvents: 'none' }}>
            <defs>
              <filter id="gb" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="50" />
              </filter>
            </defs>
            <circle cx="195" cy="140" r="120" fill="var(--gold)" fillOpacity="0.16" filter="url(#gb)" />
            <g fill="var(--gold)">
              <path className="tw" d="M70 60 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z" />
              <path className="tw" d="M322 46 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5z" style={{ animationDelay: '-1s' }} />
              <path className="tw" d="M300 170 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" style={{ animationDelay: '-2s' }} />
              <path className="tw" d="M86 150 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" style={{ animationDelay: '-.5s' }} />
              <path className="tw" d="M196 20 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" style={{ animationDelay: '-1.5s' }} />
            </g>
          </svg>
          <div className="col gap8" style={{ alignItems: 'center' }}>
            <div className="lbl gold">Golden moment</div>
            <div className="sf" style={{ fontSize: 34, lineHeight: 1.1 }}>
              {m.kicker}
            </div>
          </div>
          <div className="col gap8" style={{ padding: '18px 20px', border: '1px solid var(--gold-border)', borderRadius: 22, background: 'var(--gold-bg)', textAlign: 'left', width: '100%' }}>
            {m.place && <div className="lbl sm gold-text">{m.place}</div>}
            <div className="sf" style={{ fontSize: 24 }}>
              {m.title}
            </div>
            <div className="t15 lh">{m.text}</div>
            {m.foot && <div className="t13 gold-text">{m.foot}</div>}
          </div>
        </>
      );
      foot = (
        <button type="button" className="btn lg block" onClick={onClose}>
          Keep it
        </button>
      );
      break;
  }

  return (
    <div className="moment" role="dialog" aria-modal="true">
      {backdrop && <Backdrop style={backdrop} seed={m.key.length} />}
      {confetti && <Confetti palette={special ?? confetti} count={30} height={Math.round(window.innerHeight * 0.6)} width={390} seed={m.key.length * 7 + 3} />}
      {closeBtn}
      <div className="col gap20 moment-body">{body}</div>
      <div className="moment-foot">{foot}</div>
    </div>
  );
}

function RecordView({ m, onClose, closeBtn, voiceText, palette }: { m: Extract<MomentData, { kind: 'record' }>; onClose: () => void; closeBtn: ReactNode; voiceText: string; palette: string[] }) {
  const [i, setI] = useState(0);
  const p = m.pages[i];
  const last = i === m.pages.length - 1;
  return (
    <div className="moment" role="dialog" aria-modal="true">
      <Confetti palette={palette} count={26} height={Math.round(window.innerHeight * 0.55)} width={390} seed={i * 11 + 5} />
      {m.pages.length > 1 && (
        <div className="t13 q" style={{ position: 'absolute', top: 'calc(24px + var(--safe-top))', left: 0, right: 0, textAlign: 'center' }}>
          {i + 1} of {m.pages.length}
        </div>
      )}
      {closeBtn}
      <div className="col gap20 moment-body">
        <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
          <defs>
            <filter id="mg" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          <circle className="glow" cx="70" cy="70" r="58" fill="none" stroke="var(--gold)" strokeWidth="10" filter="url(#mg)" />
          <circle cx="70" cy="70" r="58" fill="#15130e" stroke="var(--gold)" strokeWidth="1.6" />
          <circle cx="70" cy="70" r="50" fill="none" stroke="var(--gold)" strokeOpacity="0.35" strokeWidth="1" />
          <text x="70" y="78" textAnchor="middle" fill="#f0d79e" fontFamily="var(--serif)" fontWeight="300" fontSize={p.big.length > 3 ? 34 : 44}>
            {p.big}
          </text>
          <text x="70" y="98" textAnchor="middle" fill="var(--gold-text)" fontFamily="var(--sans)" fontSize="11" letterSpacing="1.5">
            {p.bigLabel}
          </text>
        </svg>
        <div className="col gap8" style={{ alignItems: 'center' }}>
          <div className="lbl gold" style={{ letterSpacing: '.16em' }}>
            New record
          </div>
          <div className="sf" style={{ fontSize: 38, lineHeight: 1.05 }}>
            {p.name}
          </div>
          <div className="t17">{p.detail}</div>
          {p.previous && <div className="t14 q">{p.previous}</div>}
        </div>
        {p.next && (
          <>
            <div style={{ width: 40, height: 1, background: 'var(--gold-border)' }} />
            <div className="col gap4" style={{ padding: '16px 18px', border: '1px solid var(--gold-rule)', borderRadius: 18, background: '#15130e', textAlign: 'left' }}>
              <div className="lbl sm gold-text">Next time</div>
              <div className="t14 lh">{p.next}</div>
            </div>
          </>
        )}
        {last && (
          <div className="voice" style={{ fontSize: 16 }}>
            {voiceText}
          </div>
        )}
      </div>
      <div className="moment-foot">
        <button type="button" className="btn lg block" onClick={() => (last ? onClose() : setI(i + 1))}>
          {last ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="col gap4" style={{ alignItems: 'center' }}>
      <div className="t17 tn">{value}</div>
      <div className="t11" style={{ letterSpacing: '.1em', textTransform: 'uppercase', color }}>
        {label}
      </div>
    </div>
  );
}

function GlowRings() {
  const rings: [number, string][] = [
    [84, 'var(--apricot)'],
    [66, 'var(--lavender)'],
    [48, 'var(--sage)'],
  ];
  return (
    <svg width="220" height="220" viewBox="0 0 200 200" role="img" aria-label="All three rings closed">
      <defs>
        <filter id="rg" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <g className="glow" filter="url(#rg)" fill="none" strokeWidth="16">
        {rings.map(([r, c]) => (
          <circle key={r} cx="100" cy="100" r={r} stroke={c} />
        ))}
      </g>
      <g fill="none" strokeWidth="13">
        {rings.map(([r, c]) => (
          <circle key={r} cx="100" cy="100" r={r} stroke={c} />
        ))}
      </g>
      <text x="100" y="111" textAnchor="middle" fill="var(--text)" fontFamily="var(--serif)" fontWeight="300" fontSize="32">
        3/3
      </text>
    </svg>
  );
}

function SegmentRing({ count, unit, segments }: { count: number; unit: string; segments: number }) {
  const n = Math.max(1, Math.min(segments, 12));
  const c = 95;
  const r = 80;
  const arcs = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
    const gap = n > 1 ? 0.06 : 0;
    const p0 = [c + r * Math.cos(a0 + gap), c + r * Math.sin(a0 + gap)];
    const p1 = [c + r * Math.cos(a1 - gap), c + r * Math.sin(a1 - gap)];
    const large = a1 - a0 - 2 * gap > Math.PI ? 1 : 0;
    return `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r} ${r} 0 ${large} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
  });
  return (
    <svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label={`${count} ${unit}`}>
      <g fill="none" strokeWidth="12" strokeLinecap="round" stroke="var(--gold)">
        {arcs.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <text x="95" y="110" textAnchor="middle" fontFamily="var(--serif)" fontWeight="300" fontSize={count > 99 ? 46 : 60} fill="var(--text)">
        {count}
      </text>
      <text x="95" y="134" textAnchor="middle" fontFamily="var(--sans)" fontSize="12" fill="var(--quiet)" letterSpacing="2">
        {unit.toUpperCase()}
      </text>
    </svg>
  );
}

function MomentSpark({ points, from, to }: { points: number[]; from: string; to: string }) {
  if (points.length < 2) return null;
  const W = 300;
  const H = 84;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => 10 + (i / (points.length - 1)) * (W - 20);
  const y = (v: number) => 10 + (1 - (v - min) / span) * 50;
  const pts = points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = points.length - 1;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: 300 }} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--pearl)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(0)} cy={y(points[0])} r="3.5" fill="var(--pearl)" />
      <circle cx={x(last)} cy={y(points[last])} r="6" fill="var(--gold)" />
      <text x="10" y={Math.min(y(points[0]) + 22, H - 2)} fill="var(--dim)" fontFamily="var(--sans)" fontSize="11">
        {from}
      </text>
      <text x={W - 10} y={H - 4} textAnchor="end" fill="var(--gold)" fontFamily="var(--sans)" fontSize="11">
        {to}
      </text>
    </svg>
  );
}

export function Medal({ tier, icon, size = 150, locked }: { tier: Tier; icon: IconName; size?: number; locked?: boolean }) {
  const c = locked ? 'var(--faint)' : TIER_COLOR[tier];
  return (
    <svg width={size} height={size} viewBox="0 0 150 150" aria-hidden="true">
      <defs>
        <filter id={`pg-${tier}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      {!locked && <circle className="glow" cx="75" cy="75" r="60" fill="none" stroke={c} strokeWidth="10" filter={`url(#pg-${tier})`} />}
      <circle cx="75" cy="75" r="60" fill="#12151b" stroke={c} strokeWidth="1.8" />
      <circle cx="75" cy="75" r="51" fill="none" stroke={c} strokeOpacity="0.35" strokeWidth="1" />
      <g transform="translate(45 45) scale(2.5)">
        <Icon name={icon} size={24} color={c} stroke={1.3} />
      </g>
    </svg>
  );
}
