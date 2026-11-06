// Kick-off, half-time and full time cards.
export function Bookend({ kind, score, home, away }: { kind: 'kickoff' | 'halftime' | 'fulltime'; score: [number, number]; home: string; away: string }) {
  const title = kind === 'kickoff' ? 'Kick-off' : kind === 'halftime' ? 'Half-time' : 'Full time';
  return (
    <div className={`fb-bookend b-${kind}`} role="status">
      <span className="fb-lb">{title}</span>
      <b className="fb-big">{score[0]}–{score[1]}</b>
      <span className="fb-s">{home} v {away}</span>
    </div>
  );
}
