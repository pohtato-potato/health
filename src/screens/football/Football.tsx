// Football's routes. Each screen is filled in by its own task; the shell is shared.
import { useRoute } from '../../router';
import { FootballHome, type FbSection } from './FootballHome';

const SECTION: Record<string, FbSection> = { '/football': 'tonight', '/football/club': 'club', '/football/league': 'league', '/football/story': 'story' };

export function Football() {
  const { path } = useRoute();
  const section = SECTION[path] ?? 'tonight';
  return <FootballHome section={section} />;
}
