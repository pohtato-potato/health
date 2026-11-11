// The result tile's door into the match (matchday §4, p3-result: Watch or Skip before any score).
// Fork B calls only this interface. Today it is a stand-in that works on the stored, already-played match: waiting
// means not watched yet; Watch opens the replay; Skip marks it watched so the score shows. Fork A (feat/matchday-match)
// replaces the three bodies with its paused-match functions: waiting = the match is paused and unfinished, watch =
// resume it live, skip = let the assistant finish it (best odds). Nothing else in Fork B needs to change.
import { go } from '../../router';
import { markWatched } from './save';
import type { StoredMatch } from './tables';

export interface MatchGate {
  /** The score must stay hidden: neither Watch nor Skip has happened. */
  waiting(m: StoredMatch): boolean;
  /** Play it on the match screen. */
  watch(m: StoredMatch): void;
  /** Finish it without watching; resolves once the score can be shown. */
  skip(m: StoredMatch): Promise<void>;
}

export const standInGate: MatchGate = {
  waiting: (m) => !m.watched,
  watch: (m) => go('/football/match', { id: m.id }),
  skip: (m) => markWatched(m.id),
};

/** The gate in use. Fork A swaps this one line for its own. */
export const matchGate: MatchGate = standInGate;
