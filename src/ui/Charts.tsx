/** Small, quiet charts in the MacroFactor spirit: thin lines, soft grid, no chrome. */

export function Spark({ values, color, width = 64, height = 26 }: { values: (number | null)[]; color: string; width?: number; height?: number }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const span = max - min || 1;
  const x = (i: number) => (i / Math.max(values.length - 1, 1)) * (width - 4) + 2;
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last.i)} cy={y(last.v)} r="2.4" fill={color} />
    </svg>
  );
}

export function MiniBars({ values, color, target, width = 64, height = 26 }: { values: (number | null)[]; color: string; target?: number; width?: number; height?: number }) {
  const max = Math.max(target ?? 0, ...values.map((v) => v ?? 0)) || 1;
  const w = width / values.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {values.map((v, i) => {
        const h = v ? Math.max((v / max) * (height - 2), 2) : 2;
        return <rect key={i} x={i * w + 1} y={height - h} width={Math.max(w - 2, 1.5)} height={h} rx="1" fill={v === null ? 'var(--track)' : color} opacity={v !== null && target && v < target ? 0.45 : 1} />;
      })}
    </svg>
  );
}

export interface Point {
  label: string;
  value: number | null;
  trend?: number | null;
}

/** Bars for daily counts, with the target as a dashed line. */
export function BarChart({ points, color, target, height = 160, fmt }: { points: Point[]; color: string; target?: number; height?: number; fmt: (n: number) => string }) {
  const W = 340;
  const H = height;
  const top = 12;
  const bottom = 22;
  const vals = points.map((p) => p.value ?? 0);
  const max = Math.max(target ?? 0, ...vals) * 1.08 || 1;
  const bw = W / points.length;
  const y = (v: number) => H - bottom - (v / max) * (H - top - bottom);
  const every = Math.ceil(points.length / 6);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chart" style={{ display: 'block' }}>
      {target !== undefined && (
        <>
          <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke={color} strokeOpacity="0.5" strokeDasharray="3 4" />
          <text x={W} y={y(target) - 4} textAnchor="end" fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
            {fmt(target)}
          </text>
        </>
      )}
      {points.map((p, i) => {
        const v = p.value;
        const h = v ? Math.max(H - bottom - y(v), 2) : 0;
        return (
          <g key={i}>
            {v !== null && v > 0 && <rect x={i * bw + bw * 0.18} y={H - bottom - h} width={bw * 0.64} height={h} rx={Math.min(3, bw * 0.3)} fill={color} opacity={target !== undefined && v < target ? 0.5 : 1} />}
            {i % every === 0 && (
              <text x={i === 0 ? i * bw : i * bw + bw / 2} y={H - 6} textAnchor={i === 0 ? 'start' : 'middle'} fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Dots for each reading and a smooth line for the trend. */
export function TrendChart({ points, color, height = 170, fmt }: { points: Point[]; color: string; height?: number; fmt: (n: number) => string }) {
  const W = 340;
  const H = height;
  const top = 14;
  const bottom = 22;
  const left = 4;
  const right = 34;
  const all = points.flatMap((p) => [p.value, p.trend]).filter((v): v is number => v !== null && v !== undefined);
  if (all.length < 1) return <div className="t14 q" style={{ padding: '24px 0' }}>Not enough readings yet.</div>;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (max - min < 1) {
    min -= 0.5;
    max += 0.5;
  }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;
  const x = (i: number) => left + (i / Math.max(points.length - 1, 1)) * (W - left - right);
  const y = (v: number) => top + (1 - (v - min) / (max - min)) * (H - top - bottom);
  const trend = points.map((p, i) => ({ i, v: p.trend })).filter((p): p is { i: number; v: number } => p.v !== null && p.v !== undefined);
  const d = trend.map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const ticks = [max - pad, (max + min) / 2, min + pad];
  const every = Math.ceil(points.length / 6);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend chart" style={{ display: 'block' }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="var(--divider)" />
          <text x={W} y={y(t) + 3.5} textAnchor="end" fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
            {fmt(t)}
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        p.value !== null ? <circle key={i} cx={x(i)} cy={y(p.value)} r="2.6" fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="1.2" /> : null,
      )}
      {trend.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) =>
        i % every === 0 ? (
          <text key={`l${i}`} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fill="var(--dim)" fontSize="10" fontFamily="var(--sans)">
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
