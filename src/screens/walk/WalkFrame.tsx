import type { CSSProperties, ReactNode } from 'react';
import type { AuroraTint } from '../../walk/page';

/**
 * Every Walk page sits on the kit's Walk light (look pass): a cool glow from one corner and, from the other, the
 * light of the region you're in or the route you're reading. Panels, doors and the one action come from the kit.
 */
export function WalkFrame({ tint, className = '', style, children, as: Tag = 'div' }: { tint: AuroraTint; className?: string; style?: CSSProperties; children: ReactNode; as?: 'div' | 'main' }) {
  const glow = tint['--lv-a'];
  // The tint goes in as a custom property, so a worn theme's own light (kit.css, :root[data-themed]) still wins.
  const light = { '--walk-glow': glow } as CSSProperties;
  return (
    <Tag className={`page walk3 k-light walk k-page${className ? ` ${className}` : ''}`} style={{ ...light, ...style }}>
      {children}
    </Tag>
  );
}
