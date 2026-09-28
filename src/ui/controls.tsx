import { useEffect, useRef, useState, type ReactNode } from 'react';
import { fmtInt } from '../domain/format';
import { Icon } from './Icon';

/** − value + with a typed value in between. Hold a button to repeat. */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 100000,
  decimals = 0,
  unit,
  size = 42,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  decimals?: number;
  unit?: string;
  size?: number;
  label: string;
}) {
  const [text, setText] = useState(value.toFixed(decimals));
  const [editing, setEditing] = useState(false);
  const hold = useRef<number | undefined>(undefined);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!editing) setText(value.toFixed(decimals));
  }, [value, decimals, editing]);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10 ** decimals) / 10 ** decimals));
  const bump = (dir: 1 | -1) => onChange(clamp(latest.current + dir * step));
  const start = (dir: 1 | -1) => {
    bump(dir);
    let n = 0;
    const tick = () => {
      bump(dir);
      n++;
      hold.current = window.setTimeout(tick, n > 8 ? 45 : 110);
    };
    hold.current = window.setTimeout(tick, 420);
  };
  const stop = () => window.clearTimeout(hold.current);

  const btn = (dir: 1 | -1) => (
    <button
      type="button"
      className="round"
      aria-label={`${dir > 0 ? 'Up' : 'Down'} ${step}${unit ? ` ${unit}` : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        start(dir);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {dir > 0 ? '+' : '−'}
    </button>
  );

  return (
    <div className="row">
      {btn(-1)}
      <label className="num" style={{ fontSize: size, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
        <span className="sr">{label}</span>
        <input
          inputMode="decimal"
          value={text}
          onFocus={(e) => {
            setEditing(true);
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setText(e.target.value);
            const v = parseFloat(e.target.value.replace(',', '.'));
            if (Number.isFinite(v)) onChange(clamp(v));
          }}
          onBlur={() => setEditing(false)}
          style={{
            width: `${Math.max(text.length, 2) * 0.62 + 0.2}em`,
            background: 'transparent',
            border: 0,
            textAlign: 'center',
            fontFamily: 'var(--serif)',
            fontWeight: 300,
            fontSize: size,
            padding: 0,
            outline: 'none',
          }}
        />
        {unit && <span style={{ fontSize: Math.round(size * 0.42), color: 'var(--quiet)' }}>{unit}</span>}
      </label>
      {btn(1)}
    </div>
  );
}

/** A numeric field shown with Indian digit grouping: 12,500 and 1,09,300. */
export function IntField({
  value,
  onChange,
  placeholder,
  label,
  autoFocus,
  className = 'field',
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <input
      className={className}
      inputMode="numeric"
      aria-label={label}
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={value === undefined ? '' : fmtInt(value)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, '');
        onChange(digits ? parseInt(digits, 10) : undefined);
      }}
    />
  );
}

/** A decimal field that keeps what you type until it's a valid number. */
export function DecField({
  value,
  onChange,
  placeholder,
  label,
  className = 'field',
  autoFocus,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(value === undefined ? '' : String(value));
  }, [value, focused]);
  return (
    <input
      className={className}
      inputMode="decimal"
      aria-label={label}
      placeholder={placeholder}
      autoFocus={autoFocus}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
        setText(t);
        const v = parseFloat(t);
        onChange(t === '' || !Number.isFinite(v) ? undefined : v);
      }}
    />
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <input type="checkbox" role="switch" className="sw" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />;
}

export function SwitchRow({
  title,
  sub,
  checked,
  onChange,
}: {
  title: ReactNode;
  sub?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="li" style={{ minHeight: sub ? 64 : 56 }}>
      <span className="s">
        <span>{title}</span>
        {sub && <small>{sub}</small>}
      </span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

export function LinkRow({ title, sub, value, onClick }: { title: ReactNode; sub?: ReactNode; value?: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" className="li" onClick={onClick} disabled={!onClick} style={{ opacity: 1 }}>
      <span className="s">
        <span>{title}</span>
        {sub && <small>{sub}</small>}
      </span>
      <span className="v row" style={{ gap: 4 }}>
        {value}
        {onClick && <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />}
      </span>
    </button>
  );
}

export function Seg<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={o.id === value} className={o.id === value ? 'on' : undefined} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Minutes after midnight in a native time picker, styled as the mock's tile. */
export function TimeTile({ label, minutes, onChange }: { label: string; minutes: number | undefined; onChange: (m: number) => void }) {
  const hh = minutes === undefined ? '' : String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = minutes === undefined ? '' : String(minutes % 60).padStart(2, '0');
  const shown = minutes === undefined ? 'Set' : fmt12(minutes);
  return (
    <label className="timebtn">
      <span className="t12 q">{label}</span>
      <span className="t17 tn">{shown}</span>
      <input
        type="time"
        value={minutes === undefined ? '' : `${hh}:${mm}`}
        aria-label={label}
        onChange={(e) => {
          const [h, m] = e.target.value.split(':').map(Number);
          if (Number.isFinite(h) && Number.isFinite(m)) onChange(h * 60 + m);
        }}
      />
    </label>
  );
}

function fmt12(minutes: number): string {
  let h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, '0');
  const ap = h < 12 ? 'am' : 'pm';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}
