// Which ability fired, and whether another chance is coming (board 11).
export function AbilityBanner({ text }: { text: string }) {
  const [head, ...rest] = text.split('! ');
  return (
    <div className="fb-banner" role="status">
      <i aria-hidden="true" />
      <b>{head}{rest.length ? '!' : ''}</b>
      {rest.length > 0 && <span>{rest.join('! ')}</span>}
    </div>
  );
}
