// Matchday depth: the last league night played now waits to be watched. Tests that only need a finished match play
// the day and let the assistant finish it, as Skip (or the next 4 am) would.
import type { DayKey } from '../../../src/domain/dates';
import { finishWithAssistant, kickOff, playDue } from '../../../src/football/store/play';
import type { StoredMatch } from '../../../src/football/store/tables';

export async function kickOffDone(date: DayKey): Promise<StoredMatch[]> {
  const ms = await kickOff(date);
  const m = await finishWithAssistant();
  return m ? [...ms, m] : ms;
}
export async function playDueDone(now?: number): Promise<StoredMatch[]> {
  const ms = await playDue(now);
  const m = await finishWithAssistant();
  return m ? [...ms, m] : ms;
}
