import { useEffect, useRef, useState, type ReactNode } from 'react';
import { go, useRoute } from '../../router';
import { Aurora } from '../../ui/live/Aurora';
import { Rings } from '../../ui/Rings';
import { ThemedRings } from '../../ui/rings/ThemedRings';
import { Scene } from '../../walk/art/scene';
import { landmarkFor } from '../../walk/art/landmarks';
import { positionAt } from '../../domain/walk';
import { regionAt } from '../../domain/regions';
import type { PartOfDay } from '../../domain/dates';
import '../../styles/today-proto.css';

/**
 * Design prototype (made-up sample numbers; nothing is read or saved):
 * Today in the living-colour style, with a dev strip for the time of day, the moments,
 * and the page shapes pinned on the Today pinboard. Every state is also a URL parameter
 * (time, moment, shape, rings, detail, open, dev=0) so screenshots can be taken directly.
 */

type Time = 'morning' | 'afternoon' | 'evening' | 'closed';
type Moment = 'none' | 'ring' | 'perfect' | 'record' | 'arrival' | 'theme' | 'sick';
type Shape = 'glance' | 'log';
type RingsLook = 'headline' | 'stages';
type Detail = 'drawer' | 'page';
type Open = 'none' | 'detail' | 'walk' | 'reveal';

const TIMES: [Time, string][] = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening'], ['closed', 'After close']];
const MOMENTS: [Moment, string][] = [['none', 'No moment'], ['ring', 'Ring closed'], ['perfect', 'Perfect day'], ['record', 'Record night'], ['arrival', 'Walk arrival'], ['theme', 'Theme day'], ['sick', 'Sick day']];
const PART: Record<Time, PartOfDay> = { morning: 'dawn', afternoon: 'day', evening: 'dusk', closed: 'night' };
const CLOCK: Record<Time, string> = { morning: '7:40', afternoon: '14:10', evening: '21:30', closed: '23:50' };

/** Targets are invented for the prototype. */
const KCAL = [1800, 2000];
const PROTEIN = 120;
const STEPS = 8000;
const WALK_KM = 214;

type Totals = { kcal: number; protein: number; steps: number };
const TOTALS: Record<Time, Totals> = {
  morning: { kcal: 310, protein: 21, steps: 1240 },
  afternoon: { kcal: 1060, protein: 58, steps: 4120 },
  evening: { kcal: 1640, protein: 98, steps: 7310 },
  closed: { kcal: 1880, protein: 112, steps: 8460 },
};

function totalsFor(time: Time, moment: Moment): Totals {
  const t = TOTALS[time];
  if (moment === 'perfect') return { kcal: 1910, protein: 124, steps: 8650 };
  if (moment === 'ring') return { ...t, protein: Math.max(t.protein, 121) };
  return t;
}

const rings = (t: Totals, eased: boolean) => {
  const stepsGoal = eased ? 4000 : STEPS;
  return [
    { key: 'kcal', name: 'Calories', ink: 'var(--apricot)', value: t.kcal.toLocaleString('en-IN'), unit: 'kcal', target: `of ${KCAL[0].toLocaleString('en-IN')}–${KCAL[1].toLocaleString('en-IN')}`, p: t.kcal / KCAL[0], closed: t.kcal >= KCAL[0] && t.kcal <= KCAL[1] },
    { key: 'protein', name: 'Protein', ink: 'var(--lavender)', value: `${t.protein}\u00a0g`, unit: 'protein', target: `of ${PROTEIN} g`, p: t.protein / PROTEIN, closed: t.protein >= PROTEIN },
    { key: 'steps', name: 'Steps', ink: 'var(--sage)', value: t.steps.toLocaleString('en-IN'), unit: 'steps', target: `${eased ? 'eased ' : 'of '}${stepsGoal.toLocaleString('en-IN')}`, p: t.steps / stepsGoal, closed: t.steps >= stepsGoal },
  ];
};

/** Zero's named stages: what the ring has reached, in words. */
const stage = (p: number, closed: boolean) => (closed ? 'closed' : p >= 0.85 ? 'nearly' : p >= 0.5 ? 'past halfway' : p >= 0.25 ? 'underway' : 'starting');

