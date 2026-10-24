import { useAllDays, useSettings } from '../../db/hooks';
import { go } from '../../router';
import { passportPages } from '../../walk/arrivals';
import { stepsByDay } from '../../walk/runs';
import { journeyStart } from '../Journey';
import { PassportView } from './Passport';

/** The passport, at #/passport. A stamp's Replay plays that city's arrival again. */
export function PassportPage() {
  const days = useAllDays();
  const settings = useSettings();
  if (!days || !settings) return <div className="page walk3" />;
  return (
    <div className="page walk3">
      <PassportView pages={passportPages(stepsByDay(days))} startDay={journeyStart(settings, days)} onReplay={(c) => go('/arrive', { c })} />
    </div>
  );
}
