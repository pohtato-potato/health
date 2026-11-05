import { useState } from 'react';
import { patchSettings } from '../../db/actions';
import { CONFETTI, hasReward, rewardAch } from '../../domain/rewards';
import { themeById } from '../../domain/themes';
import { prefOn, type Settings } from '../../domain/types';
import { Icon } from '../../ui/Icon';
import { ThemeSheet } from '../../ui/Theme';

/** Themes, rings and the rest of what you have earned to use: one picker. */
export function Rewards({ settings, unlocked, today }: { settings: Settings; unlocked: Set<string>; today: string }) {
  const [themes, setThemes] = useState(false);
  const reward = (r: string) => hasReward(unlocked, r);
  const lockedLine = (r: string) => {
    const a = rewardAch(r);
    return a ? (a.cat === 'secret' ? 'Unlocked by a secret achievement' : `Unlock: ${a.name}`) : '';
  };
  return (
    <>
      <div className="card yu-rewards" style={{ gap: 12 }}>
        <button type="button" className="row t15" style={{ minHeight: 44 }} onClick={() => setThemes(true)}>
          <span>Theme</span>
          <span className="q">{themeById(settings.theme)?.name ?? 'Dusk'} ›</span>
        </button>
        <div className="col gap8">
          <span className="t15">Confetti</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
            {CONFETTI.map((c) => {
              const open = !c.reward || reward(c.reward);
              const on = (settings.confetti ?? 'classic') === c.id;
              return (
                <button key={c.id} type="button" className={`chip sm${on ? ' on' : ''}`} disabled={!open} title={open ? undefined : lockedLine(c.reward!)} onClick={() => patchSettings({ confetti: c.id })}>
                  {c.palette.length > 0 && (
                    <span style={{ display: 'inline-flex', gap: 2, marginRight: 6 }}>
                      {c.palette.slice(0, 4).map((p) => (
                        <i key={p} style={{ width: 6, height: 6, borderRadius: 3, background: p }} />
                      ))}
                    </span>
                  )}
                  {c.name}
                  {!open && <Icon name="lock" size={12} style={{ marginLeft: 4 }} />}
                </button>
              );
            })}
          </div>
        </div>
        <label className="row" style={{ minHeight: 52, opacity: reward('Gold rings') ? 1 : 0.5 }}>
          <span className="col gap2">
            <span className="t15">Gold rings</span>
            <span className="t12 q">{reward('Gold rings') ? 'Closed rings on Today turn gold' : lockedLine('Gold rings')}</span>
          </span>
          <input type="checkbox" className="sw" disabled={!reward('Gold rings')} checked={reward('Gold rings') && prefOn(settings.prefs, 'goldRings')} onChange={(e) => patchSettings((s) => ({ prefs: { ...s.prefs, goldRings: e.target.checked } }))} />
        </label>
        <label className="row" style={{ minHeight: 52, opacity: reward('Gym mode') ? 1 : 0.5 }}>
          <span className="col gap2">
            <span className="t15">Gym mode</span>
            <span className="t12 q">{reward('Gym mode') ? 'Loads come from a full dumbbell rack, not your plates' : lockedLine('Gym mode')}</span>
          </span>
          <input type="checkbox" className="sw" disabled={!reward('Gym mode')} checked={reward('Gym mode') && !!settings.equipment.gym} onChange={(e) => patchSettings((s) => ({ equipment: { ...s.equipment, gym: e.target.checked } }))} />
        </label>
        <div className="row t15" style={{ minHeight: 44, opacity: reward('A gold route on your map') ? 1 : 0.5 }}>
          <span className="col gap2">
            <span>Gold route</span>
            <span className="t12 q">{reward('A gold route on your map') ? 'Your walked route is drawn in gold' : lockedLine('A gold route on your map')}</span>
          </span>
          {!reward('A gold route on your map') && <Icon name="lock" size={16} color="var(--dim)" />}
        </div>
      </div>
      {themes && <ThemeSheet settings={settings} unlocked={unlocked} today={today} onClose={() => setThemes(false)} />}
    </>
  );
}
