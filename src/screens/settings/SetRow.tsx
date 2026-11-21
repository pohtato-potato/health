import type { CSSProperties } from 'react';
import { Icon, type IconName } from '../../ui/Icon';

/** The inside of a Settings row (board W9): its icon in a square of its colour, its name, its value in that colour, and an arrow. */
export function SetRowHead({ icon, ink, title, sub, end }: { icon: IconName; ink: string; title: string; sub?: string; end: 'right' | 'up' }) {
  return (
    <>
      <i className="k-set-ic" style={{ '--c': ink } as CSSProperties} aria-hidden="true"><Icon name={icon} size={22} color="#140f22" stroke={2} /></i>
      <span className="k-col" style={{ flex: 1, minWidth: 0 }}>
        <b>{title}</b>
        {sub && <span className="k-q k-set-v" style={{ color: ink }}>{sub}</span>}
      </span>
      <Icon name={end} size={18} stroke={2.2} />
    </>
  );
}
