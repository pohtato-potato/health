import { go } from '../../router';
import type { IconName } from '../../ui/Icon';
import { Door } from '../../ui/kit/Kit';
import { DOORS } from './doorList';

const ICON: Record<(typeof DOORS)[number]['label'], IconName> = { Tracks: 'ground', Earned: 'pack', Insights: 'scope', Reports: 'sheet', Body: 'body' };
/** You's pages as doors (board one): each in its own ink with one live line. Body is the fifth, kept from before. */
export function Doors({ subs }: { subs: Record<(typeof DOORS)[number]['label'], string> }) {
  return (
    <nav className="k-doors two k-you-doors" aria-label="Look closer">
      {DOORS.map((d) => <Door key={d.label} icon={ICON[d.label]} name={d.label} value={subs[d.label]} ink={d.hue} onClick={() => go(d.path)} line />)}
    </nav>
  );
}
