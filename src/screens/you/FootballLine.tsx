import { useLiveQuery } from 'dexie-react-hooks';
import { go } from '../../router';
import { Icon } from '../../ui/Icon';
import { Panel } from '../../ui/kit/Kit';
import { leagueLineFor } from '../football/HabitLine';

/** The club's standing, as a tappable panel in the action's orange (look pass; the data comes from Football). */
export function FootballLine() {
  const d = useLiveQuery(leagueLineFor, []);
  if (!d) return null;
  return (
    <Panel ink="#ff9a4d" className="flat" onClick={() => go('/football')} label={`Football: ${d.text}`}>
      <Icon name="ground" size={28} color="#ff9a4d" stroke={1.6} />
      <span className="k-col"><span className="k-lb">Football</span><span>{d.text}</span>{d.sub && <span className="k-q">{d.sub}</span>}</span>
    </Panel>
  );
}
