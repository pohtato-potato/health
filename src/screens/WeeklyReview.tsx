import { addDays, daysBetween, weekStart } from '../domain/dates';
import { lastFullWeek } from '../domain/weekly';
import { weekReview } from '../domain/weekReview';
import { useAllDays, useAllSets, useEntriesBetween, useSessions, useSettings, useToday } from '../db/hooks';
import { back, useRoute } from '../router';
import { Story } from '../ui/Story';

/** Last week as a tap-through story: chapter title, food, steps, training, sleep, comparisons. */
export function WeeklyReviewPage() {
  const settings = useSettings();
  const today = useToday();
  const { params } = useRoute();
  const from = params.get('w') ?? lastFullWeek(today);
  const days = useAllDays();
  const entries = useEntriesBetween(from, addDays(from, 6));
  const sessions = useSessions();
  const sets = useAllSets();
  if (!settings || !days || !entries || !sessions || !sets) return <div className="page bare" />;
  const weekNo = Math.max(1, Math.floor(daysBetween(weekStart(new Date(settings.createdAt).toISOString().slice(0, 10)), from) / 7) + 1);
  const r = weekReview(settings, from, days, entries, sessions, sets, weekNo);
  const cards = [
    {
      id: 'title',
      ground: 'radial-gradient(circle at 50% 20%, #2b2a52, var(--deep) 70%)',
      body: (
        <>
          <div className="lbl gold">Weekly review</div>
          <div className="finale-big" style={{ fontSize: 44 }}>
            {r.title.split(' · ')[0]}
          </div>
          <div className="t17 lh">{r.title.split(' · ')[1]}</div>
        </>
      ),
    },
    ...r.cards.map((c) => ({
      id: c.id,
      body: (
        <>
          <div className="lbl">{c.kicker}</div>
          <div className="finale-big" style={{ fontSize: 52 }}>
            {c.big}
          </div>
          {c.lines.map((l) => (
            <div key={l} className="t15 lh">
              {l}
            </div>
          ))}
        </>
      ),
    })),
  ];
  return <Story cards={cards} onClose={() => back('/you')} label="Weekly review" />;
}
