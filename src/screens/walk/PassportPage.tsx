import { useAllDays, useSettings } from '../../db/hooks';
import { go } from '../../router';
import { passportPages } from '../../walk/arrivals';
import { stepsByDay } from '../../walk/runs';
import { journeyStart } from '../Journey';
import { PassportView } from './Passport';
import { WalkFrame } from './WalkFrame';
import { auroraFor } from '../../walk/page';
import { regionAt } from '../../domain/regions';
import { kmFromSteps } from '../../domain/walk';

/** The passport, at #/passport. A stamp's Replay plays that city's arrival again. */
export function PassportPage() {
  const days = useAllDays();
  const settings = useSettings();
  if (!days || !settings) return <div className="page walk3" />;
  return (
    <WalkFrame tint={auroraFor(regionAt(kmFromSteps([...stepsByDay(days).values()].reduce((a, b) => a + b, 0))))}>
      <PassportView pages={passportPages(stepsByDay(days))} startDay={journeyStart(settings, days)} onReplay={(c) => go('/arrive', { c })} />
    </WalkFrame>
  );
}
