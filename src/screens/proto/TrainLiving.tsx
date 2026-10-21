import { useState } from 'react';
import { go, useRoute } from '../../router';
import { Field } from './SessionLiving';
import { BodyHeat } from '../../ui/BodyMap';
import type { MuscleId } from '../../domain/types';

/**
 * Design prototype (sample numbers from Sanyam's own October log; nothing is read or saved):
 * the Train tab in the same living-colour style as the session. Two states: before tonight's
 * session, and after it.
 */

const MUSCLES: { name: string; sets: number; lo: number; hi: number; ids: MuscleId[] }[] = [
  { name: 'Shoulders', sets: 14, lo: 10, hi: 16, ids: ['front-delts', 'side-delts', 'rear-delts'] },
  { name: 'Back', sets: 12, lo: 10, hi: 16, ids: ['upper-back', 'lats'] },
  { name: 'Chest', sets: 8, lo: 8, hi: 12, ids: ['chest'] },
  { name: 'Arms', sets: 16, lo: 8, hi: 14, ids: ['biceps', 'triceps', 'forearms'] },
  { name: 'Legs', sets: 5, lo: 10, hi: 16, ids: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { name: 'Core', sets: 4, lo: 4, hi: 8, ids: ['abs'] },
];
const SESSION_C = [
  { block: '10 kg', items: [['1', 'Romanian deadlift', '3 × 8–12'], ['2', 'Goblet box squat', '3 × 10–15'], ['3', 'Incline push-up', '3 × 8–15']] },
  { block: '5 kg', change: true, items: [['4', 'Lean-away lateral raise', '3 × 12–20 each side'], ['5a', 'Skull crusher', '3 × 10–15'], ['5b', 'Floor fly', '2 × 12–15']] },
  { block: '10 kg', change: true, items: [['6', 'Single-leg calf raise', '2 × 12–20 each side'], ['7', 'Forearm plank', '3 × 20–45 s']] },
];
const RECORDS = [
  { ex: 'Romanian deadlift', what: '10 kg × 19', when: 'tonight' },
  { ex: 'Lean-away lateral · left', what: '5 kg × 17', when: 'tonight' },
  { ex: 'Pullover', what: '10 kg × 12', when: '20 Oct' },
];
const CARDS = [
  { ex: 'Romanian deadlift', pose: 'rdl', tier: 'Mastery', next: 'Mastered at 10 kg · 12.5 kg opens a new plate' },
  { ex: 'Lean-away lateral', pose: 'lateral', tier: 'Plated', next: 'Every check, 10 sets running, for Mastery' },
  { ex: 'One-arm row', pose: 'row', tier: 'Even', next: '12.5 kg for Plated' },
  { ex: 'Hammer curl', pose: 'curl', tier: 'Clean', next: 'Left and right within 1 rep for Even' },
  { ex: 'Skull crusher', pose: 'skull', tier: 'First light', next: 'Every check ticked once for Clean' },
];
const RECENT = [
  { day: 'Tue 20 Oct', s: 'Session B', mins: 90, sets: 26, recs: 2, later: false },
  { day: 'Sat 18 Oct', s: 'Session A (old plan)', mins: 89, sets: 22, recs: 0, later: false },
  { day: 'Fri 17 Oct', s: 'Session B (old plan)', mins: 105, sets: 30, recs: 1, later: false },
  { day: 'Sun 28 Sep', s: 'Session A (old plan)', mins: 0, sets: 28, recs: 0, later: true },
];

export function TrainProto() {
  const { params } = useRoute();
  const [after, setAfter] = useState(params.get('state') === 'after');
  return (
    <div className={`lc look-aurora th-dusk ${after ? 'st-record' : 'st-calm'} tr`}>
      <Field />
      <div className="lc-dev" aria-label="Prototype controls">
        <div className="lc-dev-row">
          <button type="button" className={!after ? 'on' : ''} onClick={() => setAfter(false)}>
            Before tonight's session
          </button>
          <button type="button" className={after ? 'on' : ''} onClick={() => setAfter(true)}>
            After it
          </button>
        </div>
      </div>
      <div className="lc-body">
        <section className="lc-scroll" style={{ paddingTop: 8 }}>
          <header className="tr-head">
            <h1 className="lc-h1">Train</h1>
            <div className="tr-week" aria-label={`${after ? 3 : 2} of 4 sessions this week`}>
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className={i < (after ? 3 : 2) ? 'on' : ''} />
              ))}
              <span>{after ? 3 : 2} of 4 this week</span>
            </div>
          </header>

          {after ? <Tonight /> : <UpNext />}

          <div className="lc-card">
            <div className="tr-cardhead">
              <span className="lc-card-h">You, four weeks ago</span>
              <span className="lc-small">Session C · 23 Sep → {after ? 'tonight' : 'last time'}</span>
            </div>
            {[
              ['Romanian deadlift', '10 × 14', '10 × 19'],
              ['Goblet squat', '10 × 12', '10 × 15'],
              ['Lean-away lateral', '5 × 12', '5 × 17'],
            ].map(([ex, then, now]) => (
              <div key={ex} className="lc-row">
                <span className="grow">{ex}</span>
                <span className="q num tn">{then}</span>
                <span className="tr-arrow">→</span>
                <span className="num tn tr-up">{now}</span>
              </div>
            ))}
          </div>

          <BodyCard />

          <div className="lc-card">
            <div className="tr-cardhead">
              <span className="lc-card-h">Records</span>
              <button type="button" className="lc-link" style={{ minHeight: 32 }}>
                All 23 ›
              </button>
            </div>
            {RECORDS.map((r) => (
              <div key={r.ex} className="tr-rec">
                <span className="grow">
                  <span className="tr-rec-what goldtxt num tn">{r.what}</span>
                  <span className="lc-small">{r.ex}</span>
                </span>
                <span className="lc-tag gold">{r.when}</span>
              </div>
            ))}
          </div>

          <div className="lc-card">
            <div className="tr-cardhead">
              <span className="lc-card-h">Your cards</span>
              <span className="lc-small">29 exercises · 1 mastered</span>
            </div>
            <div className="tr-cards">
              {CARDS.map((c) => (
                <ExerciseCard key={c.ex} name={c.ex} pose={c.pose as Pose} tier={c.tier as Tier} next={c.next} />
              ))}
            </div>
          </div>

          <div className="lc-card tr-month">
            <div className="tr-cardhead">
              <span className="lc-card-h">October so far</span>
              <span className="lc-small">full report on 1 Nov</span>
            </div>
            <div className="tr-stats">
              <span>
                <b className="num tn">{after ? 14 : 13}</b>
                <small>sessions</small>
              </span>
              <span>
                <b className="num tn">{after ? 23 : 21}</b>
                <small>records</small>
              </span>
              <span>
                <b className="num tn">94</b>
                <small>min, usual session</small>
              </span>
            </div>
            <p className="lc-small">Most improved: reverse curl, up 40% since 1 Oct.</p>
          </div>

          <div className="lc-card">
            <div className="lc-card-h">Recent sessions</div>
            {RECENT.map((r) => (
              <div key={r.day} className="lc-row tr-recent">
                <span className="grow">
                  <span>{r.s}</span>
                  <span className="lc-small">
                    {r.day} · {r.later ? 'logged later' : `${r.mins} min`} · {r.sets} sets
                  </span>
                </span>
                {r.recs > 0 && <span className="lc-tag gold">{r.recs} record{r.recs === 1 ? '' : 's'}</span>}
                <span className="q">›</span>
              </div>
            ))}
          </div>

          <button type="button" className="lc-card tr-plan" onClick={() => go('/plan')}>
            <span className="lc-card-h">The plan</span>
            <span className="tr-plan-name">Home 4-way: lean first, V-taper</span>
            <span className="lc-small">A · B · C · D · version 1, since 20 Oct · history and warm-up ›</span>
          </button>
        </section>
      </div>
    </div>
  );
}

