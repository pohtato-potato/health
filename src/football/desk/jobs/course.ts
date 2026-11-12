// Coaching course (spec §3, §8, y-cat B): one die, five practice questions, 3 right to pass. A pass levels up the
// manager's eye, which adds a card choice after cup wins. A 5 or 6 brings a lifeline (two wrong options struck out
// once); the die never changes what counts as right.
import { COURSE_SIZE, drawCourse } from '../course';
import { qualityOf, type JobDef } from '../types';

export const course: JobDef = {
  id: 'course',
  ink: '#7fd8c8',
  open: (v) => v.questions.length >= COURSE_SIZE,
  card: (v) => ({ title: 'Coaching course', line: 'Five questions. One die.', chip: v.spentToday.course ? 'Done today' : 'New' }),
  blocked: (v) => (v.spentToday.course ? 'One course a day' : v.questions.length < COURSE_SIZE ? 'Not enough questions yet' : undefined),
  preview(die) {
    const well = qualityOf(die.value) === 'well';
    return {
      head: well ? 'With a lifeline.' : 'Five questions.',
      line: well ? 'Five questions; once, strike out two wrong options. 3 right levels up your eye for a player.' : 'Five questions. 3 right levels up your eye for a player.',
      gain: well ? '5 + help' : '5',
      others: well ? 'A 1 to 4 would bring no lifeline.' : 'A 5 or 6 would bring a lifeline.',
      // Which five is drawn when the die is spent (seeded), so the preview names none.
      effects: [{ kind: 'course', ids: [], lifeline: well }],
    };
  },
  spend(die, v, _t, r) {
    return { effects: [{ kind: 'course', ids: drawCourse(v.questions, v.answered, r), lifeline: qualityOf(die.value) === 'well' }] };
  },
};
