import { useState } from 'react';
import { endStatus, patchSettings, setStatusRange } from '../../db/actions';
import { addDays, type DayKey } from '../../domain/dates';
import { CHIP_STATUSES, chipFor } from '../../domain/statusChip';
import type { Day, Status } from '../../domain/types';

/**
 * The status chip at the top of Today (R4 3, R3 j-tour): what you are now, or what is planned next, with its dates.
 * Tap it to set travelling or sick ahead of time, from one day to another. A sick day plays the rotation squad.
 */
export function StatusChip({ today, days }: { today: DayKey; days: Pick<Day, 'date' | 'status'>[] }) {
  const chip = chipFor(days, today);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>(chip.window?.status ?? 'travelling');
  const [from, setFrom] = useState<DayKey>(chip.window?.from ?? today);
  const [to, setTo] = useState<DayKey>(chip.window?.to ?? addDays(today, 2));
  const w = chip.window;
  const save = async () => {
    const a = from <= to ? from : to, b = from <= to ? to : from;
    if (w) await setStatusRange(w.from, w.to, undefined);
    await setStatusRange(a, b, status);
    // A status that covers today runs as the active one until its last day.
    await patchSettings({ activeStatus: a <= today && b >= today ? { status, from: a, through: today } : undefined });
    setOpen(false);
  };
  const clear = async () => {
    if (w) await setStatusRange(w.from < today && w.to >= today ? today : w.from, w.to, undefined);
    if (w && w.from <= today) await endStatus(today);
    setOpen(false);
  };
  return (
    <div className="td-status">
      <button type="button" className={`td-chip${w ? ` on s-${w.status}` : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {chip.text}
      </button>
      {open && (
        <div className="td-statusset" role="group" aria-label="Set a status">
          <div className="td-statusrow" role="radiogroup" aria-label="Status">
            {CHIP_STATUSES.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={status === s.id} className={`chip${status === s.id ? ' on' : ''}`} onClick={() => setStatus(s.id)}>{s.label}</button>
            ))}
          </div>
          <div className="td-dates">
            <label><span>From</span><input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
            <label><span>To</span><input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
          </div>
          <p className="td-hint2">{status === 'travelling' ? 'Your own squad plays as you log on the road.' : 'On these days the rotation squad plays, and nothing you miss counts against you.'}</p>
          <div className="td-statusacts">
            <button type="button" className="btn" onClick={save}>Save</button>
            {w && <button type="button" className="btn ghost" onClick={clear}>Clear {w.from > today ? 'this plan' : 'from today'}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
