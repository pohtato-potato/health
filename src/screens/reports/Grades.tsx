import type { Grade, GradeWord } from '../../domain/monthReport';
import { HUE } from '../../ui/you/palette';

const WORD: Record<GradeWord, string> = { Strong: HUE.steps, Good: '#79d6ff', Usual: '#d4d0df', Easing: '#ffc7a6', Slipped: '#ff9aa2' };

/** The assessment: the word itself carries the colour, and the reason sits under it. */
export function Grades({ grades }: { grades: Grade[] }) {
  return (
    <div className="yu-grades">
      {grades.map((g) => (
        <div key={g.area}><span>{g.area}</span><b style={{ color: WORD[g.word] }}>{g.word}</b><small>{g.why}</small></div>
      ))}
    </div>
  );
}
