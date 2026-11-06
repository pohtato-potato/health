// Moments: upsets for and against you, and the moment of each season.
import type { SeasonSummary, Upset } from '../../../football/seasonStory';

export function MomentsView({ upsets, seasons }: { upsets: Upset[]; seasons: SeasonSummary[] }) {
  const forUs = upsets.filter((u) => u.dir === 'for'), against = upsets.filter((u) => u.dir === 'against');
  return (
    <>
      <h2 className="fb-t">Moments</h2>
      {seasons.filter((s) => s.moments.length).map((s) => (
        <section key={s.season} className="fb-card hot" aria-label={`Moment of season ${s.season}`}>
          <span className="fb-lb">Moment of season {s.season}</span>
          <b>{s.moments[0]}</b>
        </section>
      ))}
      <section className="fb-card" aria-label="Upsets for you">
        <span className="fb-lb">Upsets for you · {forUs.length}</span>
        {forUs.length === 0 && <p className="fb-s">None yet. Beat a side from a higher tier.</p>}
        {[...forUs].reverse().slice(0, 12).map((u) => <span key={u.id} className="fb-s"><b>↑ {u.text}</b> · {u.date}</span>)}
      </section>
      <section className="fb-card pu" aria-label="Upsets against you">
        <span className="fb-lb">Upsets against you · {against.length}</span>
        {against.length === 0 && <p className="fb-s">None yet.</p>}
        {[...against].reverse().slice(0, 12).map((u) => <span key={u.id} className="fb-s"><b>↓ {u.text}</b> · {u.date}</span>)}
      </section>
    </>
  );
}
