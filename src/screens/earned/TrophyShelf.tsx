import { useState, type CSSProperties } from 'react';
import { patchSettings } from '../../db/actions';
import type { Trophy } from '../../domain/trophies';
import { Icon } from '../../ui/Icon';
import { Panel } from '../../ui/kit/Kit';

const MAX = 6;
/** Each trophy in the ink of what it counts (board three: most steps green, perfect days gold, kilometres blue). */
const INK: Record<string, string> = { steps: '#8fdcb6', month: '#8fdcb6', perfect: '#f2c46d', records: '#ff9a76', lastmonth: '#93c3dc' };
const inkOf = (id: string) => INK[id] ?? '#f2c46d';

/** The trophy case: tiles three across, and the choice of what sits there behind a quiet "Choose". */
export function TrophyShelf({ all, picks, shown }: { all: Trophy[]; picks: string[] | undefined; shown: Trophy[] }) {
  const [choosing, setChoosing] = useState(false);
  if (!all.length) return null;
  const toggle = (id: string) => {
    const now = shown.map((t) => t.id);
    const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id].slice(-MAX);
    void patchSettings({ trophyPicks: next });
  };
  return (
    <>
      <div className="k-tiles">
        {shown.map((t) => <div key={t.id} className="k-panel" style={{ '--ink': inkOf(t.id) } as CSSProperties}><span className="k-q">{t.label}</span><b className="k-num ink">{t.value}</b></div>)}
      </div>
      <button type="button" className="k-more" style={{ color: '#f2c46d' }} aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>
        <span>{choosing ? 'Done choosing' : picks?.length ? 'Change what sits here' : 'Choose what sits here'}</span>
        <Icon name={choosing ? 'up' : 'down'} size={16} stroke={2.2} />
      </button>
      {choosing && (
        <Panel ink="#f2c46d" className="k-rows">
          {all.map((t) => {
            const on = shown.some((x) => x.id === t.id);
            return <button key={t.id} type="button" className="k-rowl" aria-pressed={on} onClick={() => toggle(t.id)}><span>{t.label}</span><b style={{ color: on ? '#f2c46d' : undefined }}>{on ? 'In the case' : 'Add'}</b></button>;
          })}
        </Panel>
      )}
    </>
  );
}
