// The result tile's door into the match (matchday §4, p3-result: Watch or Skip before any score).
// The league match waits on the save (`save.paused`, Fork A) from 4 am until it is watched or skipped: Watch opens it
// live with its calls; Skip lets the assistant finish it on the best odds and marks it seen. A match the assistant
// finished at the next 4 am is stored unwatched; for that one Watch replays it and Skip just shows the score.
import { go } from '../../router';
import { finishWithAssistant } from './play';
import { markWatched } from './save';
import type { FbSave, PausedMatch, StoredMatch } from './tables';

export const matchGate = {
  /** The league match still waiting to be played out, if any. */
  waiting: (save: Pick<FbSave, 'paused'> | undefined | null): PausedMatch | undefined => save?.paused,
  /** Watch the waiting match live (before kick-off first). */
  watch: () => go('/football/match', { live: '1' }),
  /** The assistant finishes it; resolves with the stored match once the score can be shown. */
  skip: (): Promise<StoredMatch | undefined> => finishWithAssistant(),
};

/** A finished match nobody has seen yet (the catch-up kind). */
export const storedGate = {
  waiting: (m: Pick<StoredMatch, 'watched'>) => !m.watched,
  watch: (m: Pick<StoredMatch, 'id'>) => go('/football/match', { id: m.id }),
  skip: (m: Pick<StoredMatch, 'id'>) => markWatched(m.id),
};
