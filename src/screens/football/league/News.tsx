// News (spec §8.10): the back page with memory, the week's roundup, and the world's stories.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { dayOfLogging } from '../../../domain/dates';
import { addDays } from '../../../domain/dates';
import { fmtDayShort } from '../../../domain/format';
import { backPage } from '../../../football/store/league';
import type { FbNews, StoredMatch } from '../../../football/store/tables';
import { go } from '../../../router';

export function BackPageCard({ news, matches, today, more = false }: { news: FbNews[]; matches: StoredMatch[]; today: string; more?: boolean }) {
  const b = backPage(news, matches, today);
  if (!b.headline) return null;
  return (
    <section className="fb-backpage" aria-label="The back page">
      <span className="fb-lb">The back page · {fmtDayShort(b.headline.date)}</span>
      <b className="fb-bphl">{b.headline.text}</b>
      {b.callback && <p className="fb-s">{b.callback}</p>}
      {more && <button type="button" className="fb-btn sm" onClick={() => go('/football/league', { view: 'news' })}>All the news</button>}
    </section>
  );
}

export function NewsView({ news, matches, today }: { news: FbNews[]; matches: StoredMatch[]; today: string }) {
  const week = matches.filter((m) => m.date > addDays(today, -7) && m.date <= today);
  const w = week.filter((m) => m.result === 'W').length, d = week.filter((m) => m.result === 'D').length, l = week.filter((m) => m.result === 'L').length;
  const world = news.filter((n) => n.kind === 'world' || n.kind === 'club').slice(0, 8);
  const backs = news.filter((n) => n.kind === 'back' && n.date <= today).slice(0, 7);
  return (
    <>
      <BackPageCard news={news} matches={matches} today={today} />
      <section className="fb-card" aria-label="This week">
        <span className="fb-lb">This week</span>
        <p className="fb-s">{week.length ? `${w} won, ${d} drawn, ${l} lost.` : 'No matches this week yet.'}</p>
        <ul className="fb-moments">{backs.slice(1).map((n) => <li key={n.id}>{n.text}</li>)}</ul>
      </section>
      {world.length > 0 && (
        <section className="fb-card" aria-label="Around the leagues">
          <span className="fb-lb">Around the leagues</span>
          <ul className="fb-moments">{world.map((n) => <li key={n.id}>{n.text}</li>)}</ul>
        </section>
      )}
    </>
  );
}

export function useNews() {
  return useLiveQuery(async () => ({ news: await db.fbNews.orderBy('date').reverse().toArray(), matches: await db.fbMatches.orderBy('date').toArray(), today: dayOfLogging(Date.now()) }), []);
}
