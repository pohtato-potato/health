// Scout reports (spec §4, p3-scout): one line in the head scout's voice for each kind of finding.
// Placeholders: `{club}` the club, `{division}` a division or country, `{before}` and `{after}` known %,
// `{manager}` the manager's name, `{player}` a loan target, `{found}` a fogged detail. The report itself (what was found, known %
// before and after, what is still hidden) is built by Fork 2; these are the voice lines on top.
import type { ScoutLines } from './types';

export const SCOUT_REPORT: ScoutLines = {
  rating: [
    'Watched {club} twice. They\'re about as good as their table says, maybe a touch better on a dry pitch.',
    '{club}: I\'ve put a number on them. Don\'t frame it; it\'ll change by spring.',
    'Better than they look on paper, {club}. Worse than they think they are.',
  ],
  style: [
    '{club} play exactly one way and they\'re proud of it. Now we know which way.',
    'Saw how {club} like to play. Wrote it on a ticket. It fit.',
    'Their style? Watch the first ten minutes and you\'ve seen the next eighty.',
  ],
  'weak-side': [
    'Found the soft side of {club}. Not saying it\'s soft, but I wouldn\'t lean on it.',
    '{club} have a side they don\'t like defending. Their full-back knows it too; looked worried all night.',
    'There\'s a gap at {club} you could drive a tram through. Line 10, for preference.',
  ],
  manager: [
    'Met {manager} in a corridor. Polite, quick, didn\'t give anything away. I\'ve written down what they didn\'t say.',
    '{manager} runs {club}. Watched them for ninety minutes. They watched me for eighty.',
    'Their manager, {manager}, shouts one word all match. I\'ve worked out which word.',
  ],
  hidden: [
    'Found {club}\'s trick. Took three matches and a long walk round their town. Worth it.',
    'There\'s something {club} do that nobody writes about. I\'ve written about it.',
    'Their secret isn\'t a secret any more. Don\'t tell them I told you.',
  ],
  history: [
    'Spent an afternoon in {club}\'s club shop and an evening in their history. The shop was shorter.',
    'An old supporter at {club} told me the whole story. Twice. Second time was better.',
    'Read every programme in {club}\'s museum. Most clubs are a story. Theirs is a good one.',
  ],
  kit: [
    'Saw {club}\'s shirts up close. Fons would have opinions.',
    'Got a proper look at {club}\'s crest. There\'s more in it than you\'d think.',
    '{club}\'s colours, noted. Their kit man waved. Professional courtesy.',
  ],
  'loan-target': [
    'Found someone. {player}, at {club}. Not playing much. Should be. Could be, with us.',
    'Hang on to your hat: {player} at {club} might be available. I\'d study them before anyone else does.',
    '{player}. {club}. Trust me. And then study them, because I\'ve been wrong before. Cheerfully.',
  ],
  'nothing-new': [
    'Long day, not much new at {club}. Good sandwich, though.',
    'Nothing we didn\'t know about {club}. Sometimes that\'s the finding: they are what they look like.',
    'Walked {club} top to bottom. Fog\'s thinner, but no secrets turned up today.',
  ],
};

/** A division or a whole country (a 4-segment clock). */
export const DIVISION_REPORTS: string[] = [
  'Did all of {division}. Feet hurt, notebook full. We know {after}% of it now, up from {before}%.',
  '{division} done: every ground, most of the bakeries. {before}% to {after}%.',
  'Covered {division} by train and on foot. Most of the fog\'s gone. What\'s left is the interesting bit.',
  'Back from {division}. Three clubs worth a second look, and one I\'d avoid on a windy day.',
];

/** What is still hidden, as one line under the report. */
export const STILL_HIDDEN: string[] = [
  'Still hidden: {found}. Another trip should do it.',
  'Haven\'t cracked {found} yet. Next time.',
  'Couldn\'t get a look at {found}. They kept it in the dressing room.',
];

/** On a 1 or 2: the risk shown before you commit, and what it looks like when it happens. */
export const SCOUT_THIN: string[] = [
  'Rough trip. Wrong train, then the right train late. Got a little, not a lot.',
  'Fog was thick and so was I. Small report.',
  'Rained the whole match; my ticket\'s mostly a puddle. Here\'s what survived.',
];
