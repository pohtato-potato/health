import { Icon } from '../../ui/Icon';

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
            <span>{where}</span>
            <Icon name="right" size={20} stroke={2.2} className="k-arrow" />
          </button>
        ) : (
          where
        )}
      </h1>
      <p className="walk-sub">{sub}</p>
    </header>
  );
}
