// Rivals: the legend rival always (from the world-aware list: Antigoon FC in world 1, Royal Antwerp in world 2), then up to three earned.
import { clubById } from '../../../football/data/load';
import { MAX_EARNED, rivalList, type Rival } from '../../../football/rivals';
import type { StoredMatch } from '../../../football/store/tables';
import { Hero } from '../../../ui/kit/Kit';
import { RivalPanel } from './StoryLead';

export function RivalsView({ rivals, matches }: { rivals: Rival[]; matches: StoredMatch[] }) {
  const list = rivalList(rivals);
  return (
    <div className="lt-story">
      <Hero value={list.length - 1} ink="#ff9a76" label={`of ${MAX_EARNED} rivals earned`} under={`${clubById(list[0].clubId).name} is always one.`} />
      {list.map((r) => <RivalPanel key={r.clubId} r={r} matches={matches} record />)}
    </div>
  );
}
