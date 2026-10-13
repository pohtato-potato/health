import type { ReactNode } from 'react';

/** A checkbox with a drawn tick; the tick strokes itself in when checked. */
export function Check({
  checked,
  onChange,
  label,
  detail,
  color = 'var(--steps)',
  missed,
}: {
  missed?: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  detail?: ReactNode;
  color?: string;
}) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} className={checked ? 'check on' : 'check'} onClick={() => onChange(!checked)}>
      <span className="check-box" style={checked ? { borderColor: color, background: color } : missed ? { borderColor: 'var(--rose)' } : undefined} aria-hidden>
        <svg viewBox="0 0 24 24" width="18" height="18">
          {missed && !checked ? <path d="M7 7l10 10M17 7 7 17" stroke="var(--rose)" strokeWidth="2.4" strokeLinecap="round" fill="none" /> : <path className="check-tick" d="M5 12.5l4.5 4.5L19 7.5" />}
        </svg>
      </span>
      <span className="check-text">
        <span className="check-label">{label}</span>
        {detail && <span className="t12 q">{detail}</span>}
      </span>
    </button>
  );
}
