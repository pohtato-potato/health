/** Where a slow-lowering rep is at: three seconds down, one up, by default. */
export function tempoPhase(elapsedMs: number, downSec = 3, upSec = 1) {
  const cycle = (downSec + upSec) * 1000;
  const t = ((elapsedMs % cycle) + cycle) % cycle;
  const down = t < downSec * 1000;
  return {
    rep: Math.floor(elapsedMs / cycle) + 1,
    down,
    /** 3, 2, 1 on the way down; the count on the way up. */
    count: down ? downSec - Math.floor(t / 1000) : upSec - Math.floor((t - downSec * 1000) / 1000),
    progress: down ? t / (downSec * 1000) : (t - downSec * 1000) / (upSec * 1000),
  };
}
