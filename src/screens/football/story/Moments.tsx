// Moments: upsets for and against you, and the moment of each season (look pass L4: filled panels, drawn arrows).
import type { SeasonSummary, Upset } from '../../../football/seasonStory';
import { Icon } from '../../../ui/Icon';
import { Hero, Panel, Sect } from '../../../ui/kit/Kit';

const GOLD = '#f2c46d', LAV = '#c2b2ff', GREEN = '#8fdcb6';

export function MomentsView({ upsets, seasons }: { upsets: Upset[]; seasons: SeasonSummary[] }) {
  const forUs = upsets.filter((u) => u.dir === 'for'), against = upsets.filter((u) => u.dir === 'against');
  return (
    <div className="lt-story">
      <Hero value={forUs.length} ink={GOLD} label={forUs.length === 1 ? 'upset for you' : 'upsets for you'} under={`${against.length} against`} />
      {seasons.filter((s) => s.moments.length).map((s) => (
        <Panel key={s.season} ink={GOLD}>
          <span className="k-lb">Moment of season {s.season}</span>
          <b>{s.moments[0]}</b>
        </Panel>
      ))}
      <Sect>Upsets for you · {forUs.length}</Sect>
      <Panel ink={GREEN}>
        {forUs.length === 0 && <span className="k-q">None yet. Beat a side from a higher tier.</span>}
        <ul className="lt-list lt-ups">{[...forUs].reverse().slice(0, 12).map((u) => <li key={u.id}><Icon name="up" size={16} stroke={2.4} color={GREEN} /><span><b>{u.text}</b> · {u.date}</span></li>)}</ul>
      </Panel>
      <Sect>Upsets against you · {against.length}</Sect>
      <Panel ink={LAV}>
        {against.length === 0 && <span className="k-q">None yet.</span>}
        <ul className="lt-list lt-ups">{[...against].reverse().slice(0, 12).map((u) => <li key={u.id}><Icon name="down" size={16} stroke={2.4} color={LAV} /><span><b>{u.text}</b> · {u.date}</span></li>)}</ul>
      </Panel>
    </div>
  );
}
