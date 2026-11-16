import type { ReactNode } from 'react';
import { go } from '../../router';
import type { IconName } from '../../ui/Icon';
import { Door, FamilyDoors } from '../../ui/kit/Kit';
import type { AppFamily } from '../../ui/kit/families';
import { DOORS } from './doorList';

const ICON: Record<(typeof DOORS)[number]['label'], IconName> = { Tracks: 'ground', Earned: 'pack', Insights: 'scope', Reports: 'sheet', Body: 'body' };
/** You's pages as doors (board one), each with one live line, grouped by the kind of place they open (ledger O40); anything waiting is a chip in words. */
export function Doors({ subs, counts = {} }: { subs: Record<(typeof DOORS)[number]['label'], string>; counts?: Partial<Record<(typeof DOORS)[number]['label'], string>> }) {
  const groups: Partial<Record<AppFamily, ReactNode[]>> = {};
  for (const d of DOORS) (groups[d.family] ??= []).push(<Door key={d.label} icon={ICON[d.label]} name={d.label} value={subs[d.label]} family={d.family} count={counts[d.label]} onClick={() => go(d.path)} line />);
  return <div className="k-you-doors"><FamilyDoors groups={groups} two label="Look closer" /></div>;
}
