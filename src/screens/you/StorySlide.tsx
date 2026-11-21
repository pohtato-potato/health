import type { CSSProperties, ReactNode } from 'react';
import { fmtInt } from '../../domain/format';
import type { DayCell, StorySlide } from '../../domain/monthStory';
import { CountUp } from '../../ui/you/CountUp';
import { Icon } from '../../ui/Icon';
import { Grades } from '../reports/Grades';
import { dayTier } from '../close/DayCard';

const LOOK: Record<StorySlide['kind'], { g: string; title: (month: string) => string }> = {
  days: { g: 'linear-gradient(170deg,#ffc94d,#ff9a5c)', title: () => 'Your month' },
  perfect: { g: 'linear-gradient(170deg,#5fe3a1,#4fd2ff)', title: () => 'Perfect days' },
  road: { g: 'linear-gradient(170deg,#ff9a5c,#ff6fa8)', title: () => 'On the road' },
  gym: { g: 'linear-gradient(170deg,#b9a0ff,#ff6fa8)', title: () => 'In the gym' },
  versus: { g: 'linear-gradient(170deg,#8fd8ff,#b9a0ff)', title: () => 'Against last month' },
  shape: { g: 'linear-gradient(170deg,#ffd36b,#5fe3a1)', title: () => 'Waist and shape' },
  club: { g: 'linear-gradient(170deg,#ff9a4d,#ffc94d)', title: () => 'The club' },
  best: { g: 'linear-gradient(170deg,#fff0a6,#ff9a5c)', title: () => 'Your best day' },
  next: { g: 'linear-gradient(170deg,#c2b2ff,#8fd8ff)', title: () => 'One thing for next month' },
};

function Big({ text }: { text: string }) {
  const m = /^(\D*)([\d,]+)(.*)$/.exec(text);
  if (!m) return <>{text}</>;
  const to = Number(m[2].replace(/,/g, ''));
  return <CountUp to={to} fmt={(n) => `${m[1]}${fmtInt(n)}${m[3]}`} />;
}

/** The month's days as a calendar whose squares light up one after another in their tier's colour, and the same in words. */
function Calendar({ cal }: { cal: DayCell[] }) {
  const count = { all: 0, some: 0, none: 0, blank: 0 };
  for (const c of cal) {
    if (c === 'later') continue;
    if (!c) count.blank++;
    else if (c.closed >= c.of) count.all++;
    else if (c.closed) count.some++;
    else count.none++;
  }
  const words = [['Every ring', count.all], ['Some rings', count.some], ['No rings', count.none], ['Not logged', count.blank]].filter(([, n]) => n);
  return (
    <>
      <div className="yu-st-cal" aria-hidden="true">
        {cal.map((c, n) => {
          const cls = c === 'later' ? ' later' : !c ? ' blank' : '';
          const ink = c && c !== 'later' ? dayTier(c.closed, c.of).ink : undefined;
          return <i key={n} className={`yu-st-d${cls}`} style={{ '--c': ink, '--i': n } as CSSProperties} />;
        })}
      </div>
      <div className="yu-st-chips">{words.map(([w, n]) => <span key={w}>{w}: {n}</span>)}</div>
    </>
  );
}

function Extra({ slide, month, onReport }: { slide: StorySlide; month: string; onReport?: () => void }): ReactNode {
  switch (slide.kind) {
    case 'days': return <Calendar cal={slide.cal} />;
    case 'perfect': case 'road': case 'club':
      return slide.chips.length ? <div className="yu-st-chips">{slide.chips.map((c) => <span key={c}>{c}</span>)}</div> : null;
    case 'gym':
      return slide.bests.length ? <div className="yu-st-rows">{slide.bests.map((b) => <div key={b.name}><span>{b.name}</span><b>{b.kg === null ? 'New best' : `${fmtInt(b.kg)} kg`}</b></div>)}</div> : null;
    case 'versus':
      return <div className="yu-st-rows">{slide.rows.map((r) => <div key={r.area}><span>{r.area}</span><b>{r.now} <em>{r.up ? 'up' : 'down'} from {r.was}</em></b></div>)}</div>;
    case 'next':
      return (
        <>
          <Grades grades={slide.grades} />
          {onReport && <button type="button" className="yu-st-go" onClick={onReport} data-month={month}>Read the full report</button>}
        </>
      );
    default: return null;
  }
}

/**
 * One slide of the month's story (board W8, y8-story): progress bars on top, its title, one huge number and one line, its picture,
 * then Back and Next. It fills the screen; the number counts up once and the calendar's days light up once.
 */
export function StorySlideView({ slide, at, of, month, onNext, onBack, onClose, onReport }: {
  slide: StorySlide; at: number; of: number; month: string; onNext: () => void; onBack: () => void; onClose: () => void; onReport?: () => void;
}) {
  const look = LOOK[slide.kind];
  const last = at === of - 1;
  return (
    <div className="yu-st" style={{ '--g': look.g } as CSSProperties}>
      <div className="yu-st-bars" aria-hidden="true">{Array.from({ length: of }, (_, n) => <i key={n} className={n <= at ? 'on' : undefined} />)}</div>
      <div className="yu-st-top">
        <h1>{look.title(month)}</h1>
        <span>{at + 1} of {of}</span>
        <button type="button" className="yu-st-x" onClick={onClose} aria-label="Close the story"><Icon name="close" size={22} stroke={2.4} /></button>
      </div>
      <div className="yu-st-b" key={at} aria-live="polite">
        <p className="yu-st-n"><b className={slide.kind === 'next' ? 'w' : undefined}><Big text={slide.big} /></b><span className="yu-st-say">{slide.say}</span></p>
        <Extra slide={slide} month={month} onReport={onReport} />
      </div>
      <div className="yu-st-nav">
        {at > 0 ? <button type="button" onClick={onBack}><Icon name="left" size={20} stroke={2.4} />Back</button> : <span />}
        {last ? <button type="button" className="on" onClick={onClose}>Done</button> : <button type="button" className="on" onClick={onNext}>Next<Icon name="right" size={20} stroke={2.4} /></button>}
      </div>
    </div>
  );
}
