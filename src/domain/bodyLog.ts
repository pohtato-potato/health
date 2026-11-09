// The body log (R3 b-body, R4 4): a front and back chart you tap, replacing Readiness. Entries live in the `body`
// table, the same one Train's in-set pain notes use, so the coach's export and the lighter-week rules read both.
// Part names match Train's BODY_PARTS where they overlap, so one knee is one knee everywhere.
import type { DayKey } from './dates';
import type { BodyEntry, BodyKind } from './types';

export type BodyView = 'front' | 'back';
export interface BodyRegion { part: string; label: string; joint: boolean; paired: boolean; views: BodyView[] }

/** Every region, marked out front and back (pages round 5: joints added to the main muscles). */
export const BODY_REGIONS: BodyRegion[] = [
  { part: 'Eyes or head', label: 'Head', joint: true, paired: false, views: ['front', 'back'] },
  { part: 'Neck', label: 'Neck', joint: true, paired: false, views: ['front', 'back'] },
  { part: 'Shoulder', label: 'Shoulders', joint: true, paired: true, views: ['front', 'back'] },
  { part: 'Chest', label: 'Chest', joint: false, paired: false, views: ['front'] },
  { part: 'Arms', label: 'Arms', joint: false, paired: true, views: ['front'] },
  { part: 'Elbow', label: 'Elbows', joint: true, paired: true, views: ['front', 'back'] },
  { part: 'Forearms', label: 'Forearms', joint: false, paired: true, views: ['front'] },
  { part: 'Wrist', label: 'Wrists', joint: true, paired: true, views: ['front', 'back'] },
  { part: 'Core', label: 'Core', joint: false, paired: false, views: ['front'] },
  { part: 'Hip', label: 'Hips', joint: true, paired: true, views: ['front'] },
  { part: 'Quads', label: 'Quads', joint: false, paired: true, views: ['front'] },
  { part: 'Knee', label: 'Knees', joint: true, paired: true, views: ['front', 'back'] },
  { part: 'Ankle', label: 'Ankles', joint: true, paired: true, views: ['front', 'back'] },
  { part: 'Upper back', label: 'Upper back', joint: false, paired: false, views: ['back'] },
  { part: 'Lats', label: 'Lats', joint: false, paired: true, views: ['back'] },
  { part: 'Lower back', label: 'Lower back', joint: true, paired: false, views: ['back'] },
  { part: 'Triceps', label: 'Triceps', joint: false, paired: true, views: ['back'] },
  { part: 'Glutes', label: 'Glutes', joint: false, paired: true, views: ['back'] },
  { part: 'Hamstrings', label: 'Hamstrings', joint: false, paired: true, views: ['back'] },
  { part: 'Calves', label: 'Calves', joint: false, paired: true, views: ['back'] },
];

export const BODY_KINDS: { id: BodyKind; label: string; ink: string }[] = [
  { id: 'sore', label: 'Sore', ink: '#ffd34d' },
  { id: 'tight', label: 'Tight', ink: '#93c3dc' },
  { id: 'strain', label: 'Strain', ink: '#ff9a76' },
  { id: 'pain', label: 'Pain', ink: '#ff8fa8' },
];

export const regionFor = (part: string) => BODY_REGIONS.find((r) => r.part === part);
export const labelFor = (part: string) => regionFor(part)?.label ?? part;
export const kindOf = (k: BodyKind) => BODY_KINDS.find((x) => x.id === k)!;

/** Today's marks, one per part (the latest wins), for the chart and the chips. */
export function marksOn(entries: Pick<BodyEntry, 'date' | 'part' | 'kind' | 'at' | 'side' | 'id'>[], date: DayKey) {
  const out = new Map<string, Pick<BodyEntry, 'part' | 'kind' | 'side' | 'id'>>();
  for (const e of [...entries].filter((x) => x.date === date).sort((a, b) => a.at - b.at)) out.set(e.part, e);
  return out;
}

/** The words on Today's tile and the morning-log row. */
export function bodyTileWords(entries: Pick<BodyEntry, 'date' | 'part' | 'kind' | 'at' | 'side' | 'id'>[], date: DayKey): string {
  const m = [...marksOn(entries, date).values()];
  if (!m.length) return 'All good. Tap where it hurts.';
  if (m.length === 1) return `${labelFor(m[0].part)}: ${kindOf(m[0].kind).label.toLowerCase()}`;
  return `${m.length} places marked: ${m.slice(0, 2).map((x) => labelFor(x.part)).join(', ')}${m.length > 2 ? '…' : ''}`;
}
