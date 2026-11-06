// The full-screen moment for screamers and for every goal on a big night (boards 9–10).
import type { Takeover as Kind } from './Replay';

export function Takeover({ kind, minute, scorer, score }: { kind: Kind; minute: number; scorer: string; score: [number, number] }) {
  return (
    <div className={`fb-takeover t-${kind}`} role="alert">
      <div className="fb-field" aria-hidden="true"><i className="bl b1" /><i className="bl b2" /><i className="bl b3" /></div>
      <span className="fb-num tk-min">{minute}’</span>
      <b className="tk-word">{kind === 'screamer' ? 'SCREAMER' : 'GOAL'}</b>
      <span className="tk-who">{scorer}</span>
      <span className="fb-num tk-score">{score[0]}–{score[1]}</span>
    </div>
  );
}
