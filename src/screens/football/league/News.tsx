// News (spec §8.10): the back page with memory, the week's roundup, and the world's stories.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { dayOfLogging } from '../../../domain/dates';
import { fmtDayShort } from '../../../domain/format';
import { backPage } from '../../../football/store/league';
import type { FbNews, StoredMatch } from '../../../football/store/tables';
import { go } from '../../../router';
import { PressWords } from '../../../ui/motion/PressWords';
import { useSeenBefore } from '../../../ui/motion/motion';

export function BackPageCard({ news, matches, today, more = false }: { news: FbNews[]; matches: StoredMatch[]; today: string; more?: boolean }) {
  const b = backPage(news, matches, today);
  // A new headline is set like a press the first time it is seen (O44).
  const before = useSeenBefore<string | null>('backpage', b.headline?.text ?? null);
  if (!b.headline) return null;
  return (
    <section className="fb-backpage" aria-label="The back page">
      <span className="fb-lb">The back page · {fmtDayShort(b.headline.date)}</span>
      <b className="fb-bphl"><PressWords text={b.headline.text} play={before !== b.headline.text} /></b>
      {b.callback && <p className="fb-s">{b.callback}</p>}
      {more && <button type="button" className="fb-btn sm" onClick={() => go('/football/league', { view: 'news' })}>All the news</button>}
    </section>
  );
}

type Kind = FbNews['kind'];
const KINDS: { k: Kind; label: string; c: string }[] = [
  { k: 'back', label: 'Back pages', c: '#f4ecd8' }, { k: 'press', label: 'Press', c: '#ff9a76' }, { k: 'studio', label: 'The studio', c: '#c2b2ff' },
  { k: 'club', label: 'Club', c: '#8fdcb6' }, { k: 'world', label: 'The world', c: '#93c3dc' }, { k: 'roundup', label: 'Round-ups', c: '#ffd36b' },
];
const MIC = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;

/** One story in its own form: the back page as newsprint, a press question at the microphone, the studio as a
 *  back-and-forth, club and world news as a line with a dot in its colour. */
function Story({ n, d }: { n: FbNews; d: number }) {
  const st = { '--d': `${d}s` } as React.CSSProperties;
  if (n.kind === 'back') return <div className="bp" style={st}><small>The back page</small><b>{n.text}</b></div>;
  if (n.kind === 'press') return <div className="pr" style={st}><span className="mic">{MIC}</span><span><b>“{n.text}”</b><small>{n.answered ? 'Answered' : 'Press question'}</small></span></div>;
  if (n.kind === 'studio') return <div className="sd" style={st}><small>The studio</small>{n.text.split('\n').map((ln, k) => <p key={k} className="sd-l" style={{ '--d': `${d + 0.1 + k * 0.25}s` } as React.CSSProperties}>{ln}</p>)}</div>;
  return <div className={`nl21 ${n.kind}`} style={st}><span>{n.text}</span></div>;
}

/** The news (board 21, n21-news): a filter for each kind with its count, then the feed by day, newest first. */
export function NewsFeed({ news, today, start = 'all' }: { news: FbNews[]; today: string; start?: Kind | 'all' }) {
  const [f, setF] = useState<Kind | 'all'>(start);
  const live = news.filter((n) => n.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const kinds = KINDS.filter((x) => live.some((n) => n.kind === x.k));
  const shown = live.filter((n) => f === 'all' || n.kind === f);
  const days = [...new Set(shown.map((n) => n.date))];
  let k = 0;
  return (
    <>
      <div className="nf21" role="group" aria-label="Show">
        <button type="button" aria-pressed={f === 'all'} onClick={() => setF('all')} style={{ '--c': '#fff' } as React.CSSProperties}>All<b className="fb-num">{live.length}</b></button>
        {kinds.map((x) => <button key={x.k} type="button" aria-pressed={f === x.k} onClick={() => setF(x.k)} style={{ '--c': x.c } as React.CSSProperties}>{x.label}<b className="fb-num">{live.filter((n) => n.kind === x.k).length}</b></button>)}
      </div>
      {days.length === 0 && <p className="fb-s">No news yet.</p>}
      {days.map((day) => (
        <section key={day} className="ns21" aria-label={fmtDayShort(day)}>
          <h3 className="nd21">{fmtDayShort(day)}</h3>
          {shown.filter((n) => n.date === day).map((n) => <Story key={n.id} n={n} d={0.1 + Math.min(k++, 8) * 0.08} />)}
        </section>
      ))}
    </>
  );
}

export function NewsView({ news, today }: { news: FbNews[]; matches: StoredMatch[]; today: string }) {
  return <NewsFeed news={news} today={today} />;
}

export function useNews() {
  return useLiveQuery(async () => ({ news: await db.fbNews.orderBy('date').reverse().toArray(), matches: await db.fbMatches.orderBy('date').toArray(), today: dayOfLogging(Date.now()) }), []);
}
