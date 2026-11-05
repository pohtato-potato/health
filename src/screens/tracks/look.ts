import type { TrackKey } from '../../domain/trackRules';

/** Each track's ground and accent. Accent text on a ground is the lighter cut in CSS (--cl). */
export const TRACK_LOOK: Record<TrackKey, { name: string; ground: string; accent: string }> = {
  food: { name: 'Food', ground: '#a8341c', accent: '#ffb27a' },
  shape: { name: 'Shape', ground: '#7a2c5e', accent: '#f598d6' },
  steps: { name: 'Steps', ground: '#0f7059', accent: '#5fe3b4' },
  sleep: { name: 'Sleep', ground: '#1f469c', accent: '#79b4ff' },
  training: { name: 'Training', ground: '#4d2cb0', accent: '#b896ff' },
  readiness: { name: 'Readiness', ground: '#3f7a12', accent: '#d8f58a' },
  joints: { name: 'Joints', ground: '#34507f', accent: '#b7dcff' },
  drinks: { name: 'Drinks', ground: '#935008', accent: '#ffc45e' },
  meds: { name: 'Medicines', ground: '#0f6a73', accent: '#6fd0c8' },
  own: { name: 'Your own tracks', ground: '#33479f', accent: '#a9b8ff' },
  compare: { name: 'Compare', ground: '#0f4f8a', accent: '#7fe0ff' },
};
