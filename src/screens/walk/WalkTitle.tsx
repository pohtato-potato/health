/**
 * Where you are, and how far you've come. On a named stretch the name leads, as a button to its long page, with
 * the plain route and the day of the stretch under it.
 */
export function WalkTitle({ where, sub, onWhere }: { where: string; sub: string; onWhere?: () => void }) {
  return (
    <header className="walk-head">
      <h1 className="walk-title">
        {onWhere ? (
          <button type="button" className="walk-title-btn" onClick={onWhere}>
            {where}
          </button>
        ) : (
          where
        )}
      </h1>
      <p className="walk-sub">{sub}</p>
    </header>
  );
}
