// Football's routes. Each screen is filled in by its own task; the shell is shared.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useSave, useTonight } from '../../football/store/hooks';
import { MatchPlayer } from './Match';
import { useRoute } from '../../router';
import { Aurora, FootballHome, type FbSection } from './FootballHome';
import { TonightView } from './Tonight';
import { LeagueHome } from './league/LeagueHome';
import { ClubPage } from './league/ClubPage';
import { RivalRoute, StoryHome } from './story/StoryHome';
import { ClubHome, PlayerRoute } from './club/ClubHome';
import { FullTime } from './FullTime';
import { FirstRun } from './FirstRun';
import { keyChances } from './CatchUp';
import { go } from '../../router';
import type { StoredMatch } from '../../football/store/tables';

const SECTION: Record<string, FbSection> = { '/football': 'tonight', '/football/club': 'club', '/football/league': 'league', '/football/story': 'story' };

function TonightSection() {
  const t = useTonight();
  if (t === undefined) return null;
  if (t === null) return <p className="fb-s">Football starts once you found the club.</p>;
  return <TonightView t={t} />;
}

function MatchRoute({ id, at, paused }: { id: string | null; at?: number; paused?: boolean }) {
  const save = useSave();
  const [ended, setEnded] = useState(false);
  const m = useLiveQuery(async () => (id ? db.fbMatches.get(id) : (await db.fbMatches.orderBy('date').last())) ?? null, [id]);
  if (save === undefined || m === undefined) return null;
  if (!save || !m) return <FootballHome section="tonight"><p className="fb-s">No match to show yet.</p></FootballHome>;
  if (ended) return <FootballHome section="tonight"><FullTime m={m} save={save} onWatch={() => setEnded(false)} /></FootballHome>;
  return <MatchPlayer key={`${m.id}:${at ?? ''}`} m={m} save={save} at={at} paused={paused} onEnd={() => { setEnded(true); window.scrollTo(0, 0); }} />;
}

/** The catch-up reel: every unwatched auto-played match, key chances only, one after another. */
function ReelRoute() {
  const save = useSave();
  const [list, setList] = useState<StoredMatch[] | null>(null);
  const [i, setI] = useState(0);
  const found = useLiveQuery(() => db.fbMatches.orderBy('date').filter((m) => !!m.auto && !m.watched).toArray(), []);
  if (list === null && found) setList(found);
  if (save === undefined || list === null) return null;
  const m = list[i];
  if (!save || !m) return <FootballHome section="tonight"><p className="fb-s">Nothing to catch up on.</p></FootballHome>;
  return <MatchPlayer key={m.id} m={keyChances(m)} save={save} onEnd={() => (i + 1 < list.length ? setI(i + 1) : go('/football', undefined, { replace: true }))} />;
}

export function Football() {
  const { path, params } = useRoute();
  const save = useSave();
  if (save === undefined) return null;
  if (save === null) return <Aurora><main className="fb-page"><FirstRun /></main></Aurora>;
  if (path === '/football/match' && params.get('reel') === '1') return <ReelRoute />;
  if (path === '/football/match') {
    // Dev only: ?at=<ms>&pause=1 freezes the replay at a moment, for checking each visual.
    const dev = import.meta.env.DEV;
    const at = dev && params.get('at') ? Number(params.get('at')) : undefined;
    return <MatchRoute id={params.get('id')} at={at} paused={dev && params.get('pause') === '1'} />;
  }
  if (path === '/football/club-page') return <FootballHome section="league"><ClubPage id={params.get('id') ?? ''} wiki={params.get('wiki') === '1'} /></FootballHome>;
  if (path === '/football/rival') return <FootballHome section="story"><RivalRoute id={params.get('id') ?? ''} /></FootballHome>;
  if (path === '/football/player') return <FootballHome section="club"><PlayerRoute axis={params.get('axis') ?? ''} /></FootballHome>;
  const section = SECTION[path] ?? 'tonight';
  return <FootballHome section={section}>{section === 'tonight' ? <TonightSection /> : section === 'league' ? <LeagueHome /> : section === 'story' ? <StoryHome /> : <ClubHome />}</FootballHome>;
}
