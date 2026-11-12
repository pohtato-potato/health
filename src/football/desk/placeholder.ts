// Placeholder words for the desk until the writing chat's files land (`src/football/content/desk/`).
// Same shapes as the real ones; a few lines each. Original questions, not from any paper.
import type { ColumnLine, DeskVoices, Question } from './content';

export const VOICES: DeskVoices = {
  '*': {
    Pace: { low: ['{reason}. My legs have filed a complaint.'], mid: ['{reason}. I can get there.'], high: ['Send me. {reason} and I was only warming up.'] },
    Power: { low: ['{reason}. I am saving myself for something.'], mid: ['{reason}. Steady work.'], high: ['{reason}. Point me at it.'] },
    Fuel: { low: ['{reason}. Running on biscuits.'], mid: ['{reason}. Enough in the tank.'], high: ['{reason}. Fully stocked.'] },
    Rest: { low: ['{reason} of sleep. Ask me again after a nap.'], mid: ['{reason}. Awake enough.'], high: ['{reason}. Clear as a cold morning.'] },
    Routine: { low: ['{reason}. The list is still on the fridge.'], mid: ['{reason}. Ticking along.'], high: ['{reason}. Every box, every time.'] },
    Shape: { low: ['{reason}. The scales miss you.'], mid: ['{reason}. The numbers are coming in.'], high: ['{reason}. The tape measure trusts us.'] },
  },
  watch: {
    Rest: { low: ['{reason} of sleep, and you want ninety minutes of their full-back? I will be asleep by the anthem.'], mid: ['{reason}. I can keep my eyes open for one match.'], high: ['{reason}. I will see every overlap.'] },
  },
};

export const COLUMN_LINES: ColumnLine[] = [
  { id: 'col-quay', text: 'The quay was loud on Saturday. Keep it that way.', kind: 'morale' },
  { id: 'col-boots', text: 'Our kit man has more spare laces than their whole squad has ideas.', kind: 'needle' },
  { id: 'col-river', text: 'We train by the river because the river never takes a day off.', kind: 'morale' },
];

export const QUESTIONS: Question[] = [
  { id: 'pq-1', source: 'bank', section: 'quant', prompt: 'A kit costs 800. It is marked up 25% and then sold at 10% off the marked price. What is the profit?', options: ['80', '100', '120', '200'], answer: '100', explanation: 'Marked price 1,000; 10% off is 900; profit 900 − 800 = 100.' },
  { id: 'pq-2', source: 'bank', section: 'quant', prompt: 'Two buses leave the quay together, one every 12 minutes and one every 18. After how many minutes do they next leave together?', answer: '36', explanation: 'The least common multiple of 12 and 18 is 36.' },
  { id: 'pq-3', source: 'bank', section: 'lr', prompt: 'Five players sit in a row. D is at the left end, A sits next to D, B sits next to A, and E is at the right end. Who is in the middle?', options: ['A', 'B', 'C', 'E'], answer: 'B', explanation: 'The row is D, A, B, C, E, so B is third of five.' },
  { id: 'pq-4', source: 'bank', section: 'verbal', prompt: 'Pick the word closest in meaning to "terse".', options: ['Brief', 'Angry', 'Tired', 'Loud'], answer: 'Brief', explanation: 'Terse means using few words.' },
  { id: 'pq-5', source: 'bank', section: 'di', prompt: 'Gate takings were 40, 50 and 60 thousand over three matches. By what percent did the third exceed the first?', options: ['20%', '33%', '50%', '60%'], answer: '50%', explanation: '(60 − 40) / 40 = 50%.' },
  { id: 'pq-6', source: 'bank', section: 'quant', prompt: 'The average of four numbers is 15. Three of them are 10, 12 and 20. What is the fourth?', answer: '18', explanation: '4 × 15 = 60; 60 − 42 = 18.' },
];
