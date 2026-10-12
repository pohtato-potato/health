import { useRef } from 'react';
import { addDays, type DayKey } from '../domain/dates';
import { useToday } from '../db/hooks';
import { setParam, useRoute } from '../router';
import { dateChipLabel } from './dateLabel';
import { Icon } from './Icon';

/** The day a log sheet writes to: the ?d= param, or today. */
export function useLogDate(): [DayKey, (d: DayKey) => void] {
  const { params } = useRoute();
  const today = useToday();
  const date = params.get('d') ?? today;
  return [date, (d) => setParam('d', d === today ? undefined : d)];
}

/** Today · Yesterday · a picked day. Every log sheet carries one, so any day can be logged. */
export function DateChip({ value, onChange }: { value: DayKey; onChange: (d: DayKey) => void }) {
  const today = useToday();
  const yesterday = addDays(today, -1);
  const picker = useRef<HTMLInputElement>(null);
  const picked = value !== today && value !== yesterday;
  return (
    <div className="datechip" role="radiogroup" aria-label="Day">
      {[today, yesterday].map((d) => (
        <button key={d} type="button" role="radio" aria-checked={value === d} className={`chip sm${value === d ? ' on' : ''}`} onClick={() => onChange(d)}>
          {dateChipLabel(d, today)}
        </button>
      ))}
      <label className={`chip sm datechip-pick${picked ? ' on' : ''}`}>
        <Icon name="calendar" size={15} stroke={1.8} />
        <span>{picked ? dateChipLabel(value, today) : 'Pick'}</span>
        <input
          ref={picker}
          type="date"
          max={today}
          value={value}
          aria-label="Pick a day"
          onChange={(e) => e.target.value && e.target.value <= today && onChange(e.target.value)}
          onClick={() => picker.current?.showPicker?.()}
        />
      </label>
    </div>
  );
}
