// What the study and negotiate jobs share about loan targets (Fork 3).
import { STUDY_CLOCK, studyClockId } from '../../market/market';
import type { DeskView } from '../types';

/** Study segments filled for a target (0–2). */
export const studiedIn = (v: DeskView, key: string) => Math.min(STUDY_CLOCK, v.clocks.find((c) => c.id === studyClockId(key))?.filled ?? 0);
/** A target whose talks ended in a deal: it is ours (or was), and leaves the market. */
export const leadTaken = (v: DeskView, key: string) => (v.market?.talks ?? []).some((x) => x.e.talk === key && x.e.end === 'deal');
