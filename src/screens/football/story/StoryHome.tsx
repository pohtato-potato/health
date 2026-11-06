// The Story tab. Part 3 brings the Old Selves; rivals, seasons, moments and settings follow.
import { useLiveQuery } from 'dexie-react-hooks';
import { loadLeague } from '../../../football/store/league';
import { OldSelves } from './OldSelves';

export function StoryHome() {
  const l = useLiveQuery(loadLeague, []);
  if (l === undefined) return null;
  if (l === null) return <p className="fb-s">The story starts once you found the club.</p>;
  return <OldSelves clubs={[...l.clubs.values()]} tierOf={l.season.tierOf} retired={l.save.retired} />;
}
