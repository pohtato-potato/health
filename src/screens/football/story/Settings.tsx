// Settings: spec §5.6 rows plus stadium sound and the low-log week (release 1). Times and the mapping are fixed and shown.
import { useState } from 'react';
import { NATIONS, nationBar } from '../../../football/events';
import type { Slot } from '../../../football/money';
import { setBedtime, setFbSetting, setLeaguePace, setOwnSponsor } from '../../../football/store/save';
import { PACE_TITLE, paceLine } from '../../../football/pace';
import { clock } from '../../../football/players/attributes';
import type { FbSave } from '../../../football/store/tables';
import { SLOT_NAME } from '../club/Money';
import { patchSettings } from '../../../db/actions';
import { useSettings } from '../../../db/hooks';
import { prefOn } from '../../../domain/types';
import { dayOfLogging, weekStart } from '../../../domain/dates';
import type { Axis } from '../../../football/types';

/** Low-log week (release 1, R3 b-lowlog): one week at a time, only medicines and one habit are needed. */
function LowLogRow({ s }: { s: FbSave }) {
  const [axis, setAxis] = useState<Axis>(s.lowLog?.axis ?? 'Pace');
  const week = weekStart(dayOfLogging(Date.now()));
  const on = s.lowLog?.week === week;
  return (
    <section className="fb-card fb-setrow" aria-label="Low-log week">
      <div className="fb-row">
        <span className="fb-lb">Low-log week</span>
        <button type="button" className={`fb-btn sm ${on ? 'pri' : ''}`} aria-pressed={on} onClick={() => void setFbSetting('lowLog', on ? undefined : { week, axis })}>{on ? 'On' : 'Off'}</button>
      </div>
      <label className="fb-row">
        <b>The one habit</b>
        <select className="fb-select" value={on ? s.lowLog!.axis : axis} onChange={(e) => { const a = e.target.value as Axis; setAxis(a); if (on) void setFbSetting('lowLog', { week, axis: a }); }} aria-label="The one habit that still counts">
          {MAPPING.map(([a, h]) => <option key={a} value={a}>{a}: {h.toLowerCase()}</option>)}
        </select>
      </label>
      <p className="fb-s">{on ? 'On until Sunday.' : 'For a slammed week.'} Only medicines and this one habit are needed; every other axis plays at your typical level. One week at a time.</p>
    </section>
  );
}

/**
 * League pace (owner, 13 Nov, O36): one switch, off by default, turned on once. It covers this season only: the next
 * season is one match a day again by itself. Shown only during a season, or after it to say it has ended.
 */
export function PaceRow({ s, onPace = (v) => void setLeaguePace(v) }: { s: FbSave; onPace?: (on: boolean) => void }) {
  const mine = s.pace && s.pace.season === s.season ? s.pace : undefined;
  // Once its season is over the switch goes: a note says so through the next season, then the row is gone.
  const ended = Boolean(s.pace && (s.pace.season < s.season || s.phase !== 'season'));
  if (s.pace && s.pace.season < s.season - 1) return null;
  if (s.phase !== 'season' && !ended) return null;
  const on = Boolean(mine && !mine.to) && s.phase === 'season';
  return (
    <section className="fb-card fb-setrow" aria-label={PACE_TITLE}>
      <div className="fb-row">
        <span className="fb-lb">{PACE_TITLE}</span>
        {!ended && <button type="button" className={`fb-btn sm ${on ? 'pri' : ''}`} aria-pressed={on} onClick={() => onPace(!on)}>{on ? 'On' : 'Off'}</button>}
      </div>
      <p className="fb-s">{paceLine(on, ended)}</p>
    </section>
  );
}

/** Stadium sound (release 1): one switch, off by default. A crowd swell plays only when a log takes you ahead. */
function StadiumRow() {
  const settings = useSettings();
  const on = settings ? prefOn(settings.prefs, 'stadium') : false;
  return (
    <section className="fb-card fb-setrow" aria-label="Stadium sound">
      <div className="fb-row">
        <span className="fb-lb">Stadium sound</span>
        <button type="button" className={`fb-btn sm ${on ? 'pri' : ''}`} aria-pressed={on} disabled={!settings} onClick={() => void patchSettings((x) => ({ prefs: { ...x.prefs, stadium: !on } }))}>{on ? 'On' : 'Off'}</button>
      </div>
      <p className="fb-s">A crowd swell when a log on Today takes you ahead of tonight’s opponent. Off unless you turn it on.</p>
    </section>
  );
}

