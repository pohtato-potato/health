import { useMemo, useState } from 'react';
import { buildStats } from '../domain/achStats';
import { ACH_SETS, ACTIVE_ACHIEVEMENTS as ACHIEVEMENTS, CATEGORIES, fmtProgress, setProgress, text, type AchDef } from '../domain/achievements';
import { fmtDayMonth } from '../domain/format';
import { useToday } from '../db/hooks';
import { back } from '../router';
import { Icon } from '../ui/Icon';
import { TIER_COLOR, TIER_NAME } from '../ui/Moments';
import { useAchInput } from '../state/Achievements';

type Filter = 'all' | 'unlocked' | 'near' | 'secret';

/** The wall, Antimatter Dimensions style: every achievement as a cell, then the list. */
export function AchievementsPage() {
  const today = useToday();
  const input = useAchInput(today);
  const [filter, setFilter] = useState<Filter>('all');
  const stats = useMemo(() => (input ? buildStats(input) : undefined), [input]);
  if (!stats) return <div className="page bare" />;

  const got = (a: AchDef) => stats.unlocked.get(a.id);
  const unlocked = ACHIEVEMENTS.filter(got);
  const secretsFound = unlocked.filter((a) => a.cat === 'secret').length;
  const near = ACHIEVEMENTS.filter((a) => !got(a) && a.cat !== 'secret' && !a.soon && a.progress)
    .map((a) => {
      const [v, goal] = a.progress!(stats);
      return { a, v, goal, pct: goal > 0 ? Math.min(v / goal, 0.99) : 0 };
    })
    .filter((x) => x.pct >= 0.25)
    .sort((x, y) => y.pct - x.pct)
    .slice(0, 6);
  const recent = [...unlocked].sort((x, y) => got(y)!.at - got(x)!.at).slice(0, 5);
  // Secret hints unlock as you go: one per five achievements, the Konami code's first.
  const secrets = ACHIEVEMENTS.filter((a) => a.cat === 'secret');
  const hintsOpen = Math.floor(unlocked.length / 5);
  const lockedSecrets = secrets.filter((a) => !got(a)).sort((x, y) => Number(y.name === 'Konami code') - Number(x.name === 'Konami code'));
  const hinted = new Set(lockedSecrets.slice(0, hintsOpen).map((a) => a.id));
  const nextHintAt = (hintsOpen + 1) * 5;
  const lastSecret = [...unlocked].filter((a) => a.cat === 'secret').sort((x, y) => got(y)!.at - got(x)!.at)[0];

  const list = (defs: AchDef[]) =>
    defs.map((a) => {
      const u = got(a);
      const secretLocked = a.cat === 'secret' && !u;
      const p = !u && a.progress && !a.soon ? a.progress(stats) : undefined;
      return (
        <div key={a.id} className="col gap4" style={{ padding: '12px 0', borderTop: '1px solid var(--divider)', opacity: u ? 1 : 0.72 }}>
          <div className="row base">
            <b className="sf" style={{ fontWeight: 400, fontSize: 18, color: secretLocked ? 'var(--dim)' : undefined }}>
              {secretLocked ? '???' : a.name}
            </b>
            <span
              className="t11"
              style={{
                padding: '3px 8px',
                borderRadius: 10,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                color: u ? 'var(--ink)' : TIER_COLOR[a.tier],
                background: u ? (a.cat === 'secret' ? 'var(--lavender)' : TIER_COLOR[a.tier]) : 'transparent',
                border: u ? 0 : `1px solid ${TIER_COLOR[a.tier]}`,
              }}
            >
              {TIER_NAME[a.tier]}
            </span>
          </div>
          <span className="t13 q lh">
            {secretLocked ? (hinted.has(a.id) ? `Hint: ${a.hint}` : `A hint opens at ${nextHintAt} achievements.`) : text(a.desc, stats)}
            {u && !u.quiet ? ` ${fmtDayMonth(u.date)}.` : ''}
            {!u && a.soon ? ' Arrives with a later update.' : ''}
          </span>
          {u && a.reward && <span className="t12 gold">Unlocked: {a.reward}</span>}
          {p && p[0] > 0 && (
            <div className="row" style={{ gap: 10 }}>
              <div className="bar grow">
                <i style={{ width: `${Math.min(p[0] / p[1], 1) * 100}%`, background: TIER_COLOR[a.tier] }} />
              </div>
              <span className="t12 q tn">{fmtProgress(p)}</span>
            </div>
          )}
        </div>
      );
    });

  const shown = (a: AchDef) =>
    filter === 'all' ? true : filter === 'unlocked' ? !!got(a) : filter === 'secret' ? a.cat === 'secret' : false;

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/journey')}>
        <Icon name="left" size={20} stroke={1.8} />
        Journey
      </button>
      <div className="col gap6">
        <h1 className="h1" style={{ fontSize: 32 }}>
          Achievements
        </h1>
        <div className="t15">
          <span className="sf" style={{ fontSize: 22 }}>
            {unlocked.length}
          </span>{' '}
          <span className="q">
            of {ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="t13 lavender">
          Secrets {secretsFound} of {secrets.length} · hints unlock as you go
        </div>
      </div>

      <div className="card" style={{ padding: 14, gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12px, 1fr))', gap: 4 }} aria-label={`${unlocked.length} of ${ACHIEVEMENTS.length} unlocked`} role="img">
          {ACHIEVEMENTS.map((a) => {
            const u = got(a);
            const color = a.cat === 'secret' ? 'var(--lavender)' : TIER_COLOR[a.tier];
            return <div key={a.id} style={{ aspectRatio: '1', borderRadius: 2, background: u ? color : 'transparent', border: u ? 0 : '1px solid var(--hairline)' }} />;
          })}
        </div>
        <div className="row t11 q" style={{ flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'flex-start' }}>
          {(['b', 's', 'g', 'p'] as const).map((t) => (
            <span key={t} className="row" style={{ gap: 5 }}>
              <i style={{ width: 9, height: 9, borderRadius: 2, background: TIER_COLOR[t] }} />
              {TIER_NAME[t]}
            </span>
          ))}
          <span className="row" style={{ gap: 5 }}>
            <i style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--lavender)' }} />
            Secret found
          </span>
        </div>
      </div>

      <div className="row" style={{ gap: 8, overflowX: 'auto', justifyContent: 'flex-start' }}>
        {(
          [
            ['all', 'All'],
            ['unlocked', `Unlocked · ${unlocked.length}`],
            ['near', 'Nearly there'],
            ['secret', 'Secret'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" className={`chip sm${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {(filter === 'all' || filter === 'near') && near.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Nearly there
          </div>
          {near.map(({ a, v, goal, pct }) => (
            <div key={a.id} className="col gap6" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
              <div className="row base">
                <b className="sf" style={{ fontWeight: 400, fontSize: 17 }}>
                  {a.name}
                </b>
                <span className="t12 q">{Math.floor(pct * 100)}%</span>
              </div>
              <div className="bar" style={{ height: 6 }}>
                <i style={{ width: `${pct * 100}%`, background: TIER_COLOR[a.tier] }} />
              </div>
              <span className="t13 q">
                {text(a.desc, stats)} {fmtProgress([v, goal])}.
              </span>
            </div>
          ))}
        </div>
      )}
      {filter === 'all' && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Sets
          </div>
          {ACH_SETS.map((set) => {
            const p = setProgress(set, new Set(unlocked.map((a) => a.id)));
            return (
              <div key={set.id} className="col gap6" style={{ padding: '10px 0', borderTop: '1px solid var(--divider)' }}>
                <div className="row base">
                  <b className="sf" style={{ fontWeight: 400, fontSize: 17 }}>
                    {set.name}
                  </b>
                  <span className={`t12 ${p.complete ? 'gold' : 'q'}`}>
                    {p.done} of {p.total}
                  </span>
                </div>
                <div className="bar" style={{ height: 6 }}>
                  <i style={{ width: `${(p.done / p.total) * 100}%`, background: p.complete ? 'var(--gold)' : 'var(--lavender)' }} />
                </div>
                <span className="t13 q">{p.complete ? `Finished: ${set.unlocks} is yours.` : `Finish it for ${set.unlocks}.`}</span>
              </div>
            );
          })}
        </div>
      )}
      {filter === 'near' && near.length === 0 && <div className="t14 q">Nothing close yet. Keep logging and this fills up.</div>}

      {filter === 'all' && recent.length > 0 && (
        <div className="card" style={{ gap: 0 }}>
          <div className="lbl" style={{ paddingBottom: 6 }}>
            Recently unlocked
          </div>
          {list(recent)}
        </div>
      )}

      {filter === 'all' && lastSecret && (
        <div className="card" style={{ borderColor: 'var(--lav-border)', background: 'var(--lav-bg)' }}>
          <div className="lbl lav">Secret found</div>
          <div className="sf" style={{ fontSize: 24 }}>
            {lastSecret.name}
          </div>
          <div className="t14 q">{text(lastSecret.desc, stats)}</div>
        </div>
      )}

      {filter !== 'near' &&
        CATEGORIES.map((c) => {
          const defs = ACHIEVEMENTS.filter((a) => a.cat === c.id && shown(a));
          if (!defs.length) return null;
          const n = ACHIEVEMENTS.filter((a) => a.cat === c.id && got(a)).length;
          const total = ACHIEVEMENTS.filter((a) => a.cat === c.id).length;
          return (
            <div key={c.id} className="card" style={{ gap: 0 }}>
              <div className="row" style={{ paddingBottom: 6 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Icon name={c.icon} size={18} color="var(--quiet)" />
                  <div className="lbl">{c.name}</div>
                </div>
                <div className="t12 q">
                  {n} of {total}
                </div>
              </div>
              {list(defs)}
            </div>
          );
        })}
    </div>
  );
}
