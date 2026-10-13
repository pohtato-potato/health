import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { statDeck, type Stat } from '../domain/shakeStats';
import { prefOn } from '../domain/types';
import { voiceFor, voiceLine } from '../domain/voice';
import { bump } from '../db/actions';
import { db } from '../db/db';
import { useSettings, useToday } from '../db/hooks';
import { go } from '../router';
import { isRestRunning } from '../state/restState';
import { Icon } from './Icon';
import { realSets } from '../domain/plan';

/** Opens a stat from anywhere: a button, or the phone being shaken. */
export function openShakeStat() {
  window.dispatchEvent(new Event('health:shake'));
}

/**
 * Shake the phone for a random stat from your own data. A shake is two sharp
 * jolts within about half a second. It also works from a button, for anyone
 * who'd rather not wave their phone around.
 */
export function ShakeStat() {
  const settings = useSettings();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const deck = useLiveQuery(async () => {
    const s = await db.settings.get('app');
    if (!s) return [];
    return statDeck({
      today,
      settings: s,
      days: await db.days.toArray(),
      entries: await db.entries.toArray(),
      sessions: await db.sessions.toArray(),
      sets: realSets(await db.sets.toArray()),
      measurements: await db.measurements.toArray(),
    });
  }, [today, open]);
  const last = useRef({ x: 0, y: 0, z: 0, jolts: [] as number[], cool: 0 });

  const trigger = useCallback(() => {
    if (document.querySelector('.moment, .sheet')) return;
    void bump('shake');
    if (isRestRunning()) void bump('shake-rest');
    setIndex((i) => i + 1 + Math.floor(Math.random() * 3));
    setOpen(true);
  }, []);

  useEffect(() => {
    const onManual = () => trigger();
    window.addEventListener('health:shake', onManual);
    return () => window.removeEventListener('health:shake', onManual);
  }, [trigger]);

  useEffect(() => {
    if (!settings || !prefOn(settings.prefs, 'shake')) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) return;
      const s = last.current;
      const delta = Math.abs(a.x - s.x) + Math.abs(a.y - s.y) + Math.abs(a.z - s.z);
      s.x = a.x;
      s.y = a.y;
      s.z = a.z;
      const now = Date.now();
      if (delta > 28 && now > s.cool) {
        s.jolts = [...s.jolts.filter((t) => now - t < 650), now];
        if (s.jolts.length >= 2) {
          s.jolts = [];
          s.cool = now + 1500;
          trigger();
        }
      }
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [settings, trigger]);

  if (!open || !settings || !deck) return null;
  const stat: Stat | undefined = deck.length ? deck[index % deck.length] : undefined;
  const v = voiceFor(settings.voice, prefOn(settings.prefs, 'shuffleVoices'), today);
  const lines: Record<typeof v, string> = {
    zen: 'A small fact, for perspective.',
    coach: 'NUMBERS DON’T LIE! Look at you go!',
    comm: 'And a statistic from the scorers’ box!',
    gremlin: "I don't make the rules. I just count them. Obsessively.",
  };

  return createPortal(
    <>
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="shake-card" role="dialog" aria-modal="true" aria-label="A stat">
        <div className="row" style={{ justifyContent: 'flex-start', gap: 12 }}>
          <svg className="jig" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--lavender)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="7" y="3" width="10" height="18" rx="2.5" />
            <path d="M11 18h2M3.5 8.5c-1 2-1 5 0 7M20.5 8.5c1 2 1 5 0 7" />
          </svg>
          <div className="lbl">Shake stat · {deck.length ? `${(index % deck.length) + 1} of ${deck.length}` : 'none yet'}</div>
          <button type="button" className="icon-btn" aria-label="Close" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)}>
            <Icon name="close" size={18} stroke={1.8} />
          </button>
        </div>
        {stat ? (
          <>
            <div className="sf" style={{ fontSize: 26, lineHeight: 1.2 }}>
              {stat.text}
            </div>
            {stat.sub && <div className="t15 q lh">{stat.sub}</div>}
          </>
        ) : (
          <div className="t15 q lh">Log a few days and this fills with facts about you.</div>
        )}
        <div className="voice" style={{ fontSize: 15 }}>
          {lines[v] ?? voiceLine(v, 'day', today)}
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn grow" onClick={() => trigger()}>
            Shake again
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setOpen(false);
              go('/tracks');
            }}
          >
            More stats
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
