import { creatureById, nameAt, stageWord } from '../../domain/creatureRoster';
import type { DexRow } from '../../domain/creatures';
import { CreatureSvg } from './Figure';

/** The found creatures, as a sky or as cards. Only what's been found is ever drawn. */
export function DexGrid({ rows, cards, onOpen }: { rows: DexRow[]; cards: boolean; onOpen: (id: string) => void }) {
  return (
    <div className={`dex-grid${cards ? ' cards' : ''}`}>
      {rows.map((r, i) => {
        const c = creatureById(r.id)!;
        return (
          <button key={r.id} type="button" className={`dex-one${cards ? ' card' : ''}`} style={cards ? undefined : { marginTop: (i * 37) % 22 }} onClick={() => onOpen(r.id)}>
            <span className="dex-fig"><CreatureSvg c={c} stage={r.stage} /></span>
            <span className="t14">{nameAt(c, r.stage)}</span>
            {cards && <span className="t14 q">{stageWord(c, r.stage)} · {r.visits} visit{r.visits === 1 ? '' : 's'}</span>}
          </button>
        );
      })}
    </div>
  );
}
