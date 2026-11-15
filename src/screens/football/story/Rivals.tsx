// Rivals: Antigoon FC always, then up to three earned, each with how it started and its modifier.
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
