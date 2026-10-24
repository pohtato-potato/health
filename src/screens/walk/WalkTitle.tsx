/** Where you are, and how far you've come. Part 3 puts the stretch's storybook name here, with the plain route under it. */
export function WalkTitle({ where, sub }: { where: string; sub: string }) {
  return (
    <header className="walk-head">
      <h1 className="walk-title">{where}</h1>
      <p className="walk-sub">{sub}</p>
    </header>
  );
}
