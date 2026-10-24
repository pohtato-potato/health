import { useState } from 'react';
import { regionAt } from '../../domain/regions';
import { ALL_STATES } from '../../domain/walk';
import { useAllDays, useSettings } from '../../db/hooks';
import { batteryMode } from '../../domain/rest';
import { useBatteryLevel } from '../../ui/RestScreen';
import { go, useRoute } from '../../router';
import type { RegionId } from '../../ui/light';
import { arrivalFor, passportCounts, passportPages } from '../../walk/arrivals';
import { stepsByDay } from '../../walk/runs';
import { journeyStart } from '../Journey';
import { ArrivalFallback, ArrivalView, StateLineView } from './Arrival';

/** The land, in words, for each region the walk crosses. */
const LAND: Record<RegionId, string> = {
  plains: 'the plains',
  desert: 'the desert',
  ravines: 'the ravines',
  deccan: 'the Deccan plateau',
  ghats: 'the hills of the Ghats',
  coast: 'the coast',
  east: 'the green east',
  northeast: 'the hills of the northeast',
  himalaya: 'the mountains',
};

/** An arrival at #/arrive?c=<city>[&ch=<chapter>], or a state line at #/arrive?s=<state>. */
export function ArrivalPage() {
  const params = useRoute().params;
  const days = useAllDays();
  const settings = useSettings();
  const [beat, setBeat] = useState(1);
  const level = useBatteryLevel();
  if (!days || !settings) return <div className="page walk3" />;
  const steps = stepsByDay(days);
  const toWalk = () => go('/walk', undefined, { replace: true });
  // Battery saver: still frames, nothing moving (the .page.saver rule stops every animation).
  const wrap = `page walk3 walk-arr-page-wrap${batteryMode(level, !!settings.prefs.batterySaver) ? ' saver' : ''}`;

  const state = params.get('s');
  if (state) {
    const pages = passportPages(steps);
    const i = pages.findIndex((p) => p.state === state);
    if (i < 0) return <ArrivalFallback onBack={toWalk} />;
    const km = ALL_STATES.find((s) => s.name === state)!.km;
    return (
      <div className={wrap}>
        <StateLineView state={state} ut={pages[i].ut} counts={passportCounts(pages.slice(0, i + 1))} landFrom={LAND[regionAt(0)]} landNow={LAND[regionAt(km)]} onNext={toWalk} />
      </div>
    );
  }

  const ch = params.get('ch');
  const a = arrivalFor(params.get('c') ?? '', steps, journeyStart(settings, days), ch ? Number(ch) : undefined);
  if (!a) return <div className="page walk3"><ArrivalFallback onBack={toWalk} /></div>;
  return (
    <div className={wrap}>
      <ArrivalView a={a} beat={beat} onNext={() => (beat >= 5 ? toWalk() : setBeat(beat + 1))} onSkip={toWalk} />
    </div>
  );
}
