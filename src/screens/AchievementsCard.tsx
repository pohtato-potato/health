import { useLiveQuery } from 'dexie-react-hooks';
import { ACTIVE_ACHIEVEMENTS as ACHIEVEMENTS, achievementById } from '../domain/achievements';
import { db } from '../db/db';
import { go } from '../router';
import { TIER_COLOR } from '../ui/Moments';
import { Icon } from '../ui/Icon';

/** The achievements card on Journey: how many, and the latest. */
export function AchievementsCard() {
  const unlocked = useLiveQuery(() => db.achievements.toArray(), []);
  if (!unlocked) return null;
  const got = new Set(unlocked.map((u) => u.id));
  const latest = [...unlocked].sort((a, b) => b.at - a.at)[0];
  const latestDef = latest ? achievementById(latest.id) : undefined;
  return (
    <button type="button" className="card" onClick={() => go('/achievements')}>
      <div className="row">
        <div className="lbl">Achievements</div>
        <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
      </div>
      <div className="t15">
        <span className="sf" style={{ fontSize: 22 }}>
          {unlocked.length}
        </span>{' '}
        <span className="q">of {ACHIEVEMENTS.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(7px, 1fr))', gap: 3 }} aria-hidden="true">
        {ACHIEVEMENTS.map((a) => (
          <i key={a.id} style={{ aspectRatio: '1', borderRadius: 1.5, background: got.has(a.id) ? (a.cat === 'secret' ? 'var(--lavender)' : TIER_COLOR[a.tier]) : 'var(--track)' }} />
        ))}
      </div>
      {latestDef && <div className="t13 q">Latest: {latestDef.cat === 'secret' ? `${latestDef.name} (secret)` : latestDef.name}</div>}
    </button>
  );
}
