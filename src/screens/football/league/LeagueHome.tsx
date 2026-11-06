// The League section: the table first, then the pyramid, the calendar and the cups, one tap apart.
import { useLiveQuery } from 'dexie-react-hooks';
import { tierName } from '../../../football/data/load';
import { loadLeague, type League } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { Tier } from '../../../football/types';
import { go, useRoute } from '../../../router';
import { TIER_CUP } from '../../../football/cups';
import { Calendar } from './Calendar';
import { Cup } from './Cups';
import { Events, eventRows } from './Events';
import { BackPageCard, NewsView, useNews } from './News';
import { Pyramid } from './Pyramid';
import { Table } from './Table';

export const LEAGUE_VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'cups', label: 'Cups' },
] as const;
export type LeagueView = (typeof LEAGUE_VIEWS)[number]['id'] | 'news';

export function LeagueView({ l, view, tier, extra, n }: { l: League; view: LeagueView; tier?: Tier; extra?: Partial<Record<LeagueView, React.ReactNode>>; n?: { news: import('../../../football/store/tables').FbNews[]; matches: import('../../../football/store/tables').StoredMatch[]; today: string } }) {
  const mine = l.season.tierOf[OWN];
  const t = tier ?? mine;
  const set = (p: Record<string, string | undefined>) => go('/football/league', p, { replace: true });
  return (
    <>
      <nav className="fb-subseg" aria-label="League">
        {LEAGUE_VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={view === v.id} className={view === v.id ? 'on' : undefined} onClick={() => set({ view: v.id === 'table' ? undefined : v.id })}>{v.label}</button>
        ))}
      </nav>
      {view === 'news' && n && <NewsView news={n.news} matches={n.matches} today={n.today} />}
      {view === 'table' && (
        <>
          {n && <BackPageCard news={n.news} matches={n.matches} today={n.today} more />}
          <div className="fb-tierpick">
            <button type="button" className="fb-btn sm" disabled={t === 1} aria-label={t > 1 ? `Up to ${tierName((t - 1) as Tier)}` : 'Top tier'} onClick={() => set({ tier: String(t - 1) })}>↑</button>
            <span className="fb-s">{t === mine ? 'Your division' : `${Math.abs(t - mine)} ${Math.abs(t - mine) === 1 ? 'tier' : 'tiers'} ${t < mine ? 'above' : 'below'} you`}</span>
            <button type="button" className="fb-btn sm" disabled={t === 6} aria-label={t < 6 ? `Down to ${tierName((t + 1) as Tier)}` : 'Bottom tier'} onClick={() => set({ tier: String(t + 1) })}>↓</button>
          </div>
          <Table tier={t} rows={l.tables[t]} day={l.save.phase === 'season' ? `Day ${l.save.day} of 42` : 'Between seasons'} />
        </>
      )}
      {view === 'pyramid' && <Pyramid tierOf={l.season.tierOf} rating={l.rating} onTier={(x) => set({ tier: String(x) })} />}
      {view === 'calendar' && (
        <Calendar
          season={l.save.season}
          today={l.save.phase === 'season' ? l.save.day : 0}
          matches={l.matches}
          events={eventRows(l.matches).map((r, i) => ({ day: i + 1, label: `${r.label}: ${r.text}`, result: r.result }))}
        />
      )}
      {view === 'cups' && (
        <>
          <Events event={l.save.phase === 'event' ? l.save.event : undefined} matches={l.matches} />
          <Cup b={l.season.bigcup} tierOf={l.season.tierOf} />
          {l.season.tiercups[TIER_CUP[mine].id] && <Cup b={l.season.tiercups[TIER_CUP[mine].id]} tierOf={l.season.tierOf} />}
        </>
      )}
      {extra?.[view] ?? null}
    </>
  );
}

export function LeagueHome() {
  const { params } = useRoute();
  const l = useLiveQuery(loadLeague, []);
  const n = useNews();
  if (l === undefined) return null;
  if (l === null) return <p className="fb-s">The league starts once you found the club.</p>;
  const view = (params.get('view') === 'news' ? 'news' : LEAGUE_VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'table') as LeagueView;
  const tq = Number(params.get('tier'));
  return <LeagueView l={l} view={view} n={n} tier={tq >= 1 && tq <= 6 ? (tq as Tier) : undefined} />;
}
