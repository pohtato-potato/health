// The back page is set like a press (motion board two, O44): each word of the headline slams in, one after another,
// and lands where it stays (transforms only, so nothing reflows).
import { Fragment, type CSSProperties } from 'react';

export function PressWords({ text, play = true, gap = 160 }: { text: string; play?: boolean; gap?: number }) {
  if (!play) return <>{text}</>;
  const words = text.split(' ');
  return (
    <span aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="mo-press" aria-hidden="true" style={{ '--d': `${200 + i * gap}ms` } as CSSProperties}>{w}</span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </span>
  );
}
