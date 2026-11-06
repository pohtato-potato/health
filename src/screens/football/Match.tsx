// The match screen: plays a stored match from its timeline. Skip jumps to the stored result.
import { useEffect, useMemo, useRef, useState } from 'react';
import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
import { markWatched } from '../../football/store/save';
import { OWN } from '../../football/store/season';
import type { FbSave, StoredMatch } from '../../football/store/tables';
import type { ChanceEvent, Mod } from '../../football/types';
import { Art } from './Tonight';
import { Aurora } from './FootballHome';
import { AbilityBanner } from './match/AbilityBanner';
import { Bookend } from './match/Bookends';
import { GoalLineCaption } from './match/GoalLine';
import { Pitch, type PitchState } from './match/Pitch';
import { lengthOf, timeline, type Step } from './match/Replay';
import { Takeover } from './match/Takeover';
import { WAVE_NAMES } from './match/Shockwave';

export interface View {
  minute: number;
  score: [number, number];
  pitch: PitchState;
  phase?: { side: 'atk' | 'def'; type: string; minute: number };
  mods: Mod[];
  pct?: number;
  banner?: string;
  bookend?: Step['data']['bookend'];
  takeover?: { kind: 'screamer' | 'big'; minute: number };
  goalline?: { ok: boolean; decided: boolean };
  feed: { minute: number; text: string }[];
  done: boolean;
}

/** The screen's state after steps 0..i (pure, so skip and replay agree). */
export function viewAt(steps: Step[], chances: ChanceEvent[], i: number): View {
  const v: View = { minute: 0, score: [0, 0], pitch: { flying: false, zoom: false, save: false, resultKey: 0 }, mods: [], feed: [], done: false };
  for (let k = 0; k <= i && k < steps.length; k++) {
    const s = steps[k], c = chances[s.chance];
    if (s.kind !== 'goalline') v.goalline = undefined;
    if (s.kind === 'phase') v.takeover = undefined;
    switch (s.kind) {
      case 'phase':
        v.bookend = s.data.bookend; v.banner = undefined;
        if (s.data.score) v.score = s.data.score;
        if (s.data.minute !== undefined) v.minute = s.data.minute;
        if (c) { v.phase = { side: c.side, type: c.type, minute: c.minute }; v.mods = []; v.pct = undefined; v.pitch = { chance: c, flying: false, zoom: false, save: false, resultKey: k }; }
        break;
      case 'mod': v.bookend = undefined; v.mods = c?.mods ?? []; break;
      case 'pct': v.pct = c?.pct; break;
      case 'fly': v.pitch = { ...v.pitch, ball: s.data.land, flying: true, zoom: false, wave: undefined, save: false }; v.banner = undefined; break;
      case 'goalline': v.pitch = { ...v.pitch, zoom: true }; v.goalline = { ok: !!s.data.ok, decided: false }; break;
      case 'result':
        v.pitch = { ...v.pitch, flying: false, zoom: false, wave: s.data.wave, save: !!s.data.save, resultKey: k };
        if (s.data.score) v.score = s.data.score;
        if (s.data.takeover) v.takeover = { kind: s.data.takeover, minute: s.data.minute ?? v.minute };
        break;
      case 'banner': v.banner = s.data.text; break;
      case 'feed':
        if (s.data.text === 'end') v.done = true;
        else if (s.data.text) v.feed = [{ minute: s.data.minute ?? 0, text: s.data.text }, ...v.feed].slice(0, 3);
        break;
    }
  }
  return v;
}

