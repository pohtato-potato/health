// Football's routes. Each screen is filled in by its own task; the shell is shared.
import { useTonight } from '../../football/store/hooks';
import { useRoute } from '../../router';
import { FootballHome, type FbSection } from './FootballHome';
import { TonightView } from './Tonight';

const SECTION: Record<string, FbSection> = { '/football': 'tonight', '/football/club': 'club', '/football/league': 'league', '/football/story': 'story' };

function TonightSection() {
  const t = useTonight();
  if (t === undefined) return null;
  if (t === null) return <p className="fb-s">Football starts once you found the club.</p>;
  return <TonightView t={t} />;
}

export function Football() {
  const { path } = useRoute();
  const section = SECTION[path] ?? 'tonight';
  return <FootballHome section={section}>{section === 'tonight' ? <TonightSection /> : null}</FootballHome>;
}
