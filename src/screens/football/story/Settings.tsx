// Settings: spec §5.6 rows plus stadium sound and the low-log week (release 1). Times and the mapping are fixed and shown.
// Board 23 (m23-set): each setting is a row in its own colour with a real switch, then which log feeds which axis.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { NATIONS, nationBar } from '../../../football/events';
import type { Slot } from '../../../football/money';
import { setBedtime, setFbSetting, setLeaguePace, setOwnSponsor } from '../../../football/store/save';
import { PACE_RETIRED, PACE_TITLE, paceLine } from '../../../football/pace';
import { clock } from '../../../football/players/attributes';
import type { FbSave } from '../../../football/store/tables';
import { SLOT_NAME } from '../club/Money';
import { patchSettings } from '../../../db/actions';
import { useSettings } from '../../../db/hooks';
import { prefOn } from '../../../domain/types';
import { dayOfLogging, weekStart } from '../../../domain/dates';
import type { Axis } from '../../../football/types';

import { Switch } from '../../../ui/controls';
import { AXIS_INK } from '../../../ui/inks';

const Ic = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0b1022" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const ICON = {
  sound: 'M3 12h4l3-8 4 16 3-8h4',
  low: 'M12 3v18M3 12h18',
  clock: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16M12 8v4l3 2',
  buzz: 'M8 3h8v18H8zM4 8v8M20 8v8',
  globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M3 12h18M12 3c3.5 3.5 3.5 14.5 0 18M12 3c-3.5 3.5-3.5 14.5 0 18',
  shirt: 'M6 4l6 3 6-3 3 6-3 2v8H6v-8l-3-2z',
  pace: 'M5 18l5-12 4 8 5-4',
};

/** One setting as drawn: a colour tile, its name and line, and its control. With a switch the whole head is its label. */
function Row({ c, icon, title, sub, sw, aside, children, label }: {
  c: string; icon: string; title: string; sub: ReactNode; label?: string; aside?: ReactNode; children?: ReactNode;
  sw?: { on: boolean; set: (v: boolean) => void; disabled?: boolean };
}) {
  const inner = (
    <>
      <i><Ic d={icon} /></i>
      <span><b>{title}</b><small>{sub}</small></span>
      {sw ? <Switch checked={sw.on} onChange={sw.set} label={title} disabled={sw.disabled} /> : aside}
    </>
  );
  return (
    <section className="fb-card fb-setrow set23" aria-label={label ?? title} style={{ '--c': c } as CSSProperties}>
      {sw ? <label className="set23-h">{inner}</label> : <div className="set23-h">{inner}</div>}
      {children}
    </section>
  );
}

/** Low-log week (release 1, R3 b-lowlog): one week at a time, only medicines and one habit are needed. */
function LowLogRow({ s }: { s: FbSave }) {
  const [axis, setAxis] = useState<Axis>(s.lowLog?.axis ?? 'Pace');
  const week = weekStart(dayOfLogging(Date.now()));
  const on = s.lowLog?.week === week;
  return (
    <Row c="#ffd36b" icon={ICON.low} title="Low-log week" sub="For a slammed week: medicines and one habit" sw={{ on, set: (v) => void setFbSetting('lowLog', v ? { week, axis } : undefined) }}>
      <label className="fb-row">
        <b>The one habit</b>
        <select className="fb-select" value={on ? s.lowLog!.axis : axis} onChange={(e) => { const a = e.target.value as Axis; setAxis(a); if (on) void setFbSetting('lowLog', { week, axis: a }); }} aria-label="The one habit that still counts">
          {MAPPING.map(([a, h]) => <option key={a} value={a}>{a}: {h.toLowerCase()}</option>)}
        </select>
      </label>
      <p className="fb-s">{on ? 'On until Sunday.' : 'Off.'} Every other axis plays at your typical level. One week at a time.</p>
    </Row>
  );
}

/**
 * League pace (owner, 13 Nov, O36): one switch, off by default, turned on once. It covers this season only: the next
 * season is one match a day again by itself. Shown only during a season, or after it to say it has ended.
 */
