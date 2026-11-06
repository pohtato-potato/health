// Opening night: a new stand or building drawn in light for the first time.
import { bundleById } from '../../../football/ground';
import { Aurora } from '../FootballHome';

export function OpeningNightView({ id, onDone }: { id: string; onDone: () => void }) {
  const b = id === 'moving-day' ? { name: 'Kaai 42', effect: 'Moving day. The first match at Kaai 42 is a big night, and the groundshare ends.' } : bundleById(id);
  return (
    <div className="fb-moment" role="dialog" aria-modal="true" aria-labelledby="fb-open-t">
      <Aurora a="#ff7a1a" c="#7fe0a8">
        <main className="fb-page">
          <span className="fb-lb">Opening night</span>
          <svg className="fb-opening" viewBox="0 0 300 150" aria-hidden="true">
            <path d="M20 120 H280" className="base" />
            <path d="M40 120 V60 Q150 30 260 60 V120" className="trace" pathLength={100} />
            <path d="M60 120 V78 H240 V120" className="trace late" pathLength={100} />
          </svg>
          <h2 id="fb-open-t" className="fb-momtitle">{b.name}</h2>
          <p className="fb-s">{b.effect}</p>
          <div className="fb-btns"><button type="button" className="fb-btn pri" onClick={onDone}>Lights on</button></div>
        </main>
      </Aurora>
    </div>
  );
}
