// Football's routes. Each screen is filled in by its own task; the shell is shared.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useSave, useTonight } from '../../football/store/hooks';
import { MatchPlayer } from './Match';
import { useRoute } from '../../router';
import { FootballHome, type FbSection } from './FootballHome';
import { TonightView } from './Tonight';
import { FullTime } from './FullTime';

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

export function Football() {
  const { path, params } = useRoute();
  if (path === '/football/match') {
    // Dev only: ?at=<ms>&pause=1 freezes the replay at a moment, for checking each visual.
    const dev = import.meta.env.DEV;
    const at = dev && params.get('at') ? Number(params.get('at')) : undefined;
    return <MatchRoute id={params.get('id')} at={at} paused={dev && params.get('pause') === '1'} />;
  }
  const section = SECTION[path] ?? 'tonight';
  return <FootballHome section={section}>{section === 'tonight' ? <TonightSection /> : null}</FootballHome>;
}
