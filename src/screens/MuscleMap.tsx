// Sets per muscle (look pass L2; board four "This week on your body"): opens from the body figure on Train.
import { daysBetween } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { daysSince, weeklyHardSets } from '../domain/muscles';
import { realSets } from '../domain/plan';
import { muscleWeek, weekOf, weekWords } from '../domain/trainWeek';
import { weekStart } from '../domain/dates';
import { MUSCLES, type MuscleId } from '../domain/types';
import { useAllSets, useBody, useSessions, useSettings, useToday } from '../db/hooks';
import { back, go } from '../router';
import { Door, Doors, PageHead, Panel, Sect, type HowThisWorks } from '../ui/kit/Kit';
import { MUSCLE_INK, MuscleBars } from './train/Week';

const NAMES: Record<MuscleId, string> = {
  chest: 'Chest',
  'upper-back': 'Upper back',
  lats: 'Lats',
  'front-delts': 'Front delts',
  'side-delts': 'Side delts',
  'rear-delts': 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

const ago = (d: number | undefined) => (d === undefined ? 'not yet' : d === 0 ? 'today' : d === 1 ? '1 day ago' : `${d} days ago`);

const HOW: HowThisWorks = {
  title: 'How sets per muscle work',
  steps: [
    { icon: 'check', ink: MUSCLE_INK.ok, head: 'A hard set', line: 'A working set taken to three reps or fewer from failure. Unrated sets count; warm-ups and drops don’t.' },
    { icon: 'train', ink: '#ff9a76', head: 'Its main muscles', line: 'Each set counts once for every row its main muscles are in. A helping muscle counts half in the list below.' },
    { icon: 'list', ink: '#9db4d6', head: 'The plan’s range', line: 'The dashed marks are what the plan asks for each week, or a general range when it doesn’t say.' },
    { icon: 'calendar', ink: '#ede6da', head: 'Monday to Sunday', line: 'The count starts again each Monday.' },
  ],
  chips: [
    { ink: MUSCLE_INK.ok, text: 'green on target' },
    { ink: MUSCLE_INK.low, text: 'yellow low' },
    { ink: MUSCLE_INK.high, text: 'blue high' },
  ],
};

export function MuscleMapPage() {
  const settings = useSettings();
  const sets = useAllSets();
  const sessions = useSessions();
  const body = useBody();
  const today = useToday();
  if (!settings?.plan || !sets || !sessions) return <div className="page bare" />;
  const plan = settings.plan;
  const rows = muscleWeek(sets, plan, today);
  const week = weekOf(plan, sessions, today);
  const toGo = Math.max(0, week.target - week.doneCount);
  const hard = weeklyHardSets(sets, plan, weekStart(today));
  const records = realSets(sets).filter((s) => s.mark === '!!').length;
  return (
    <div className="page bare tr-kit k-light tr-gym">
      <div className="k-page">
        <PageHead back="Train" onBack={() => back('/train')} title="Sets per muscle" help={HOW} />
        <span className="k-q">
          This week on your body: hard sets so far, against what the plan asks for. {toGo ? `${weekWords(0, toGo).replace(' to do', '')} session${toGo === 1 ? '' : 's'} to go.` : weekWords(week.doneCount, week.target) + '.'}
        </span>
        <MuscleBars rows={rows} />
        <span className="tr-legend">
          <span><b style={{ color: MUSCLE_INK.ok }}>Green</b> on target</span>
          <span><b style={{ color: MUSCLE_INK.low }}>Yellow</b> low</span>
          <span><b style={{ color: MUSCLE_INK.high }}>Blue</b> high</span>
        </span>
        <span className="k-q">The dashed marks are the plan’s range for each muscle.</span>

        <Sect>Around training</Sect>
        <Doors label="Around training">
          <Door icon="win" ink="#f2c46d" name="Records" value={fmtInt(records)} onClick={() => go('/records')} />
          <Door icon="list" name="The plan" value={plan.planVersion ? `v${plan.planVersion}` : plan.name} onClick={() => go('/plan')} />
          <Door icon="body" name="Body log" value={String((body ?? []).filter((b) => daysBetween(b.date, today) < 7).length || '–')} onClick={() => go('/body')} />
        </Doors>

        <Sect>Each muscle</Sect>
        <Panel ink="#9db4d6" className="tr-bars">
          {MUSCLES.map((x) => (
            <div key={x} className="k-row" style={{ minHeight: 40 }}>
              <span>{NAMES[x]}</span>
              <span className="k-q">
                {Math.round((hard[x] ?? 0) * 10) / 10} hard · {ago(daysSince(x, sets, plan, today))}
              </span>
            </div>
          ))}
        </Panel>
        <span className="k-q">Here a muscle helping out counts half.</span>
      </div>
    </div>
  );
}
