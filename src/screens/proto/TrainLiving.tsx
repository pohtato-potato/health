import { useState } from 'react';
import { go, useRoute } from '../../router';
import { Field } from './SessionLiving';

/**
 * Design prototype (sample numbers from Sanyam's own October log; nothing is read or saved):
 * the Train tab in the same living-colour style as the session. Two states: before tonight's
 * session, and after it.
 */

const MUSCLES = [
  { name: 'Shoulders', sets: 14, lo: 10, hi: 16 },
  { name: 'Back', sets: 12, lo: 10, hi: 16 },
  { name: 'Chest', sets: 8, lo: 8, hi: 12 },
  { name: 'Arms', sets: 16, lo: 8, hi: 14 },
  { name: 'Legs', sets: 5, lo: 10, hi: 16 },
  { name: 'Core', sets: 4, lo: 4, hi: 8 },
];
const RECORDS = [
  { ex: 'Romanian deadlift', what: '10 kg × 19', when: 'tonight' },
  { ex: 'Lean-away lateral · left', what: '5 kg × 17', when: 'tonight' },
  { ex: 'Pullover', what: '10 kg × 12', when: '20 Oct' },
];
const CARDS = [
  { ex: 'Romanian deadlift', tier: 'Plated', next: '20 reps at 10 kg for Mastery' },
  { ex: 'Lean-away lateral', tier: 'Even', next: 'Right side to 17 for Plated' },
  { ex: 'One-arm row', tier: 'Clean', next: 'Left and right within 1 rep' },
  { ex: 'Hammer curl', tier: 'First light', next: 'Every check ticked once' },
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

          <div className="lc-card">
            <div className="tr-cardhead">
              <span className="lc-card-h">This week, hard sets by muscle</span>
              <span className="lc-small">against the plan</span>
            </div>
            {MUSCLES.map((m) => {
              const under = m.sets < m.lo;
              const over = m.sets > m.hi;
              return (
                <div key={m.name} className="tr-musc">
                  <span className="tr-musc-name">{m.name}</span>
                  <span className="tr-bar">
                    <i className="band" style={{ left: `${(m.lo / 20) * 100}%`, width: `${((m.hi - m.lo) / 20) * 100}%` }} />
                    <i className={`fill${under ? ' under' : over ? ' over' : ''}`} style={{ width: `${Math.min(1, m.sets / 20) * 100}%` }} />
                  </span>
                  <span className="num tn tr-musc-n">{m.sets}</span>
                  {under && <span className="lc-tag slip">low</span>}
                  {over && <span className="lc-tag burn">high</span>}
                </div>
              );
            })}
            <p className="lc-small">Legs are at a third of arms this week. Session C's split squats and calf raises will close most of the gap.</p>
          </div>

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
              <span className="lc-small">29 exercises · 4 shown</span>
            </div>
            <div className="tr-cards">
              {CARDS.map((c) => (
                <div key={c.ex} className={`tr-excard t-${c.tier.toLowerCase().replace(' ', '-')}`}>
                  <span className="tr-tier">{c.tier}</span>
                  <span className="tr-excard-name">{c.ex}</span>
                  <span className="tr-excard-next">Next: {c.next}</span>
                </div>
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
      <div className="tr-blocks" aria-label="Load blocks">
        <span className="b10">10 kg · RDL, goblet squat, push-up</span>
        <span className="b5">5 kg · laterals, skull crusher, fly</span>
        <span className="b10">10 kg · calf raise, plank</span>
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
