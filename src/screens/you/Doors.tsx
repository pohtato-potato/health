import { go } from '../../router';
import type { IconName } from '../../ui/Icon';
import { Door } from '../../ui/kit/Kit';
import { DOORS } from './doorList';

const ICON: Record<(typeof DOORS)[number]['label'], IconName> = { Reports: 'sheet', Earned: 'pack', Body: 'you', Tracks: 'tracks', Insights: 'scope' };
/** You's pages as doors (look pass): each in its own ink with one live line. */
export function Doors({ subs }: { subs: Record<(typeof DOORS)[number]['label'], string> }) {
  const order = ['Tracks', 'Earned', 'Insights', 'Reports', 'Body'] as const;
  return (
    <nav className="k-doors two k-you-doors" aria-label="Look closer">
      {order.map((l) => {
        const d = DOORS.find((x) => x.label === l)!;
        return <Door key={l} icon={ICON[l]} name={l} value={subs[l]} ink={d.hue} onClick={() => go(d.path)} />;
      })}
    </nav>
  );
}
