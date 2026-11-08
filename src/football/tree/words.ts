// Plain words for the tree's counts, in UK English. Nothing here scolds.
import type { Metric } from '../content/types';

/** "25 days at the protein target": the count goes in front. */
export const METRIC_WORDS: Record<Metric, string> = {
  steps: 'days at the step goal',
  training: 'training sessions',
  sleep: 'nights at the sleep target',
  protein: 'days at the protein target',
  kcal: 'days inside the calorie range',
  bedtime: 'nights with bedtime kept',
  meds: 'days with every medicine kept',
  youth: 'academy sessions',
  logged: 'days with anything logged',
  closed: 'days closed',
  'big-day': 'days of 18,000 steps',
  'long-walk': 'walks of 5 km or more',
  km: 'km walked',
  'route-leg': 'Walk route legs',
  commute: 'office days at the eased goal',
  'weigh-in': 'weigh-ins',
  waist: 'standing waist measurements',
  'checklist-full': 'days with every checklist slot ticked',
  'habit-kept': 'checklist habits kept',
  rested: 'mornings rated rested',
  'rest-day': 'planned rest days kept',
  breakfast: 'days with breakfast logged',
  lunch: 'days with lunch logged',
  dinner: 'days with dinner logged',
  'three-meals': 'days with three meals logged',
  'session-week': 'weeks of 3+ sessions',
  'form-ok': 'sessions with clean form',
  'all-units': 'days with every unit logged',
  'gym-session': 'gym sessions',
};
export const fmtCount = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-GB') : n.toLocaleString('en-GB', { maximumFractionDigits: 1 }));
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
