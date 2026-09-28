import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addDays, daysBetween } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { strengthScores } from '../domain/insights';
import { CONFETTI, STAT_NAMES, TITLES, charStats, hasReward, levelOf, rewardAch, xpFrom, type CharStats } from '../domain/rewards';
import { themeById } from '../domain/themes';
import { prefOn, type Settings } from '../domain/types';
import { patchSettings } from '../db/actions';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useSessions, useSettings, useToday } from '../db/hooks';
import { back } from '../router';
import { Icon } from '../ui/Icon';
import { ThemeSheet, useUnlockedIds } from '../ui/Theme';
import { summaries } from '../state/Challenge';
import { flagEvents, targetsFor } from '../state/derived';

/** The worn title's name, if any. */
export function wornTitle(settings: Settings, unlocked: Set<string>, level: number): string | undefined {
  const t = TITLES.find((x) => x.id === settings.title);
  return t && t.unlocked(unlocked, level) ? t.name : undefined;
}

export function useLevel() {
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const unlocked = useUnlockedIds();
  const checkins = useLiveQuery(() => db.checkins.count(), []);
  const today = useToday();
  if (!settings || !days || !entries || !sessions || !unlocked || checkins === undefined) return undefined;
  const all = summaries(settings, days, entries, days.reduce((m, d) => (d.date < m ? d.date : m), today), today);
  const xp = xpFrom([...unlocked], { perfect: all.filter((d) => d.perfect).length, sessions: sessions.filter((s) => s.status === 'done').length, checkins });
  return { ...levelOf(xp), unlocked, settings, days, entries, sessions, all };
}

/** An RPG-style sheet: level, six stats, titles to wear and the rewards you've earned. */
export function CharacterPage() {
  const lv = useLevel();
  const sets = useAllSets();
  const today = useToday();
  const [themes, setThemes] = useState(false);
  if (!lv || !sets) return <div className="page bare" />;
  const { settings, unlocked, days, sessions, all } = lv;

  const scores = strengthScores(sets, today).filter((s) => s.series.length >= 2);
  const gain = scores.length ? scores.reduce((n, s) => n + (s.now / s.series[0] - 1), 0) / scores.length : 0;
  const t = targetsFor(settings, today);
  const week = days.filter((d) => d.date >= addDays(today, -7) && d.date < today && d.steps !== undefined);
  const recent = (n: number) => all.filter((d) => d.date >= addDays(today, -n) && d.date < today);
  const events = flagEvents(settings.plan, sessions, days);
  const stats = charStats({
    strengthGain: gain,
    stepsRatio: week.length ? week.reduce((n, d) => n + d.steps!, 0) / week.length / t.steps : 0,
    sleepNights14: recent(14).filter((d) => d.sleepOk).length,
    proteinDays14: recent(14).filter((d) => d.proteinOk).length,
    logged30: recent(30).filter((d) => d.logged || d.steps > 0).length,
    daysSinceFlag: events.length ? daysBetween(events[events.length - 1].date, today) : undefined,
  });
  const title = wornTitle(settings, unlocked, lv.level);
  const reward = (r: string) => hasReward(unlocked, r);
  const lockedLine = (r: string) => {
    const a = rewardAch(r);
    return a ? (a.cat === 'secret' ? 'Unlocked by a secret achievement' : `Unlock: ${a.name}`) : '';
  };

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>

      <div className="row" style={{ justifyContent: 'flex-start', gap: 16 }}>
        <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <circle cx="42" cy="42" r="38" fill="var(--surface)" stroke="var(--track)" strokeWidth="4" />
            <circle cx="42" cy="42" r="38" fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${Math.max(lv.progress, 0.01) * 238.8} 238.8`} transform="rotate(-90 42 42)" />
          </svg>
          <span className="sf" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
            {lv.level}
          </span>
        </div>
        <div className="col gap4">
          <div className="sf" style={{ fontSize: 28, lineHeight: 1 }}>
            {settings.name || 'You'}
          </div>
          {title && <div className="t14 gold">the {title}</div>}
          <div className="t13 q">
            Level {lv.level} · {fmtInt(lv.xp)} XP · {fmtInt(lv.next - lv.xp)} to level {lv.level + 1}
          </div>
        </div>
      </div>

      <div className="card" style={{ gap: 12 }}>
        <div className="lbl">Stats</div>
        {(Object.keys(STAT_NAMES) as (keyof CharStats)[]).map((k) => (
          <div key={k} className="col gap4">
            <div className="row base">
              <span className="t15">{STAT_NAMES[k].name}</span>
              <span className="num tn" style={{ fontSize: 18 }}>
                {stats[k]}
                <span className="t12 q"> / 20</span>
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${(stats[k] / 20) * 100}%`, background: 'var(--gold)' }} />
            </div>
            <span className="t12 q">{STAT_NAMES[k].what}</span>
          </div>
        ))}
        <div className="t12 d lh">XP comes from achievements, perfect days, sessions and check-ins. Stats follow the last few weeks, so they rise and fall with you.</div>
      </div>

      <div className="card" style={{ gap: 0 }}>
        <div className="lbl" style={{ paddingBottom: 6 }}>
          Titles
        </div>
        {TITLES.map((x) => {
          const open = x.unlocked(unlocked, lv.level);
          const on = settings.title === x.id && open;
          return (
            <button key={x.id} type="button" className="sess" style={{ minHeight: 50, opacity: open ? 1 : 0.5 }} disabled={!open} onClick={() => patchSettings({ title: on ? undefined : x.id })}>
              <span className="col gap2">
                <span className="t15">the {x.name}</span>
                <span className="t12 q">{x.how}</span>
              </span>
              {open ? on ? <span className="t13 gold">Wearing</span> : <span className="t13 q">Wear</span> : <Icon name="lock" size={16} color="var(--dim)" />}
            </button>
          );
        })}
      </div>

      <div className="card" style={{ gap: 12 }}>
        <div className="lbl">Rewards</div>
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
    </div>
  );
}
