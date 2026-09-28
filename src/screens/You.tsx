import { fmtDayMonth } from '../domain/format';
import { dayKey } from '../domain/dates';
import { VOICES, voiceLine } from '../domain/voice';
import { bump, patchSettings } from '../db/actions';
import { prefOn } from '../domain/types';
import { useSettings, useToday } from '../db/hooks';
import { back, go } from '../router';
import { Icon } from '../ui/Icon';
import { useLevel, wornTitle } from './Character';

export function You() {
  const settings = useSettings();
  const today = useToday();
  const lv = useLevel();
  if (!settings) return <div className="page bare" />;
  const title = lv ? wornTitle(settings, lv.unlocked, lv.level) : undefined;
  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/today')}>
        <Icon name="left" size={20} stroke={1.8} />
        Today
      </button>

      <div className="row" style={{ justifyContent: 'flex-start', gap: 16 }}>
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="37" fill="var(--surface)" stroke="var(--hairline)" strokeWidth="2" />
          </svg>
          <span className="sf" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
            {(settings.name || 'You').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="col gap6">
          <div className="sf" style={{ fontSize: 30, lineHeight: 1 }}>
            {settings.name || 'You'}
          </div>
          {title && <div className="t14 gold">the {title}</div>}
          <div className="t13 q">Tracking since {fmtDayMonth(dayKey(new Date(settings.createdAt)))}</div>
        </div>
      </div>

      <div className="card">
        <div className="lbl">Voice</div>
        <div className="grid2">
          {VOICES.map((v) => {
            const on = settings.voice === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  void patchSettings({ voice: v.id });
                  void bump('voices', { value: v.id });
                }}
                className="col gap4"
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 16, border: `1px solid ${on ? v.color : 'var(--hairline)'}`, background: 'var(--raised)' }}
                aria-pressed={on}
              >
                <b style={{ fontWeight: 500, fontSize: 15, color: v.color }}>
                  {v.name}
                  {on ? ' · on' : ''}
                </b>
                <span className="voice" style={{ fontSize: 13, lineHeight: 1.35, color: 'var(--quiet)' }}>
                  {voiceLine(v.id, 'rest', today)}
                </span>
              </button>
            );
          })}
        </div>
        <label className="row" style={{ minHeight: 52, borderTop: '1px solid var(--divider)', paddingTop: 6 }}>
          <span className="col gap2">
            <span className="t15">Shuffle voices daily</span>
            <span className="t12 q">A different one each morning</span>
          </span>
          <input
            type="checkbox"
            className="sw"
            checked={prefOn(settings.prefs, 'shuffleVoices')}
            onChange={(e) => patchSettings((s) => ({ prefs: { ...s.prefs, shuffleVoices: e.target.checked } }))}
          />
        </label>
        <div className="t12 d lh">Voices never joke about your body or your food. If you flag a joint, every voice switches to plain speech.</div>
      </div>

      <button type="button" className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => go('/character')}>
        <span className="col gap2">
          <span className="t16">Character sheet{lv ? ` · level ${lv.level}` : ''}</span>
          <span className="t12 q">Stats, titles, themes and the rewards you've earned</span>
        </span>
        <Icon name="right" size={18} stroke={1.8} color="var(--dim)" />
      </button>

      <button type="button" className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => go('/settings')}>
        <span className="col gap2">
          <span className="t16">Settings</span>
          <span className="t12 q">Targets, checklist, equipment, backups, plan</span>
        </span>
        <Icon name="right" size={18} stroke={1.8} color="var(--dim)" />
      </button>

    </div>
  );
}
