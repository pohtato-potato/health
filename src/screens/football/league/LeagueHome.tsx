// The League section: the table first, then the pyramid, the calendar and the cups, one tap apart.
import { useLiveQuery } from 'dexie-react-hooks';
import { tierName } from '../../../football/data/load';
import { loadLeague, type League } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { Tier } from '../../../football/types';
import { go, useRoute } from '../../../router';
import { TIER_CUP } from '../../../football/cups';
import { Calendar } from './Calendar';
import { ContinentalView, Cup } from './Cups';
import { Events, eventRows } from './Events';
import { BackPageCard, NewsView, useNews } from './News';
import { Pyramid } from './Pyramid';
import { Table } from './Table';
import { atlasOf } from '../world/Atlas';
import { clubFog } from '../../../football/store/fog';
import { Door, Doors, Sect } from '../../../ui/kit/Kit';
import { Icon } from '../../../ui/Icon';
import { worldOf } from '../../../football/pyramid/shape';
import { PAIRCUP_ID } from '../../../football/pyramid/cups';
import { EveryDivision, FullTable2, LeagueHome2 } from './League2';
import { CongressDoor } from '../desk/Congress';

export const LEAGUE_VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'cups', label: 'Cups' },
  // World 2 (LG-4): the full table of 12 behind the League's top four, and every division with its fog.
  { id: 'full', label: 'The full table' },
  { id: 'divisions', label: 'Every division' },
] as const;
export type LeagueView = (typeof LEAGUE_VIEWS)[number]['id'] | 'news';

export function LeagueView({ l, view, tier, extra, n }: { l: League; view: LeagueView; tier?: Tier; extra?: Partial<Record<LeagueView, React.ReactNode>>; n?: { news: import('../../../football/store/tables').FbNews[]; matches: import('../../../football/store/tables').StoredMatch[]; today: string } }) {
  const mine = l.season.tierOf[OWN];
  const t = tier ?? mine;
  const set = (p: Record<string, string | undefined>) => go('/football/league', p, { replace: true });
  const world = worldOf(l.season);
  if (world === 2 && view === 'table' && !tier) return <><LeagueHome2 l={l} n={n} />{extra?.table ?? null}</>;
  if (world === 2 && (view === 'full' || (view === 'table' && tier === mine))) return <FullTable2 l={l} />;
  if (world === 2 && (view === 'divisions' || view === 'pyramid' || view === 'table')) return <EveryDivision l={l} tier={tier} />;
  return (
    <>
      {view === 'news' && n && <NewsView news={n.news} matches={n.matches} today={n.today} />}
      {view === 'table' && (
        <>
          {n && <BackPageCard news={n.news} matches={n.matches} today={n.today} more />}
          <div className="fb-tierpick">
            <button type="button" className="fb-btn sm" disabled={t === 1} aria-label={t > 1 ? `Up to ${tierName((t - 1) as Tier)}` : 'Top tier'} onClick={() => set({ tier: String(t - 1) })}><Icon name="up" size={22} stroke={2} /></button>
            <span className="fb-s">{t === mine ? 'Your division' : `${Math.abs(t - mine)} ${Math.abs(t - mine) === 1 ? 'tier' : 'tiers'} ${t < mine ? 'above' : 'below'} you`}</span>
            <button type="button" className="fb-btn sm" disabled={t === 6} aria-label={t < 6 ? `Down to ${tierName((t + 1) as Tier)}` : 'Bottom tier'} onClick={() => set({ tier: String(t + 1) })}><Icon name="down" size={22} stroke={2} /></button>
          </div>
          <Table tier={t} rows={l.tables[t]} form={l.form} kitKnown={(id) => clubFog(l.save, id).facts.has('kit')} waiting={Boolean(l.save.paused)} day={l.save.phase === 'season' ? `Day ${l.save.day} of 42` : 'Between seasons'} />
        </>
      )}
      {view === 'table' && !tier && (
        <>
          <Sect>Around the league</Sect>
          <Doors two label="Around the league">
            <Door icon="scope" name="The atlas" value={`${atlasOf(l).seen}% seen`} onClick={() => go('/football/atlas')} />
            <Door icon="ground" name="The pyramid" value={tierName(mine)} onClick={() => set({ view: 'pyramid' })} />
            <Door icon="list" name="Calendar" value={l.save.phase === 'season' ? `Day ${l.save.day}` : 'Break'} onClick={() => set({ view: 'calendar' })} />
            <Door icon="pack" name="The cups" value={l.season.bigcup ? 'This season' : 'None yet'} ink="#f2c46d" onClick={() => set({ view: 'cups' })} />
            <CongressDoor save={l.save} />
          </Doors>
        </>
      )}
      {view === 'pyramid' && <Pyramid tierOf={l.season.tierOf} rating={l.rating} onTier={(x) => set({ tier: String(x) })} />}
      {view === 'calendar' && (
        <Calendar
          season={l.save.season}
          world={world}
          today={l.save.phase === 'season' ? l.save.day : 0}
          cont={Boolean(l.season.continental?.field.includes(OWN))}
          matches={l.matches}
          events={eventRows(l.matches).map((r, i) => ({ day: i + 1, label: `${r.label}: ${r.text}`, result: r.result }))}
        />
      )}
      {view === 'cups' && (
        <>
          <Events event={l.save.phase === 'event' ? l.save.event : undefined} matches={l.matches} />
          {l.season.continental && (l.season.continental.field.includes(OWN) || mine === 1) && <ContinentalView c={l.season.continental} tierOf={l.season.tierOf} world={world} />}
          <Cup b={l.season.bigcup} tierOf={l.season.tierOf} />
          {world === 2
            ? l.season.tiercups[PAIRCUP_ID] && <Cup b={l.season.tiercups[PAIRCUP_ID]} tierOf={l.season.tierOf} />
            : l.season.tiercups[TIER_CUP[mine].id] && <Cup b={l.season.tiercups[TIER_CUP[mine].id]} tierOf={l.season.tierOf} />}
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
  return <LeagueView l={l} view={view} n={n} tier={tq >= 1 && tq <= (worldOf(l.season) === 2 ? 8 : 6) ? (tq as Tier) : undefined} />;
}
