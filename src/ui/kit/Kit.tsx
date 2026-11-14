// The kit's shared parts (look pass, 14 Nov). Styles in src/styles/kit.css; the rules in DESIGN.md.
// A page is: one lead (a picture, or a Hero number where the number is the answer), then panels and doors, then one Action.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import { Sheet } from '../Sheet';

const inkStyle = (ink?: string, style?: CSSProperties) => ({ ...(ink ? { ['--ink' as string]: ink } : {}), ...style }) as CSSProperties;

/** The big number that leads a page, when the number is the answer. Fraunces at 600, in its own ink. */
export function Hero({ value, ink, size, label, under }: { value: ReactNode; ink?: string; size?: 'md' | 'sm'; label?: ReactNode; under?: ReactNode }) {
  return (
    <div className="k-hero-row">
      <span className={`k-hero${size ? ` ${size}` : ''}`} style={inkStyle(ink)}>{value}</span>
      {(label || under) && <span className="k-col" style={{ paddingBottom: 4 }}>{label && <b>{label}</b>}{under && <span className="k-q">{under}</span>}</span>}
    </div>
  );
}

/** A title with its small line under it (never above). */
export function Title({ children, under, lg, as: As = 'h1' }: { children: ReactNode; under?: ReactNode; lg?: boolean; as?: 'h1' | 'h2' }) {
  return <div className="k-col"><As className={`k-title${lg ? ' lg' : ''}`}>{children}</As>{under && <span className="k-under">{under}</span>}</div>;
}

/** A section label with its hairline. */
export const Sect = ({ children }: { children: ReactNode }) => <h2 className="k-sect">{children}</h2>;

/**
 * A filled panel in the thing's own colour. Give it onClick and it becomes tappable: a hairline edge and a small
 * drawn arrow. Without onClick it only informs and has neither.
 */
export function Panel({ ink, onClick, label, flat, children, style, className }: { ink?: string; onClick?: () => void; label?: string; flat?: boolean; children: ReactNode; style?: CSSProperties; className?: string }) {
  const cls = `k-panel${flat ? ' flat' : ''}${onClick ? ' k-tap' : ''}${className ? ` ${className}` : ''}`;
  if (!onClick) return <div className={cls} style={inkStyle(ink, style)}>{children}</div>;
  return (
    <button type="button" className={cls} style={inkStyle(ink, style)} onClick={onClick} aria-label={label}>
      {children}
      <Icon name="right" size={18} stroke={2.2} className="k-arrow" />
    </button>
  );
}

/** A door into another page: its mark, one live value, its name. It takes the light of the page it sits on. */
export function Door({ icon, name, value, ink, onClick }: { icon: IconName; name: string; value: ReactNode; ink?: string; onClick: () => void }) {
  return (
    <button type="button" className="k-door" style={inkStyle(ink)} onClick={onClick} aria-label={typeof value === 'string' || typeof value === 'number' ? `${name}: ${value}` : name}>
      <Icon name={icon} size={22} color={ink ?? 'currentColor'} stroke={1.6} />
      <b className="v">{value}</b>
      <span className="nm">{name}</span>
      <Icon name="right" size={14} stroke={2.4} className="k-arrow" />
    </button>
  );
}

export const Doors = ({ two, children, label }: { two?: boolean; children: ReactNode; label?: string }) => <nav className={`k-doors${two ? ' two' : ''}`} aria-label={label}>{children}</nav>;

/** The one glowing thing to do next. One a page. */
export function Action({ children, onClick, wide, sm, quiet, disabled }: { children: ReactNode; onClick: () => void; wide?: boolean; sm?: boolean; quiet?: boolean; disabled?: boolean }) {
  return <button type="button" className={`k-act${wide ? ' wide' : ''}${sm ? ' sm' : ''}${quiet ? ' quiet' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export const Chip = ({ ink, children }: { ink?: string; children: ReactNode }) => <span className="k-chip" style={inkStyle(ink)}>{children}</span>;

/** One way back, drawn, never a typed arrow. */
export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" className="k-back" onClick={onClick}><Icon name="left" size={20} stroke={2.2} /><span>{label}</span></button>;
}

/** The header inside a page: one way back, the page's name, and the "?" when the page has rules. */
export function PageHead({ back, onBack, title, help }: { back: string; onBack: () => void; title: ReactNode; help?: HowThisWorks }) {
  return (
    <header className="k-head">
      <BackLink label={back} onClick={onBack} />
      <h1 className="k-title">{title}</h1>
      {help ? <HelpButton how={help} /> : <span aria-hidden="true" />}
    </header>
  );
}

/** What a "?" opens: four short steps with a mark each, and the key numbers as chips. */
export interface HowThisWorks {
  title: string;
  steps: { icon: IconName; ink: string; head: string; line: string }[];
  chips?: { ink?: string; text: string }[];
}

export function HowSheet({ how, onClose }: { how: HowThisWorks; onClose: () => void }) {
  return (
    <Sheet title={how.title} onClose={onClose}>
      <div className="k-how">
        {how.steps.map((s) => (
          <div key={s.head} className="k-how-step" style={inkStyle(s.ink)}>
            <span><Icon name={s.icon} size={26} color={s.ink} /></span>
            <span><b>{s.head}</b><span className="k-q">{s.line}</span></span>
          </div>
        ))}
        {how.chips && <div className="k-chips">{how.chips.map((c) => <Chip key={c.text} ink={c.ink}>{c.text}</Chip>)}</div>}
      </div>
    </Sheet>
  );
}

/** The "?" button: rules live behind it, never as paragraphs on the page. */
export function HelpButton({ how }: { how: HowThisWorks }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="k-help" aria-label={`How this works: ${how.title}`} onClick={() => setOpen(true)}>
        <i><Icon name="help" size={22} stroke={1.8} /></i>
      </button>
      {open && <HowSheet how={how} onClose={() => setOpen(false)} />}
    </>
  );
}

/** A page with nothing on it yet: one picture, one line, one thing to do. */
export function Empty({ icon, ink, title, line, children }: { icon: IconName; ink: string; title: string; line: ReactNode; children?: ReactNode }) {
  return (
    <div className="k-empty" style={inkStyle(ink)}>
      <span className="k-pic"><Icon name={icon} size={84} color={ink} stroke={1.4} /></span>
      <h2 className="k-title">{title}</h2>
      <span>{line}</span>
      {children}
    </div>
  );
}
