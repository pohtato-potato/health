import type { Source } from '../../walk/content/types';

/** Where the facts come from, so a wrong one can be traced. */
export function Sources({ sources }: { sources: Source[] }) {
  return (
    <section className="walk-sources" aria-label="Sources">
      <h2 className="walk-h3">Sources</h2>
      <ul>
        {sources.map((s) => (
          <li key={s.title}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</li>
        ))}
      </ul>
    </section>
  );
}
