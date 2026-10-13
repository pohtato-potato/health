import { endStatus, startStatus } from '../db/actions';
import type { Status } from '../domain/types';

export const STATUSES: { id: Status; label: string }[] = [
  { id: 'sick', label: 'Sick' },
  { id: 'injured', label: 'Injured' },
  { id: 'travelling', label: 'Travelling' },
  { id: 'break', label: 'Break' },
  { id: 'occasion', label: 'Occasion' },
];

/** One tap switches a status on (until switched off) or off. */
export function StatusRow({ today, current }: { today: string; current?: Status }) {
  return (
    <div className="status-row" role="radiogroup" aria-label="Status">
      {STATUSES.map((st) => (
        <button key={st.id} type="button" role="radio" aria-checked={current === st.id} className={`chip sm${current === st.id ? ' on' : ''}`} onClick={() => void (current === st.id ? endStatus(today) : startStatus(today, st.id))}>
          {st.label}
        </button>
      ))}
      <button type="button" role="radio" aria-checked={!current} className={`chip sm${!current ? ' on' : ''}`} onClick={() => void endStatus(today)}>
        None
      </button>
    </div>
  );
}

