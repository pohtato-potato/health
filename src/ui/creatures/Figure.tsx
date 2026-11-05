import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { figureFor, type Creature, type Line, type Part } from '../../domain/creatureRoster';
import '../../styles/creatures.css';

const stroke = (l: Line) => (typeof l === 'string' ? l : l.d);

function Parts({ c, parts, faint, draw, delay = 0 }: { c: Creature; parts: Part[]; faint?: boolean; draw: boolean; delay?: number }) {
  let n = 0;
  return (
    <>
      {parts.map((p, pi) => (
        <g key={pi} className={`cr-part cr-${p.a}${p.role ? ` r-${p.role}` : ''}`} style={{ transformOrigin: p.o, ['--turn' as string]: `${p.turn ?? 12}deg` }}>
          {p.l.map((l, li) => (
            <path key={li} d={stroke(l)} pathLength={1} className={`cr-ln${draw ? ' draw' : ''}${faint ? ' faint' : ''}`} stroke={typeof l === 'string' ? c.main : c.acc} style={draw ? { animationDelay: `${delay + n++ * 0.1}s` } : undefined} />
          ))}
          {(p.f ?? []).map(([x, y, r], fi) => (
            <circle key={`f${fi}`} cx={x} cy={y} r={r} className={`cr-fl${draw ? ' draw' : ''}`} fill={c.acc} style={draw ? { animationDelay: `${delay + 1.9}s` } : undefined} />
          ))}
          {(p.s ?? []).map(([x, y], si) => (
            <circle key={`s${si}`} cx={x} cy={y} r={si % 2 ? 2.3 : 3} className={`cr-st${draw ? ' draw' : ''}`} fill={c.star} style={{ filter: `drop-shadow(0 0 5px ${c.main})`, animationDelay: draw ? `${delay + 1.8 + si * 0.08}s, ${3.2 + si * 0.2}s` : `${si * 0.2}s` }} />
          ))}
        </g>
      ))}
    </>
  );
}

/** One figure, standing alone: it draws itself, lights up, and idles. For layers and small views. */
export function CreatureSvg({ c, stage, draw = false, delay = 0, className }: { c: Creature; stage: number; draw?: boolean; delay?: number; className?: string }) {
  const f = useMemo(() => figureFor(c, stage), [c, stage]);
  return (
    <svg viewBox="-8 -8 256 216" className={`cr-svg${className ? ` ${className}` : ''}`} aria-hidden="true">
      <Parts c={c} parts={f.parts} faint={f.faint} draw={draw} delay={delay} />
    </svg>
  );
}

function Sparks({ c, delay, run }: { c: Creature; delay: number; run: number }) {
  return (
    <>
      {Array.from({ length: 16 }, (_, k) => {
        const a = (k / 16) * Math.PI * 2;
        const d = 80 + (k % 3) * 24;
        return <i key={`${run}-${k}`} className="cr-spark" style={{ background: k % 2 ? c.main : c.acc, boxShadow: `0 0 10px ${c.main}`, ['--dx' as string]: `${Math.cos(a) * d}px`, ['--dy' as string]: `${Math.sin(a) * d}px`, animationDelay: `${delay}s` }} />;
      })}
    </>
  );
}

/** A figure you can tap. Each reacts in its own way, on its own hinges; a guest shifts into its next form and back. */
export function CreatureFigure({ c, stage, draw = true, delay = 0, width = 260, burst = true }: { c: Creature; stage: number; draw?: boolean; delay?: number; width?: number; burst?: boolean }) {
  const [reacting, setReacting] = useState(0);
  const [shifted, setShifted] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const react = (e: MouseEvent) => {
    e.stopPropagation();
    setReacting((n) => n + 1);
    window.clearTimeout(timer.current);
    if (c.reaction === 'shift') {
      setShifted(true);
      timer.current = window.setTimeout(() => setShifted(false), 1800);
    } else {
      timer.current = window.setTimeout(() => setReacting(0), 1400);
    }
  };
  const shownStage = shifted ? (stage % 3) + 1 : stage;
  return (
    <button type="button" className={`cr-fig${reacting && c.reaction !== 'shift' ? ` cr-react-${c.reaction}` : ''}`} style={{ width, height: width * 0.84 }} aria-label="Tap to see it react" onClick={react}>
      <CreatureSvg key={`${reacting}-${shownStage}`} c={c} stage={shownStage} draw={draw && !reacting} delay={delay} />
      {burst && draw && !reacting && <Sparks c={c} delay={1.8 + delay} run={0} />}
      {!!reacting && <Sparks c={c} delay={0} run={reacting} />}
    </button>
  );
}

/** A stage as dots with its word beside them, so it never rests on colour or dots alone. */
export function StageDots({ c, stage, of, word }: { c: Creature; stage: number; of: number; word: string }) {
  return (
    <span className="cr-stages" style={{ color: c.main }}>
      <span aria-hidden="true" className="cr-dots">
        {Array.from({ length: of }, (_, i) => (
          <i key={i} className={i < stage ? 'on' : ''} />
        ))}
      </span>
      <span className="cr-stageword">{word}</span>
    </span>
  );
}
