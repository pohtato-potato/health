import type { ReactNode } from 'react';

export interface BannerAction {
  label: string;
  run: () => void;
  ghost?: boolean;
  disabled?: boolean;
}

/** The one banner on Today: a line between two hairlines, its actions, and a dismiss for the rest of the day. No router imports, so it renders statically. */
export function TodayBanner({ icon, title, sub, actions, onDismiss }: { icon?: ReactNode; title: string; sub?: string; actions: BannerAction[]; onDismiss: () => void }) {
  return (
    <div className="td-banner" role="status" data-section="banner">
      {icon && <span className="td-banner-icon">{icon}</span>}
      <span className="td-banner-text">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </span>
      <span className="td-banner-acts">
        {actions.map((a) => (
          <button key={a.label} type="button" className={`td-banner-act${a.ghost ? ' ghost' : ''}`} onClick={a.run} disabled={a.disabled}>
            {a.label}
          </button>
        ))}
      </span>
      <button type="button" className="td-banner-x" aria-label="Dismiss for today" onClick={onDismiss}>
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
