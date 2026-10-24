import { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { routeById } from '../../walk/catalogue';
import type { NewsBannerData } from '../../walk/news';
import { signatureOf } from '../../walk/signature';
import { MarkShape } from '../../walk/ui/MarkShape';
import { RouteArt, inkStyle } from '../../walk/ui/RouteArt';

/** The seen ids that mark a banner's items read, so they don't come back. */
export const readKeys = (b: NewsBannerData) => b.items.map((i) => `walk-read:${i.key}`);

/**
 * News from the road as one banner (never a notification): the first route's ink, its thumbnail with you on it and
 * its mark, what happened, and one action. Several things gather into one banner that opens into a short list.
 */
export function NewsBannerView({ banner, kmById, onOpen, onDismiss }: { banner: NewsBannerData; kmById: Map<string, number>; onOpen: (path: string) => void; onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  const first = banner.items[0];
  const def = first.routeId ? routeById(first.routeId) : undefined;
  const many = banner.items.length > 1;
  return (
    <section className={`walk-news${many ? ' many' : ''}`} style={first.routeId ? inkStyle(first.routeId) : undefined} role="status" aria-label={`${banner.title}: ${banner.text}`}>
      <div className="walk-news-row">
        <span className="walk-news-art" aria-hidden="true">
          {def ? <RouteArt id={def.id} km={kmById.get(def.id) ?? 0} kind="thumb" names={false} /> : <Icon name="steps" size={26} stroke={1.6} />}
          {def && (
            <span className="walk-news-mark">
              <MarkShape mark={signatureOf(def).mark} />
            </span>
          )}
        </span>
        <span className="walk-news-text">
          <small>{banner.title}</small>
          <b>{banner.text}</b>
        </span>
        <button type="button" className="walk-news-x" aria-label="Dismiss until something new happens" onClick={onDismiss}>
          <Icon name="close" size={18} stroke={1.8} />
        </button>
      </div>
      {many && open && (
        <ul className="walk-news-list">
          {banner.items.map((n) => (
            <li key={n.key} style={n.routeId ? inkStyle(n.routeId) : undefined}>
              <span className="grow">
                <small>{n.routeId ? (routeById(n.routeId)?.name ?? '') : 'The walk across India'}</small>
                {n.what}
              </span>
              <button type="button" className="walk-ghost" onClick={() => onOpen(n.open)}>
                Read
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="walk-primary small" aria-expanded={many ? open : undefined} onClick={() => (many ? setOpen(!open) : onOpen(first.open))}>
        {many && open ? 'Hide' : banner.action}
      </button>
    </section>
  );
}
