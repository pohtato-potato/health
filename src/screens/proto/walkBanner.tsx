import { useState } from 'react';
import { Icon } from '../../ui/Icon';
import { RouteArt, byId, inkOf } from './walkArt';
import { contentFor } from './walkContent';
import { MarkShape } from './walkRoutePage';

/**
 * Design prototype: news from the road, as one banner at a time (no notifications). A banner is made from any
 * route's event: the route's own ink, its line drawing with you on it, its signature mark, what happened, and one
 * action. When several things happened, they gather into one banner you can open into a short list.
 */

export interface RoadNews {
  id: string;
  /** What kind of road: shown as words, never only as colour. */
  kind: 'Challenge' | 'Expedition';
  what: string;
  frac: number;
}

export function NewsBanner({ news, onOpen }: { news: RoadNews[]; onOpen: (id: string) => void }) {
  const [gone, setGone] = useState(false);
  const [open, setOpen] = useState(false);
  if (gone || !news.length) return null;
  const first = news[0];
  const many = news.length > 1;
  return (
    <section className={`wp-news rise ${many ? 'many' : ''}`} style={inkOf(first.id)} role="status" aria-label={many ? `${news.length} things happened on the road` : `${first.kind} news: ${first.what}`}>
      <i className="wp-news-sheen" aria-hidden="true" />
      <div className="wp-news-row">
        <span className="wp-news-art" aria-hidden="true">
          <RouteArt id={first.id} frac={first.frac} kind="thumb" names={false} />
          <span className="wp-news-mark">
            <MarkShape mark={contentFor(first.id).signature.mark} />
          </span>
        </span>
        <span className="wp-news-text">
          <small>{many ? `${news.length} things happened on the road` : `${first.kind} · ${byId(first.id).name}`}</small>
          <b>{many ? news.map((n) => byId(n.id).name).join(' and ') : first.what}</b>
        </span>
        <button type="button" className="wp-banner-x" aria-label="Dismiss until tomorrow" onClick={() => setGone(true)}>
          <Icon name="close" size={18} stroke={1.8} />
        </button>
      </div>
      {many && open && (
        <ul className="wp-news-list">
          {news.map((n) => (
            <li key={n.id} style={inkOf(n.id)}>
              <span className="wp-news-dot" aria-hidden="true">
                <MarkShape mark={contentFor(n.id).signature.mark} />
              </span>
              <span className="grow">
                <small>
                  {n.kind} · {byId(n.id).name}
                </small>
                {n.what}
              </span>
              <button type="button" className="wp-ghost" onClick={() => onOpen(n.id)}>
                Read
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="wp-actions">
        {many ? (
          <button type="button" className="wp-primary small" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Hide' : news.length === 2 ? 'See both' : 'See all'}
          </button>
        ) : (
          <button type="button" className="wp-primary small" onClick={() => onOpen(first.id)}>
            Read what happened
          </button>
        )}
      </div>
    </section>
  );
}
