// The Story section: rivals, seasons, moments, the Old Selves and settings, one tap apart.
import { legendId } from '../../../football/rivals';
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
import { SeasonDoors } from '../tree/SeasonScreens';
import { Door, Doors, Sect } from '../../../ui/kit/Kit';

export const STORY_VIEWS = [
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
      {view === 'rivals' && <SeasonDoors />}
      {view === 'rivals' && <RivalsView rivals={s.l.save.rivals} matches={s.all} />}
      {view === 'seasons' && <SeasonsView list={s.seasons.map((x) => summarise(x, s.all, s.seasons))} kitOf={(n) => kitName(s, n)} crestOf={(n) => crestName(s, n)} />}
      {view === 'moments' && <MomentsView upsets={upsets(s.all, s.seasons)} seasons={s.seasons.map((x) => summarise(x, s.all, s.seasons))} />}
      {view === 'olds' && <OldSelves clubs={[...s.l.clubs.values()]} tierOf={s.l.season.tierOf} retired={s.l.save.retired} />}
      {view === 'settings' && <SettingsView s={s.l.save} />}
      {view === 'rivals' && (
        <>
          <Sect>More of the story</Sect>
          <Doors two label="More of the story">
            <Door icon="book" name="Seasons" value={`${s.seasons.length} so far`} onClick={() => go('/football/story', { view: 'seasons' })} />
            <Door icon="pack" name="Moments" value={`${upsets(s.all, s.seasons).length} upsets`} ink="#f2c46d" onClick={() => go('/football/story', { view: 'moments' })} />
            <Door icon="people" name="Old Selves" value={`${s.l.save.retired?.length ?? 0} retired`} onClick={() => go('/football/story', { view: 'olds' })} />
            <Door icon="list" name="Settings" value="Football rules" onClick={() => go('/football/story', { view: 'settings' })} />
          </Doors>
        </>
      )}
      {extra?.[view] ?? null}
    </>
  );
}

export function StoryHome({ extra }: { extra?: (s: Story) => Partial<Record<StoryViewId, ReactNode>> }) {
  const { params } = useRoute();
  const s = useStory();
  if (s === undefined) return null;
  if (s === null) return <p className="fb-s">The story starts once you found the club.</p>;
  const v = (params.get('view') ?? 'rivals') as StoryViewId;
  return <StoryView s={s} view={STORY_VIEWS.some((x) => x.id === v) ? v : 'rivals'} extra={extra?.(s)} />;
}

export function RivalRoute({ id }: { id: string }) {
  const s = useStory();
  if (!s) return null;
  const r = s.l.save.rivals.find((x) => x.clubId === id) ?? (id === legendId() ? { clubId: id, how: 'legend' as const, since: '' } : undefined);
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