export function TodayProto() {
  const { params } = useRoute();
  const pick = <T extends string>(k: string, all: readonly T[], d: T): T => {
    const v = params.get(k) as T | null;
    return v && all.includes(v) ? v : d;
  };
  const [time, setTime] = useState<Time>(pick('time', TIMES.map((t) => t[0]), 'afternoon'));
  const [moment, setMoment] = useState<Moment>(pick('moment', MOMENTS.map((m) => m[0]), 'none'));
  const [shape, setShape] = useState<Shape>(pick('shape', ['glance', 'log'] as const, 'glance'));
  const [look, setLook] = useState<RingsLook>(pick('rings', ['headline', 'stages'] as const, 'headline'));
  const [detail, setDetail] = useState<Detail>(pick('detail', ['drawer', 'page'] as const, 'drawer'));
  const [open, setOpen] = useState<Open>(pick('open', ['none', 'detail', 'walk', 'reveal'] as const, moment === 'arrival' ? 'walk' : 'none'));
  const [toast, setToast] = useState<string | null>(null);
  const dev = params.get('dev') !== '0';
  const scrollTo = params.get('scroll');
  const scroller = useRef<HTMLElement>(null);
  useEffect(() => {
    if (scrollTo && scroller.current) scroller.current.scrollTop = scrollTo === 'end' ? scroller.current.scrollHeight : Number(scrollTo);
  }, [scrollTo, shape]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const sick = moment === 'sick';
  const t = totalsFor(time, moment);
  const rs = rings(t, sick);
  const closedN = rs.filter((r) => r.closed).length;
  const perfect = closedN === 3;
  const theme = moment === 'theme';
  const record = moment === 'record';
  const morningOpen = time !== 'closed' && moment !== 'perfect';

  return (
    <div className={`lv td tm-${time} mo-${moment}${perfect ? ' is-perfect' : ''}`}>
      <Aurora />
      <Sky time={time} moment={moment} />
      {dev && (
        <div className="lc-dev td-dev" aria-label="Prototype controls">
          <div className="lc-dev-row">
            {TIMES.map(([id, label]) => (
              <button key={id} type="button" className={time === id ? 'on' : ''} onClick={() => setTime(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="lc-dev-row">
            {MOMENTS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={moment === id ? 'on' : ''}
                onClick={() => {
                  setMoment(id);
                  setOpen(id === 'arrival' ? 'walk' : 'none');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="lc-dev-row">
            <button type="button" className={shape === 'glance' ? 'on' : ''} onClick={() => setShape('glance')}>
              Glance
            </button>
            <button type="button" className={shape === 'log' ? 'on' : ''} onClick={() => setShape('log')}>
              Glance + log
            </button>
            <span className="lc-dev-sep" />
            <button type="button" className={look === 'headline' ? 'on' : ''} onClick={() => setLook('headline')}>
              Rings
            </button>
            <button type="button" className={look === 'stages' ? 'on' : ''} onClick={() => setLook('stages')}>
              Rings + stages
            </button>
            <span className="lc-dev-sep" />
            <button type="button" className={detail === 'drawer' ? 'on' : ''} onClick={() => setDetail('drawer')}>
              Drawer
            </button>
            <button type="button" className={detail === 'page' ? 'on' : ''} onClick={() => setDetail('page')}>
              Page
            </button>
          </div>
        </div>
      )}

      <div className="lc-body">
        <section className="td-scroll" ref={scroller}>
          <WalkBand time={time} sick={sick} onOpen={() => setOpen('walk')} />

          <Headline time={time} moment={moment} closedN={closedN} />

          {morningOpen && time !== 'morning' && (
            <button type="button" className="td-banner" onClick={() => setOpen('reveal')}>
              <span className="grow">
                <b>Morning log still open</b>
                <span className="td-small">Weight and sleep · tap to log</span>
              </span>
              <span className="td-go">Log ›</span>
            </button>
          )}

          {theme && <ThemeCard />}

          <RingsCard rs={rs} look={look} theme={theme} perfect={perfect} closedN={closedN} time={time} onToast={setToast} />

          {record ? <Records /> : <MomentSlot time={time} moment={moment} onReveal={() => setOpen('reveal')} onToast={setToast} />}

          {!record && <NextUp time={time} sick={sick} />}

          <div className="td-card td-occasion">
            <span className="td-kicker">Coming up</span>
            <span className="td-occ-title">Diwali in 18 days</span>
            <span className="td-small">Occasion mode can hold the rings steady for the festival week.</span>
          </div>

          {shape === 'log' && <LogBelow onToast={setToast} time={time} />}

          <button type="button" className="td-detail-row" onClick={() => setOpen('detail')}>
            <span className="grow">
              <b>Today in detail</b>
              <span className="td-small">Today's line, readiness, protein, place and status, Close the day</span>
            </span>
            <span aria-hidden="true">{detail === 'drawer' ? '⌃' : '›'}</span>
          </button>
        </section>
      </div>

      {open === 'detail' && <DetailHome kind={detail} time={time} moment={moment} onClose={() => setOpen('none')} />}
      {open === 'walk' && <WalkFull arrival={moment === 'arrival'} time={time} sick={sick} onClose={() => setOpen('none')} />}
      {open === 'reveal' && <Reveal onClose={() => setOpen('none')} />}
      {toast && (
        <div className="td-toast" role="status">
          <span className="grow">{toast}</span>
          <button type="button" onClick={() => setToast(null)}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- the sky: moments painted into the aurora ---------- */

function Sky({ time, moment }: { time: Time; moment: Moment }) {
  return (
    <div className="td-sky" aria-hidden="true">
      {time === 'closed' && Array.from({ length: 9 }, (_, i) => <i key={i} className="td-star" style={{ left: `${8 + ((i * 37) % 84)}%`, top: `${6 + ((i * 23) % 40)}%`, animationDelay: `${i * 0.4}s` }} />)}
      {moment === 'ring' && <i className="td-ripple" />}
      {moment === 'perfect' && (
        <>
          <i className="td-bloom k" />
          <i className="td-bloom p" />
          <i className="td-bloom s" />
        </>
      )}
      {moment === 'record' && <i className="td-burn" />}
      {moment === 'theme' && [0, 1, 2].map((i) => <i key={i} className="td-meteor" style={{ animationDelay: `${i * 2.3}s`, top: `${4 + i * 9}%`, left: `${30 + i * 22}%` }} />)}
    </div>
  );
}

/* ---------- the walk scene, sharing the page's sky ---------- */

function walkAt(km: number) {
  const pos = positionAt(km);
  const ahead = pos.to ?? pos.from;
  const lm = landmarkFor(ahead.name);
  const toNext = pos.to ? Math.round(pos.to.km - km) : 0;
  return { pos, ahead, label: lm?.label ?? ahead.name, toNext };
}

function WalkBand({ time, sick, onOpen }: { time: Time; sick: boolean; onOpen: () => void }) {
  const w = walkAt(WALK_KM);
  return (
    <button type="button" className="td-walk" onClick={onOpen} aria-label={`Walk: ${w.toNext} km to ${w.label}. Open the walk, place and status`}>
      <Scene city={w.ahead.name} region={regionAt(WALK_KM)} part={PART[time]} people className="td-scene" />
      <span className="td-walk-top">
        <span className="td-date">Wed 21 Oct</span>
        <span className="td-place">
          Home{sick ? ' · sick' : ''}
        </span>
      </span>
      <span className="td-walk-cap">
        <span className="td-walk-near">Near {w.pos.from.name}</span>
        <span className="td-walk-next">
          Day 31 · <b className="num tn">{w.toNext}</b> km to {w.label}
        </span>
      </span>
    </button>
  );
}

function WalkFull({ arrival, time, sick, onClose }: { arrival: boolean; time: Time; sick: boolean; onClose: () => void }) {
  const km = arrival ? 230 : WALK_KM;
  const w = walkAt(km);
  const here = arrival ? w.pos.from : undefined;
  const city = arrival ? here!.name : w.ahead.name;
  return (
    <div className={`td-full${arrival ? ' arrival' : ''}`} role="dialog" aria-label={arrival ? `Arrived in ${city}` : 'The walk'}>
      <Scene city={city} region={regionAt(km)} part={PART[time]} people className="td-full-scene" landmarkScale={arrival ? 1.25 : 1} />
      <div className="td-full-body">
        {arrival ? (
          <>
            <span className="td-kicker">You've arrived · Day 31</span>
            <h2 className="td-full-title">{city}</h2>
            <p className="td-voice-big">Two hundred and thirty kilometres from Delhi, on your own feet. The Taj is lit for you tonight.</p>
            <p className="td-small">A postcard of {city} went to Logbook's shelf.</p>
            <span className="td-small">Next: Gwalior, 120 km on.</span>
          </>
        ) : (
          <>
            <span className="td-kicker">The walk · Day 31</span>
            <h2 className="td-full-title">Near {w.pos.from.name}</h2>
            <div className="td-full-stats">
              <span>
                <b className="num tn">{km}</b>
                <small>km walked</small>
              </span>
              <span>
                <b className="num tn">{w.toNext}</b>
                <small>km to {w.label}</small>
              </span>
              <span>
                <b className="num tn">3</b>
                <small>days away at your pace</small>
              </span>
            </div>
            <span className="td-kicker">Where now</span>
            <div className="td-chips">
              {['Home', 'Office', 'Family', 'Trip'].map((p) => (
                <button key={p} type="button" className={`td-chip${p === 'Home' ? ' on' : ''}`} aria-pressed={p === 'Home'}>
                  {p}
                </button>
              ))}
            </div>
            <span className="td-kicker">Status</span>
            <div className="td-chips">
              {['Normal', 'Sick', 'Injured', 'Break'].map((s) => {
                const on = sick ? s === 'Sick' : s === 'Normal';
                return (
                  <button key={s} type="button" className={`td-chip${on ? ' on' : ''}`} aria-pressed={on}>
                    {s}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <button type="button" className="lc-primary" onClick={onClose}>
          {arrival ? 'Carry on walking' : 'Back to Today'}
        </button>
      </div>
    </div>
  );
}

/* ---------- headline: the At a Glance line, or the voice at a moment ---------- */

const GLANCE: Record<Time, string> = {
  morning: 'Session C tonight. Log the morning when you’re up.',
  afternoon: 'On track. Session C tonight, after a walk.',
  evening: 'Two rings in reach before bed.',
  closed: 'Day closed. Session D on Saturday.',
};
const VOICE: Partial<Record<Moment, string>> = {
  ring: 'Protein closed. That one took the whole day.',
  perfect: 'All three. Every ring, one day.',
  record: 'Two records tonight. The deadlift moved.',
  theme: 'The Orionids peak tonight. Look east after midnight.',
};

function Headline({ time, moment, closedN }: { time: Time; moment: Moment; closedN: number }) {
  const voice = VOICE[moment];
  if (moment === 'sick') {
    return (
      <div className="td-head">
        <span className="td-clock">{CLOCK[time]}</span>
        <p className="td-glance">Marked sick. Steps eased to 4,000, and Session C waits.</p>
      </div>
    );
  }
  return (
    <div className="td-head">
      <span className="td-clock">{CLOCK[time]}</span>
      {voice ? (
        <p className={`td-voice-big${moment === 'perfect' || moment === 'record' ? ' gold' : ''}`}>{voice}</p>
      ) : (
        <p className="td-glance">{time === 'closed' ? `Day closed · ${closedN} of 3 rings. Session D on Saturday.` : GLANCE[time]}</p>
      )}
    </div>
  );
}

function ThemeCard() {
  return (
    <div className="td-card td-theme">
      <span className="td-kicker theme">Why today · Orionids peak</span>
      <span className="td-theme-why">Dust from Halley’s comet, burning up overhead. The rings wear stars today.</span>
    </div>
  );
}

/* ---------- the rings, as the headline ---------- */

function Flip({ value }: { value: string }) {
  return (
    <span className="td-flip" aria-label={value}>
      {value.split('').map((c, i) => (
        <span key={`${i}-${c}`} aria-hidden="true">
          {c}
        </span>
      ))}
    </span>
  );
}

function RingsCard({ rs, look, theme, perfect, closedN, time, onToast }: { rs: ReturnType<typeof rings>; look: RingsLook; theme: boolean; perfect: boolean; closedN: number; time: Time; onToast: (s: string) => void }) {
  const [poke, setPoke] = useState(false);
  const [steps, setSteps] = useState(false);
  const progress: [number, number, number] = [rs[0].p, rs[1].p, rs[2].p];
  return (
    <div className={`td-card td-rings${perfect ? ' perfect' : ''}`}>
      <button
        type="button"
        className={`td-ringfig${poke ? ' poke' : ''}`}
        aria-label={`Rings: ${closedN} of 3 closed`}
        onClick={() => {
          setPoke(true);
          setTimeout(() => setPoke(false), 700);
        }}
      >
        {theme ? (
          <ThemedRings style="stars" progress={progress} size={150} label={`Rings for the Orionids: ${closedN} of 3 closed`} center={`${closedN}/3`} />
        ) : (
          <Rings progress={progress} size={150} label={`Rings: ${closedN} of 3 closed`} center={`${closedN}/3`} gold={perfect} />
        )}
      </button>
      <div className="td-ringrows">
        {perfect && <span className="td-kicker gold">Perfect day</span>}
        {rs.map((r) => (
          <button
            key={r.key}
            type="button"
            className={`td-ringrow${r.closed ? ' closed' : ''}`}
            onClick={() => (r.key === 'steps' ? setSteps(!steps) : onToast('Opens Food'))}
            aria-expanded={r.key === 'steps' ? steps : undefined}
          >
            <i style={{ background: r.ink }} />
            <span className="td-ringval">
              <span className="td-ringline">
                <b className="num tn">
                  <Flip value={r.value} />
                </b>
                {r.unit !== 'protein' && <span className="td-unit">{r.unit}</span>}
              </span>
              <span className="td-small">{r.target}</span>
              {look === 'stages' && <span className={`td-stage${r.closed ? ' closed' : ''}`}>{stage(r.p, r.closed)}</span>}
            </span>
            {look === 'headline' && <span className="td-pct num tn">{r.closed ? '✓' : `${Math.round(Math.min(r.p, 1) * 100)}%`}</span>}
          </button>
        ))}
        {steps && (
          <div className="td-stepin">
            <input type="number" inputMode="numeric" aria-label="Steps today" defaultValue={rs[2].value.replace(/,/g, '')} />
            <button type="button" className="td-btn" onClick={() => setSteps(false)}>
              Save
            </button>
            {(time === 'evening' || time === 'closed') && <span className="td-small">Copy today's total from Samsung Health.</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- the slot that changes with the moment ---------- */

function MomentSlot({ time, moment, onReveal, onToast }: { time: Time; moment: Moment; onReveal: () => void; onToast: (s: string) => void }) {
  if (moment === 'perfect' || moment === 'ring' || moment === 'record') {
    if (time !== 'evening') return null;
  }
  if (time === 'morning') {
    return (
      <div className="td-card td-slot">
        <span className="td-kicker">Now · morning</span>
        <span className="td-slot-title">Last night is waiting to be opened</span>
        <span className="td-small">Log weight and sleep, and see what the night brought.</span>
        <button type="button" className="lc-primary" onClick={onReveal}>
          Log the morning
        </button>
      </div>
    );
  }
  if (moment === 'sick' && time !== 'closed') {
    return (
      <div className="td-card td-slot">
        <span className="td-kicker">Now · rest</span>
        <span className="td-slot-title">Steps are done for today</span>
        <span className="td-small">Eased to 4,000 while you're sick. Water, food, sleep: that's the plan.</span>
      </div>
    );
  }
  if (time === 'afternoon') {
    return (
      <div className="td-card td-slot">
        <span className="td-kicker">Now · afternoon</span>
        <span className="td-slot-title">3,880 steps to go</span>
        <span className="td-small">About 5 laps of the loop. A walk after lunch gets most of it.</span>
      </div>
    );
  }
  if (time === 'evening') {
    if (moment === 'perfect') return <CloseCta />;
    return (
      <div className="td-card td-slot">
        <span className="td-kicker">Now · evening</span>
        <span className="td-slot-title">{moment === 'ring' ? 'One closed, two within reach' : '22 g protein to go'}</span>
        {moment !== 'ring' && (
          <div className="td-gap">
            <span className="td-small grow">Greek yogurt and two eggs</span>
            <button type="button" className="td-btn" onClick={() => onToast('Added Greek yogurt and 2 eggs · +24 g protein')}>
              + Add both
            </button>
          </div>
        )}
        <CloseCta inline />
      </div>
    );
  }
  return (
    <div className="td-card td-postcard">
      <span className="td-kicker">Today's postcard</span>
      <div className="td-pc">
        <Scene city="Agra" region={regionAt(WALK_KM)} part="night" className="td-pc-scene" />
        <span className="td-pc-line">Wed 21 Oct · near Mathura · 2 of 3 rings</span>
      </div>
      <span className="td-small">Sent to Logbook's shelf. Tap the day to change anything.</span>
    </div>
  );
}

function CloseCta({ inline }: { inline?: boolean }) {
  const btn = (
    <button type="button" className="lc-primary" onClick={() => go('/close')}>
      Close the day
    </button>
  );
  if (inline) return btn;
  return (
    <div className="td-card td-slot">
      <span className="td-kicker">Now · evening</span>
      <span className="td-slot-title">Everything's in. Close the day.</span>
      {btn}
    </div>
  );
}

/* ---------- training ---------- */

function NextUp({ time, sick }: { time: Time; sick: boolean }) {
  const done = time === 'closed';
  return (
    <div className={`td-card td-next${sick ? ' is-rest' : ''}`}>
      <div className="td-row">
        <span className="td-kicker">{sick ? 'Rest today' : done ? 'Next' : 'Up next · tonight'}</span>
        <span className="td-week" aria-label={`${done ? 3 : 2} of 4 sessions this week`}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < (done ? 3 : 2) ? 'on' : i === (done ? 3 : 2) ? 'next' : ''} />
          ))}
          <span>
            {done ? 3 : 2} of 4
          </span>
        </span>
      </div>
      <span className="td-next-title">{sick ? 'Session C waits' : done ? 'Session D · Saturday' : 'Session C'}</span>
      {sick ? (
        <span className="td-small">Marked sick. The plan moves on when you're better; nothing is missed.</span>
      ) : done ? (
        <span className="td-small">Rows, laterals and the farmer carry.</span>
      ) : (
        <>
          <span className="td-small">
            Usually <b>92 min</b> · <span className="td-ok">2 ready to go heavier</span>
          </span>
          <span className="td-ready">Ready · sleep held it back a little</span>
          {time === 'evening' && (
            <button type="button" className="lc-primary td-start" onClick={() => go('/proto/session')}>
              Start Session C
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Records() {
  return (
    <div className="td-card td-records">
      <span className="td-kicker gold">Tonight · Session C</span>
      <span className="td-next-title goldtxt">2 records</span>
      <div className="td-chips">
        <span className="lc-tag gold">Romanian deadlift 10 kg × 19</span>
        <span className="lc-tag gold">Lean-away lateral 5 kg × 17</span>
      </div>
      <span className="td-small">88 min · 26 sets. Gold stays here until midnight.</span>
      <button type="button" className="lc-primary gold" onClick={() => go('/proto/train', { state: 'after' })}>
        See the finale again
      </button>
    </div>
  );
}

/* ---------- Glance + log: logging below the fold ---------- */

const MEAL: Record<Time, string> = { morning: 'breakfast', afternoon: 'lunch', evening: 'dinner', closed: 'dinner' };
const USUAL: Record<string, [string, string][]> = {
  breakfast: [['Poha', '1 plate'], ['Chai', '1 cup'], ['Eggs', '2'], ['Banana', '1']],
  lunch: [['Dal', '1 bowl'], ['Roti', '2'], ['Rice', '1 cup'], ['Curd', '1 bowl']],
  dinner: [['Chicken curry', '1 bowl'], ['Roti', '2'], ['Salad', '1 plate'], ['Paneer', '100 g']],
};
const MEALS: { name: string; kcal: number; protein: number; on: Time[] }[] = [
  { name: 'Breakfast', kcal: 310, protein: 21, on: ['morning', 'afternoon', 'evening', 'closed'] },
  { name: 'Lunch', kcal: 620, protein: 28, on: ['afternoon', 'evening', 'closed'] },
  { name: 'Snacks', kcal: 130, protein: 9, on: ['evening', 'closed'] },
  { name: 'Dinner', kcal: 580, protein: 40, on: ['evening', 'closed'] },
];

function LogBelow({ time, onToast }: { time: Time; onToast: (s: string) => void }) {
  const meal = MEAL[time];
  return (
    <>
      <label className="td-search">
        <span aria-hidden="true">⌕</span>
        <input type="search" placeholder="Log anything: chai, waist, sleep…" aria-label="Log anything" />
      </label>

      <div className="td-card">
        <span className="td-kicker">Your usual {meal} · one tap each</span>
        <div className="td-quick">
          {USUAL[meal].map(([name, amt]) => (
            <button key={name} type="button" className="td-food" onClick={() => onToast(`Added ${name}, ${amt} · your usual`)}>
              <b>{name}</b>
              <span className="td-small">{amt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="td-meals" aria-label="Today's meals">
        {MEALS.map((m) => {
          const on = m.on.includes(time);
          return (
            <button key={m.name} type="button" className={`td-meal${on ? '' : ' empty'}`} onClick={() => onToast(on ? `Opens ${m.name}` : `${m.name}: same as yesterday added`)}>
              <span className="td-meal-name">{m.name}</span>
              {on ? (
                <span className="td-small num tn">
                  {m.kcal} kcal · {m.protein} g
                </span>
              ) : (
                <>
                  <span className="td-small">empty</span>
                  <span className="td-same">Same as yesterday</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="td-card">
        <span className="td-kicker">Checklist · press and hold to tick</span>
        <div className="td-chips">
          {[['Vitamin D', time !== 'morning'], ['Fish oil', time === 'evening' || time === 'closed'], ['Magnesium', time === 'closed']].map(([n, done]) => (
            <HoldChip key={n as string} name={n as string} done={done as boolean} />
          ))}
        </div>
      </div>
    </>
  );
}

function HoldChip({ name, done: start }: { name: string; done: boolean }) {
  const [done, setDone] = useState(start);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stop = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <button
      type="button"
      className={`td-chip td-hold${done ? ' on' : ''}${holding ? ' holding' : ''}`}
      aria-pressed={done}
      onPointerDown={() => {
        setHolding(true);
        timer.current = setTimeout(() => {
          setDone(!done);
          setHolding(false);
        }, 650);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
    >
      <span className="td-hold-fill" aria-hidden="true" />
      {name}
      {done ? ' · taken' : ''}
    </button>
  );
}

/* ---------- the detail home: drawer or page ---------- */

function DetailHome({ kind, time, moment, onClose }: { kind: Detail; time: Time; moment: Moment; onClose: () => void }) {
  const body: ReactNode = (
    <>
      <div className="td-dsec">
        <span className="td-kicker">Today's line</span>
        <p className="td-voice">{VOICE[moment] ?? 'Quiet day so far. The walk is three days from the Taj.'}</p>
      </div>
      <div className="td-dsec td-readiness">
        <span className="td-score num tn">78</span>
        <span className="grow">
          <b>Ready</b>
          <span className="td-small">Sleep held it back a little: 6 h 40 min, shorter than your usual.</span>
        </span>
        <span aria-hidden="true">›</span>
      </div>
      <div className="td-dsec">
        <span className="td-kicker">Protein</span>
        <span>{time === 'closed' ? '112 of 120 g · 8 g short' : '22 g to go · Greek yogurt and two eggs'}</span>
      </div>
      <div className="td-dsec">
        <span className="td-kicker">Place and status</span>
        <span>Home · {moment === 'sick' ? 'sick' : 'normal'} · change in the walk</span>
      </div>
      <button type="button" className="lc-primary" onClick={() => go('/close')}>
        {time === 'closed' ? 'Day closed · change anything' : 'Close the day'}
      </button>
    </>
  );
  if (kind === 'page') {
    return (
      <div className="td-dpage" role="dialog" aria-label="Today in detail">
        <button type="button" className="td-back" onClick={onClose}>
          ‹ Today
        </button>
        <h2 className="td-dtitle">Today in detail</h2>
        {body}
      </div>
    );
  }
  return (
    <div className="td-scrim" onClick={onClose}>
      <div className="td-drawer" role="dialog" aria-label="Today in detail" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="td-handle" aria-label="Close" onClick={onClose} />
        <h2 className="td-dtitle">Today in detail</h2>
        {body}
      </div>
    </div>
  );
}

/* ---------- the morning reveal (Pokémon Sleep), after the morning log is saved ---------- */

function Reveal({ onClose }: { onClose: () => void }) {
  const items = [
    ['Asleep', '6 h 40 min', 'twenty minutes under your usual'],
    ['Weight', 'steady', 'the week’s trend holds'],
    ['Readiness', 'Ready', 'a normal session tonight'],
    ['The walk', '+3.1 km', 'yesterday’s steps, carried overnight'],
  ];
  return (
    <div className="td-full td-reveal" role="dialog" aria-label="Last night">
      <div className="td-full-body">
        <span className="td-kicker">Morning log saved · last night</span>
        <h2 className="td-full-title">Here's what the night brought</h2>
        {items.map(([k, v, s], i) => (
          <div key={k} className="td-rv" style={{ animationDelay: `${0.3 + i * 0.6}s` }}>
            <span className="td-small">{k}</span>
            <b>{v}</b>
            <span className="td-small">{s}</span>
          </div>
        ))}
        <button type="button" className="lc-primary" onClick={onClose}>
          Start the day
        </button>
      </div>
    </div>
  );
}
