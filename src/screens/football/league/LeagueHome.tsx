// The League section: the table first, then the pyramid, the calendar and the cups, one tap apart.
import { useLiveQuery } from 'dexie-react-hooks';
import { tierName } from '../../../football/data/load';
import { loadLeague, type League } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { Tier } from '../../../football/types';
import { go, useRoute } from '../../../router';
import { Pyramid } from './Pyramid';
import { Table } from './Table';

export const LEAGUE_VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'cups', label: 'Cups' },
] as const;
export type LeagueView = (typeof LEAGUE_VIEWS)[number]['id'];

export function LeagueView({ l, view, tier, extra }: { l: League; view: LeagueView; tier?: Tier; extra?: Partial<Record<LeagueView, React.ReactNode>> }) {
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
      {view === 'table' && (
        <>
          <div className="fb-tierpick">
            <button type="button" className="fb-btn sm" disabled={t === 1} aria-label={t > 1 ? `Up to ${tierName((t - 1) as Tier)}` : 'Top tier'} onClick={() => set({ tier: String(t - 1) })}>↑</button>
            <span className="fb-s">{t === mine ? 'Your division' : `${Math.abs(t - mine)} ${Math.abs(t - mine) === 1 ? 'tier' : 'tiers'} ${t < mine ? 'above' : 'below'} you`}</span>
            <button type="button" className="fb-btn sm" disabled={t === 6} aria-label={t < 6 ? `Down to ${tierName((t + 1) as Tier)}` : 'Bottom tier'} onClick={() => set({ tier: String(t + 1) })}>↓</button>
          </div>
          <Table tier={t} rows={l.tables[t]} day={l.save.phase === 'season' ? `Day ${l.save.day} of 42` : 'Between seasons'} />
        </>
      )}
      {view === 'pyramid' && <Pyramid tierOf={l.season.tierOf} rating={l.rating} onTier={(x) => set({ tier: String(x) })} />}
      {view !== 'table' && view !== 'pyramid' && (extra?.[view] ?? null)}
    </>
  );
}

export function LeagueHome() {
  const { params } = useRoute();
  const l = useLiveQuery(loadLeague, []);
  if (l === undefined) return null;
  if (l === null) return <p className="fb-s">The league starts once you found the club.</p>;
  const view = (LEAGUE_VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'table') as LeagueView;
  const tq = Number(params.get('tier'));
  return <LeagueView l={l} view={view} tier={tq >= 1 && tq <= 6 ? (tq as Tier) : undefined} />;
}