function buzz(on: boolean, pattern: number | number[]) {
  if (on && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
}

export function MatchPlayer({ m, save, onEnd, at, paused = false }: { m: StoredMatch; save: FbSave; onEnd: () => void; at?: number; paused?: boolean }) {
  const steps = useMemo(() => timeline(m.events, !!m.big), [m]);
  const [i, setI] = useState(() => (at === undefined ? 0 : Math.max(0, steps.findLastIndex((x) => x.at <= at))));
  const start = useRef(0);
  useEffect(() => {
    start.current = performance.now() - steps[i]?.at;
    if (paused || i >= steps.length - 1) return;
    const wait = Math.max(0, steps[i + 1].at - (performance.now() - start.current));
    const t = setTimeout(() => setI((x) => x + 1), wait);
    return () => clearTimeout(t);
  }, [i, steps, paused]);
  const v = viewAt(steps, m.events.chances, i);
  const step = steps[i];
  useEffect(() => {
    if (step?.kind !== 'result') return;
    if (step.data.goal === 'for') buzz(save.buzz, [60, 40, 120]);
    else if (step.data.goal === 'against') buzz(save.buzz, 80);
  }, [step, save.buzz]);
  useEffect(() => { if (v.done) void markWatched(m.id); }, [v.done, m.id]);

  const opp = clubById(m.opp);
  const mineCrest = crestSvg(save.crest.step, save.crest.opt, 36);
  const left = m.braboHome ? 'Brabo United' : opp.name, right = m.braboHome ? opp.name : 'Brabo United';
  const shown: [number, number] = m.braboHome ? v.score : [v.score[1], v.score[0]];
  const wave = v.pitch.wave;
  return (
    <Aurora className={`fb-match ${v.phase?.side ?? ''}`}>
      <main className="fb-page fb-matchpage">
        <header className="fb-board" aria-live="off">
          <Art svg={m.braboHome ? mineCrest : clubCrest(opp, 36)} />
          <span className="fb-bmid">
            <b className="fb-num fb-bscore" aria-label={`${left} ${shown[0]}, ${right} ${shown[1]}`}>{shown[0]}–{shown[1]}</b>
            <span className="fb-num fb-minute">{v.minute}’</span>
          </span>
          <Art svg={m.braboHome ? clubCrest(opp, 36) : mineCrest} />
        </header>
        <p className="fb-s fb-ctr">{m.round ?? ''}</p>
        <div className="fb-stage">
          <Pitch s={v.pitch} />
          {v.goalline && <GoalLineCaption ok={v.goalline.ok} decided={false} side={v.phase?.side ?? 'atk'} />}
          {v.bookend && <Bookend kind={v.bookend} score={shown} home={left} away={right} />}
        </div>
        <section className="fb-call" aria-live="polite">
          {v.banner && <AbilityBanner text={v.banner} />}
          {v.phase && (
            <div className="fb-row">
              <span className={`fb-tag ${v.phase.side === 'atk' ? 'or' : 'pu'}`}>{v.phase.side === 'atk' ? 'You attack' : 'They attack'}</span>
              <span className="fb-s">{v.phase.minute}’ · {v.phase.type}</span>
            </div>
          )}
          {v.mods.length > 0 && (
            <ul className="fb-mods">
              {v.mods.slice(0, 4).map((x, k) => <li key={k} className={x.d >= 0 ? 'up' : 'down'}>{x.d > 0 ? '+' : ''}{x.d} {x.axis} · {x.why}</li>)}
              {v.mods.length > 4 && <li>+{v.mods.length - 4} more</li>}
            </ul>
          )}
          {v.pct !== undefined && <p className="fb-pct"><b className="fb-big">{v.pct}%</b><span className="fb-s">{v.phase?.side === 'atk' ? 'to score' : 'to stop it'}</span></p>}
          {wave && <p className="fb-s">{WAVE_NAMES[wave]}</p>}
        </section>
        <ol className="fb-feed" aria-label="Match feed">
          {v.feed.map((f, k) => <li key={`${f.minute}-${k}`}><span className="fb-num">{f.minute}’</span> {f.text}</li>)}
        </ol>
        <div className="fb-btns">
          {v.done
            ? <button type="button" className="fb-btn pri" onClick={onEnd}>Full time</button>
            : <button type="button" className="fb-btn" onClick={() => setI(steps.length - 1)}>Skip to the result</button>}
        </div>
        <p className="fb-s fb-ctr">{Math.round(lengthOf(steps) / 1000)} s match</p>
      </main>
      {v.takeover && <Takeover kind={v.takeover.kind} minute={v.takeover.minute} scorer="Brabo United" score={shown} />}
    </Aurora>
  );
}

export const homeAway = (m: StoredMatch) => (m.home === OWN ? 'home' : 'away');
