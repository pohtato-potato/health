// The Story section: rivals, seasons, moments, the Old Selves and settings, one tap apart.
import { useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { loadLeague, type League } from '../../../football/store/league';
import type { FbSeason, StoredMatch } from '../../../football/store/tables';
import { summarise, upsets } from '../../../football/seasonStory';
import { kitsBySeason } from '../../../football/store/kitWall';
import { CATALOGUE, CREST_LINES } from '../../../football/kits';
import { MomentsView } from './Moments';
import { SeasonsView } from './Seasons';
import { WrappedView } from '../moments/Wrapped';
import { go, useRoute } from '../../../router';
import { OldSelves } from './OldSelves';
import { RivalsView } from './Rivals';
import { RivalryView } from './Rivalry';
import { SettingsView } from './Settings';
import { StoryLead } from './StoryLead';

export const STORY_VIEWS = [
  { id: 'home', label: 'Story' },
  { id: 'rivals', label: 'Rivals' },
  { id: 'seasons', label: 'Seasons' },
  { id: 'moments', label: 'Moments' },
  { id: 'olds', label: 'Old Selves' },
  { id: 'settings', label: 'Settings' },
] as const;
export type StoryViewId = (typeof STORY_VIEWS)[number]['id'];

export interface Story { l: League; all: StoredMatch[]; seasons: FbSeason[] }
const loadStory = async (): Promise<Story | null> => {
  const l = await loadLeague();
  return l ? { l, all: await db.fbMatches.orderBy('date').toArray(), seasons: await db.fbSeasons.toArray() } : null;
};
export const useStory = () => useLiveQuery(loadStory, []);

export function StoryView({ s, view, extra }: { s: Story; view: StoryViewId; extra?: Partial<Record<StoryViewId, ReactNode>> }) {
  return (
    <>
      {view === 'home' && <StoryLead s={s} />}
      {view === 'rivals' && <RivalsView rivals={s.l.save.rivals} matches={s.all} />}
      {view === 'seasons' && <SeasonsView list={s.seasons.map((x) => summarise(x, s.all, s.seasons))} kitOf={(n) => kitName(s, n)} crestOf={(n) => crestName(s, n)} />}
      {view === 'moments' && <MomentsView upsets={upsets(s.all, s.seasons)} seasons={s.seasons.map((x) => summarise(x, s.all, s.seasons))} />}
      {view === 'olds' && <OldSelves clubs={[...s.l.clubs.values()]} tierOf={s.l.season.tierOf} retired={s.l.save.retired} />}
      {view === 'settings' && <div className="lt-set"><SettingsView s={s.l.save} /></div>}
      {extra?.[view] ?? null}
    </>
  );
}

export function StoryHome({ extra }: { extra?: (s: Story) => Partial<Record<StoryViewId, ReactNode>> }) {
  const { params } = useRoute();
  const s = useStory();
  if (s === undefined) return null;
  if (s === null) return <p className="k-q">The story starts once you found the club.</p>;
  const v = (params.get('view') ?? 'home') as StoryViewId;
  return <StoryView s={s} view={STORY_VIEWS.some((x) => x.id === v) ? v : 'home'} extra={extra?.(s)} />;
}

export function RivalRoute({ id }: { id: string }) {
  const s = useStory();
  if (!s) return null;
  const r = s.l.save.rivals.find((x) => x.clubId === id) ?? (id === 'ant' ? { clubId: 'ant', how: 'legend' as const, since: '' } : undefined);
  return (
    <>
      {r ? <RivalryView r={r} matches={s.all} /> : <p className="fb-s">Not a rival any more.</p>}
    </>
  );
}

const kitName = (s: Story, n: number) => {
  const id = kitsBySeason(s.l.save, n)[n]?.home ?? '';
  return id.startsWith('FIRST:') ? 'The founding shirt' : `Home: ${CATALOGUE.find((k) => k.id === id)?.name ?? id}`;
};
const crestName = (s: Story, n: number) => {
  const h = (s.l.save.crestHistory ?? []).filter((x) => x.season <= n && x.opt !== 'keep').pop();
  return h ? `Crest: ${CREST_LINES[h.step]}` : '';
};

export function WrappedRoute({ season }: { season: number }) {
  const s = useStory();
  const x = s ? s.seasons.find((y) => y.id === season && !!y.final) : undefined;
  // An old or bare link with no finished season lands on the seasons list, never a blank page.
  const missing = s === null || (!!s && !x);
  useEffect(() => {
    if (missing) go('/football/story', { view: 'seasons' }, { replace: true });
  }, [missing]);
  if (!s || !x) return null;
  return <WrappedView s={summarise(x, s.all, s.seasons)} onDone={() => go('/football/story', { view: 'seasons' }, { replace: true })} />;
}
