// Kick-off, half-time and full time cards.
export function Bookend({ kind, score, home, away, ground }: { kind: 'kickoff' | 'halftime' | 'fulltime'; score: [number, number]; home: string; away: string; ground?: { name: string; crowd: number } }) {
  const title = kind === 'kickoff' ? 'Kick-off' : kind === 'halftime' ? 'Half-time' : 'Full time';
  return (
    <div className={`fb-bookend b-${kind}`} role="status">
      <span className="fb-lb">{title}</span>
      <b className="fb-big">{score[0]}–{score[1]}</b>
      <span className="fb-s">{home} v {away}</span>
      {ground && kind === 'kickoff' && <span className="fb-s fb-groundline">{ground.name}</span>}
      {ground && kind === 'fulltime' && <span className="fb-s fb-groundline">{ground.crowd.toLocaleString('en-GB')} at {ground.name}</span>}
    </div>
  );
}
