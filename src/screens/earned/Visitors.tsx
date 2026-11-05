import { creatureById } from '../../domain/creatureRoster';
import type { Stretch } from '../../domain/earned';
import { CreatureFigure } from '../../ui/creatures/Figure';
import { go } from '../../router';

const NAMES: Record<string, string> = {
  plains: 'The plains', desert: 'The desert', ravines: 'Bandit Country', deccan: 'The Deccan', ghats: 'The Ghats', coast: 'The coast',
  east: 'The east', northeast: 'The northeast', himalaya: 'The Himalaya', everywhere: 'All along the road', elsewhere: 'Elsewhere',
};
const STAGE = ['New', 'New', 'Young', 'Grown'];

export function Visitors({ stretches }: { stretches: Stretch[] }) {
  return (
    <section className="yu-sec">
      <h2>Visitors</h2>
      {stretches.map((s) => (
        <div key={s.region} className="yu-sec">
          <div className="yu-stretch">
            <b>{NAMES[s.region] ?? s.region}</b>
            {s.here && <span className="yu-q">The road you are on{s.visitors.length ? '' : ' · no one met yet'}</span>}
          </div>
          {s.visitors.length > 0 && (
            <div className="yu-vis2">
              {s.visitors.map((v) => {
                const c = creatureById(v.id);
                const sub = `${STAGE[Math.min(v.stage, 3)]} · ${v.visits} visit${v.visits === 1 ? '' : 's'}`;
                if (!c) return <div key={v.id} className="yu-vis"><b>Someone from before</b><span>{sub}</span></div>;
                return (
                  <button key={v.id} type="button" className="yu-vis" onClick={() => go('/dex', { c: v.id })}>
                    <CreatureFigure c={c} stage={v.stage} width={110} burst={false} draw={false} />
                    <b>{c.short}</b><span>{sub}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
