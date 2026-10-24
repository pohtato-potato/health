import type { CSSProperties, ReactNode } from 'react';
import { Aurora } from '../../ui/live/Aurora';
import type { AuroraTint } from '../../walk/page';

/** Every Walk page sits on the moving aurora, tinted by the region you're in or by the route you're reading. */
export function WalkFrame({ tint, className = '', style, children, as: Tag = 'div' }: { tint: AuroraTint; className?: string; style?: CSSProperties; children: ReactNode; as?: 'div' | 'main' }) {
  return (
    <Tag className={`page lv lv-tab walk3${className ? ` ${className}` : ''}`} style={{ ...(tint as CSSProperties), ...style }}>
      <Aurora />
      {children}
    </Tag>
  );
}
