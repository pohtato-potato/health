// The Story section: rivals, seasons, moments, the Old Selves and settings, one tap apart.
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../db/db';
import { loadLeague, type League } from '../../../football/store/league';
import type { StoredMatch } from '../../../football/store/tables';
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

export interface Story { l: League; all: StoredMatch[] }
const loadStory = async (): Promise<Story | null> => {
  const l = await loadLeague();
  return l ? { l, all: await db.fbMatches.orderBy('date').toArray() } : null;
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