export function PaceRow({ s, onPace = (v) => void setLeaguePace(v) }: { s: FbSave; onPace?: (on: boolean) => void }) {
  // Retired (ledger O38): one league match a day; the switch is hidden and a save with it on plays as off.
  if (PACE_RETIRED) return null;
  const mine = s.pace && s.pace.season === s.season ? s.pace : undefined;
  // Once its season is over the switch goes: a note says so through the next season, then the row is gone.
  const ended = Boolean(s.pace && (s.pace.season < s.season || s.phase !== 'season'));
  if (s.pace && s.pace.season < s.season - 1) return null;
  if (s.phase !== 'season' && !ended) return null;
  const on = Boolean(mine && !mine.to) && s.phase === 'season';
  return (
    <Row c="#8fdcb6" icon={ICON.pace} title={PACE_TITLE} sub={paceLine(on, ended)} sw={ended ? undefined : { on, set: onPace }} />
  );
}

/** Stadium sound (release 1): one switch, off by default. A crowd swell plays only when a log takes you ahead. */
function StadiumRow() {
  const settings = useSettings();
  const on = settings ? prefOn(settings.prefs, 'stadium') : false;
  return (
    <Row c="#c2b2ff" icon={ICON.sound} title="Stadium sound" sub="A crowd swell when a log takes you ahead. Off unless you turn it on." sw={{ on, set: (v) => void patchSettings((x) => ({ prefs: { ...x.prefs, stadium: v } })), disabled: !settings }} />
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
      <StadiumRow />
      <Row c="#ff8a9a" icon={ICON.buzz} title="Buzz on goals" sub="A long buzz when you score, a short one when they do. No sound." sw={{ on: Boolean(s.buzz), set: onBuzz }} />
      <LowLogRow s={s} />
      <Row c="#8fd8ff" icon={ICON.clock} title="Match times" sub="The next morning, once the day is done" aside={<em>Morning</em>}>
        <p className="fb-s">Each day’s match waits for you. Closing a past day plays it straight away. One match a night; double-headers play two from the same night.</p>
      </Row>
      <PaceRow s={s} />
      <section className="fb-card fb-setrow set23 set23-ax" aria-label="Which habit plays which axis">
        <div className="hd23"><b>What feeds each axis</b><span>Fixed</span></div>
        <ul className="ax23s">
          {MAPPING.map(([a, h]) => <li key={a} className="ax23" style={{ '--c': AXIS_INK[a as Axis] } as CSSProperties}><i>{a[0]}</i><span><b>{a}</b><small>{h}</small></span></li>)}
        </ul>
        <label className="fb-row">
          <b>Bedtime</b>
          <select className="fb-select" value={s.bedtime ?? ''} onChange={(e) => onBedtime(e.target.value === '' ? undefined : Number(e.target.value))} aria-label="Bedtime for Rest and the youngsters">
            <option value="">Your usual bedtime</option>
            {BEDTIMES.map((m) => <option key={m} value={m}>{clock(m)}</option>)}
          </select>
        </label>
        <p className="fb-s">A bedtime counts as kept when you are asleep by 45 minutes after it; earlier always counts.</p>
      </section>
      <Row c="#5fe3a1" icon={ICON.globe} title="World Cup country" sub={nation ? `A call-up needs a 28-day average of ${nationBar(nation.strength).toFixed(1)}. Stronger nations ask more.` : 'Pick a country to be in with a shout of a call-up.'}>
        <select id="fb-wc" className="fb-select" value={s.wcCountry ?? ''} onChange={(e) => onCountry(e.target.value || undefined)} aria-label="World Cup country">
          <option value="">None: just follow it</option>
          {BY_NAME.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
      </Row>
      <form className="fb-card fb-setrow set23" aria-label="Your own sponsor" style={{ '--c': '#ffb347' } as CSSProperties} onSubmit={(e) => { e.preventDefault(); onOwn(name, slot); }}>
        <div className="set23-h"><i><Ic d={ICON.shirt} /></i><span><b>Your own sponsor</b><small>A name of your own on the kit</small></span></div>
        <input className="fb-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Sponsor name" placeholder="A name for the shirt" />
        <select className="fb-select" value={slot} onChange={(e) => setSlot(e.target.value as Slot)} aria-label="Which slot">
          {(['shirt', 'kit', 'sleeve', 'ground', 'partner'] as Slot[]).map((x) => <option key={x} value={x}>{SLOT_NAME[x]}</option>)}
        </select>
        <button type="submit" className="fb-btn pri sm">Save</button>
      </form>
    </>
  );
}