function UpNext() {
  return (
    <div className="lc-card tr-hero">
      <span className="lc-kicker">Up next · tonight</span>
      <span className="tr-hero-title">Session C</span>
      <span className="lc-small">
        RDL first · usually <b>92 min</b> · one plate change, 10 → 5 kg
      </span>
      <div className="tr-hero-chips">
        <span className="lc-tag ok">2 ready to go heavier</span>
        <span className="lc-tag">form focus: head in line</span>
      </div>
      <div className="tr-plan-list" aria-label="Tonight's whole plan">
        {SESSION_C.map((b, i) => (
          <div key={i} className={`tr-block ${b.block === '5 kg' ? 'b5' : 'b10'}`}>
            {b.change && <div className="tr-change">Plates change → {b.block}</div>}
            {b.items.map(([id, name, target]) => (
              <div key={id} className="tr-plan-row">
                <span className="num tn tr-plan-id">{id}</span>
                <span className="grow">{name}</span>
                <span className="lc-small">{target}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="lc-actions">
        <button type="button" className="lc-ghost">
          30 min
        </button>
        <button type="button" className="lc-primary" onClick={() => go('/proto/session')}>
          Start Session C
        </button>
      </div>
    </div>
  );
}

function Tonight() {
  return (
    <div className="lc-card tr-hero tr-tonight">
      <span className="lc-kicker gold">Tonight · Session C</span>
      <span className="tr-hero-title goldtxt">2 records</span>
      <span className="lc-small">
        88 min · 26 sets · <b>33 min lifting</b> · quality 89
      </span>
      <div className="tr-hero-chips">
        <span className="lc-tag gold">RDL 10 × 19</span>
        <span className="lc-tag gold">Lean-away L 5 × 17</span>
        <span className="lc-tag ok">78% of checks went well</span>
      </div>
      <p className="lc-small">Next is Session D on Saturday: rows, laterals and the farmer carry.</p>
      <button type="button" className="lc-primary tr-replay">
        Replay tonight's finale
      </button>
    </div>
  );
}

/** This week on the body: front and back, lit by hard sets, beside each group's count against the plan. */
function BodyCard() {
  const heat: Partial<Record<MuscleId, number>> = {};
  const tint: Partial<Record<MuscleId, string>> = {};
  for (const m of MUSCLES)
    for (const id of m.ids) {
      heat[id] = m.sets < m.lo ? 0.55 : 0.85;
      tint[id] = m.sets < m.lo ? '#ff9f80' : m.sets > m.hi ? '#7fc4f0' : '#6fe0b0';
    }
  return (
    <div className="lc-card">
      <div className="tr-cardhead">
        <span className="lc-card-h">This week on your body</span>
        <span className="lc-small">hard sets against the plan</span>
      </div>
      <div className="tr-body">
        <span className="tr-body-fig">
          <BodyHeat heat={heat} tint={tint} label="Hard sets this week, front and back: green on target, coral low, blue high" />
        </span>
        <span className="tr-legend">
          <span className="ok">on target</span>
          <span className="low">low</span>
          <span className="high">high</span>
        </span>
        <span className="tr-body-list">
          {MUSCLES.map((m) => {
            const st = m.sets < m.lo ? 'low' : m.sets > m.hi ? 'high' : 'ok';
            return (
              <span key={m.name} className={`tr-body-row ${st}`}>
                <span className="grow">{m.name}</span>
                <b className="num tn">{m.sets}</b>
                <span className="lc-small">
                  /{m.lo}–{m.hi}
                </span>
                <span className="tr-mark">{st === 'ok' ? '\u2713' : st}</span>
              </span>
            );
          })}
        </span>
      </div>
      <p className="lc-small">Legs are at a third of arms this week. Session C's squats and calf raises close most of the gap.</p>
    </div>
  );
}

type Pose = 'rdl' | 'lateral' | 'row' | 'curl' | 'skull';
type Tier = 'First light' | 'Clean' | 'Even' | 'Plated' | 'Mastery';
type Pt = [number, number];

/** Each exercise as the constellation of its own pose: joints are stars, limbs the lines between them. */
const POSES: Record<Pose, { stars: Pt[]; lines: [number, number][]; pair?: [number, number][] }> = {
  // head, shoulder, elbow, hand, hip, knee, ankle — a hip hinge seen from the side
  rdl: { stars: [[30, 30], [38, 42], [42, 60], [44, 78], [64, 52], [66, 82], [64, 112], [74, 112]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5], [5, 6], [6, 7]] },
  // standing, one arm on the door frame, the other raised out to the side
  lateral: { stars: [[46, 22], [38, 36], [56, 36], [24, 44], [14, 50], [72, 36], [86, 34], [44, 70], [42, 94], [40, 118], [52, 94], [54, 118]], lines: [[0, 1], [0, 2], [1, 3], [3, 4], [2, 5], [5, 6], [1, 7], [2, 7], [7, 8], [8, 9], [7, 10], [10, 11]], pair: [[3, 5], [4, 6]] },
  // bent over a bench, one hand braced, the other rowing to the hip
  row: { stars: [[24, 44], [34, 50], [36, 70], [36, 88], [52, 48], [56, 66], [70, 50], [72, 80], [72, 110], [84, 76]], lines: [[0, 1], [1, 2], [2, 3], [1, 6], [4, 5], [6, 7], [7, 8], [6, 9]], pair: [[2, 5]] },
  // standing front-on, both forearms up in a hammer curl
  curl: { stars: [[50, 20], [38, 34], [62, 34], [36, 58], [64, 58], [42, 44], [58, 44], [44, 72], [56, 72], [44, 96], [56, 96], [44, 120], [56, 120]], lines: [[0, 1], [0, 2], [1, 3], [3, 5], [2, 4], [4, 6], [1, 7], [2, 8], [7, 8], [7, 9], [9, 11], [8, 10], [10, 12]], pair: [[3, 4], [5, 6]] },
  // lying back, arms up, forearms folded back over the face
  skull: { stars: [[18, 84], [30, 82], [66, 84], [82, 100], [86, 120], [34, 48], [22, 40], [40, 46]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [5, 6], [1, 7]] },
};

function seeded(n: number, seed: number): Pt[] {
  let x = seed;
  const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => [r() * 100, r() * 130]);
}

function ExerciseCard({ name, pose, tier, next }: { name: string; pose: Pose; tier: Tier; next: string }) {
  const p = POSES[pose];
  const lit = tier !== 'First light';
  const even = tier === 'Even' || tier === 'Plated' || tier === 'Mastery';
  const field = seeded(26, name.length * 97 + pose.length);
  const id = `g-${pose}`;
  return (
    <div className={`tr-excard t-${tier.toLowerCase().replace(' ', '-')}`}>
      <svg viewBox="0 0 100 130" className="tr-sky" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <pattern id={`${id}-guil`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
            <circle cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
            <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
          </pattern>
        </defs>
        {(tier === 'Plated' || tier === 'Mastery') && <rect x="0" y="0" width="100" height="130" fill={`url(#${id}-guil)`} className="tr-guil" />}
        {field.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 5 === 0 ? 0.7 : 0.4} className="tr-field" />
        ))}
        {lit && p.lines.map(([a, b], i) => <line key={i} x1={p.stars[a][0]} y1={p.stars[a][1]} x2={p.stars[b][0]} y2={p.stars[b][1]} className="tr-line" />)}
        {even && p.pair?.map(([a, b], i) => <line key={`p${i}`} x1={p.stars[a][0]} y1={p.stars[a][1]} x2={p.stars[b][0]} y2={p.stars[b][1]} className="tr-pair" />)}
        {p.stars.map(([x, y], i) => (
          <g key={i}>
            {lit && <circle cx={x} cy={y} r="6" fill={`url(#${id}-glow)`} className="tr-halo" />}
            <circle cx={x} cy={y} r={lit ? 2 : 1.4} className="tr-star" />
          </g>
        ))}
      </svg>
      <span className="tr-tier">{tier}</span>
      <span className="tr-excard-name">{name}</span>
      <span className="tr-excard-next">{next}</span>
    </div>
  );
}
