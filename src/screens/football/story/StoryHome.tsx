// The Story section: rivals, seasons, moments, the Old Selves and settings, one tap apart.
import type { ReactNode } from 'react';
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
      <nav className="fb-subseg five" aria-label="Story">
        {STORY_VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={view === v.id} className={view === v.id ? 'on' : undefined} onClick={() => go('/football/story', v.id === 'rivals' ? undefined : { view: v.id }, { replace: true })}>{v.label}</button>
        ))}
      </nav>
      {view === 'rivals' && <RivalsView rivals={s.l.save.rivals} matches={s.all} />}
      {view === 'seasons' && <SeasonsView list={s.seasons.map((x) => summarise(x, s.all, s.seasons))} kitOf={(n) => kitName(s, n)} crestOf={(n) => crestName(s, n)} />}
      {view === 'moments' && <MomentsView upsets={upsets(s.all, s.seasons)} seasons={s.seasons.map((x) => summarise(x, s.all, s.seasons))} />}
      {view === 'olds' && <OldSelves clubs={[...s.l.clubs.values()]} tierOf={s.l.season.tierOf} retired={s.l.save.retired} />}
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
  const r = s.l.save.rivals.find((x) => x.clubId === id) ?? (id === 'ant' ? { clubId: 'ant', how: 'legend' as const, since: '' } : undefined);
  return (
    <>
      <button type="button" className="fb-btn sm" onClick={() => go('/football/story', undefined, { replace: true })}>← Rivals</button>
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
  if (!s) return null;
  const x = s.seasons.find((y) => y.id === season);
  if (!x) return <p className="fb-s">No such season.</p>;
  return <WrappedView s={summarise(x, s.all, s.seasons)} onDone={() => go('/football/story', { view: 'seasons' }, { replace: true })} />;
}
