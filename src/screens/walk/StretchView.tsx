import type { Stretch } from '../../walk/content/types';
import { Sources } from './Sources';

/** A stretch's long page: history, politics, people and land, then the deeper read and the sources. */
export function StretchView({ stretch, onBack }: { stretch: Stretch; onBack: () => void }) {
  return (
    <article className="walk-stretch">
      <span className="walk-kind">Stretch · {stretch.plain}</span>
      <h1 className="walk-title big">{stretch.name}</h1>
      {stretch.page.map((p) => (
        <p key={p.slice(0, 24)} className="walk-para">
          {p}
        </p>
      ))}
      {stretch.deeper && (
        <section className="walk-deeper">
          <h2 className="walk-h2">{stretch.deeper.title}</h2>
          <p className="walk-para">{stretch.deeper.text}</p>
        </section>
      )}
      <button type="button" className="walk-ghost" onClick={onBack}>
        Back to the walk
      </button>
      <Sources sources={stretch.sources} />
    </article>
  );
}