export const MAPPING: [string, string][] = [
  ['Pace', 'Your steps'],
  ['Power', 'Training sessions'],
  ['Fuel', 'Food: eating in your range, plus protein'],
  ['Rest', 'Sleep'],
  ['Routine', 'The daily checklist'],
  ['Shape', 'Weigh-ins and waist'],
];
/** 9 pm to 3 am, every half hour. */
const BEDTIMES = Array.from({ length: 13 }, (_, i) => (21 * 60 + i * 30) % 1440);
const BY_NAME = [...NATIONS].sort((a, b) => a.name.localeCompare(b.name));

export function SettingsView({ s, onBuzz = (v) => void setFbSetting('buzz', v), onCountry = (id) => void setFbSetting('wcCountry', id), onOwn = (n, sl) => void setOwnSponsor(n, sl), onBedtime = (m) => void setBedtime(m) }: {
  s: FbSave; onBedtime?: (m: number | undefined) => void; onBuzz?: (v: boolean) => void; onCountry?: (id: string | undefined) => void; onOwn?: (name: string, slot: Slot) => void;
}) {
  const [name, setName] = useState(s.ownSponsor?.name ?? '');
  const [slot, setSlot] = useState<Slot>((s.ownSponsor?.slot as Slot) ?? 'sleeve');
  const nation = NATIONS.find((n) => n.id === s.wcCountry);
  return (
    <>
      <section className="fb-card fb-setrow" aria-label="Match times">
        <span className="fb-lb">Match times</span>
        <p className="fb-s">Each day’s match plays the next morning, once the day is done, and waits for you. Closing a past day plays it straight away. One match a night; double-headers play two from the same night. The switch below can make it three for this season.</p>
      </section>
      <PaceRow s={s} />
      <section className="fb-card fb-setrow" aria-label="Which habit plays which axis">
        <span className="fb-lb">Which habit plays which axis</span>
        {MAPPING.map(([a, h]) => <div key={a} className="fb-row"><b>{a}</b><span className="fb-s fb-right">{h}</span></div>)}
        <label className="fb-row">
          <b>Bedtime</b>
          <select className="fb-select" value={s.bedtime ?? ''} onChange={(e) => onBedtime(e.target.value === '' ? undefined : Number(e.target.value))} aria-label="Bedtime for Rest and the youngsters">
            <option value="">Your usual bedtime</option>
            {BEDTIMES.map((m) => <option key={m} value={m}>{clock(m)}</option>)}
          </select>
        </label>
        <p className="fb-s">Fixed for now. A bedtime counts as kept when you are asleep by 45 minutes after it; earlier always counts.</p>
      </section>
      <section className="fb-card fb-setrow" aria-label="Buzz on goals">
        <div className="fb-row">
          <span className="fb-lb">Buzz on goals</span>
          <button type="button" className={`fb-btn sm ${s.buzz ? 'pri' : ''}`} aria-pressed={s.buzz} onClick={() => onBuzz(!s.buzz)}>{s.buzz ? 'On' : 'Off'}</button>
        </div>
        <p className="fb-s">A long buzz when you score, a short one when they do. No sound.</p>
      </section>
      <StadiumRow />
      <LowLogRow s={s} />
      <section className="fb-card fb-setrow" aria-label="World Cup country">
        <label className="fb-lb" htmlFor="fb-wc">World Cup country</label>
        <select id="fb-wc" className="fb-select" value={s.wcCountry ?? ''} onChange={(e) => onCountry(e.target.value || undefined)}>
          <option value="">None: just follow it</option>
          {BY_NAME.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <p className="fb-s">{nation ? `A call-up needs a 28-day average of ${nationBar(nation.strength).toFixed(1)}. Stronger nations ask more.` : 'Pick a country to be in with a shout of a call-up.'}</p>
      </section>
      <form className="fb-card fb-setrow" aria-label="Your own sponsor" onSubmit={(e) => { e.preventDefault(); onOwn(name, slot); }}>
        <span className="fb-lb">Your own sponsor</span>
        <input className="fb-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Sponsor name" placeholder="A name for the shirt" />
        <select className="fb-select" value={slot} onChange={(e) => setSlot(e.target.value as Slot)} aria-label="Which slot">
          {(['shirt', 'kit', 'sleeve', 'ground', 'partner'] as Slot[]).map((x) => <option key={x} value={x}>{SLOT_NAME[x]}</option>)}
        </select>
        <button type="submit" className="fb-btn pri sm">Save</button>
      </form>
    </>
  );
}
