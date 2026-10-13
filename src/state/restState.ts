/** Whether a rest timer is running right now, for the shake-during-rest secret. */
let running = false;

export function setRestRunning(on: boolean) {
  running = on;
}

export function isRestRunning() {
  return running;
}

let lastSet: number | undefined;
/** When the last set was logged, so a shake from putting the phone down doesn't count. */
export function setLastSetAt(at: number) {
  lastSet = at;
}
export function lastSetAt() {
  return lastSet;
}

/** Shakes are ignored for 5 s after logging a set and all through a rest. */
export function shakeIgnored(now: number, lastSetAtMs: number | undefined, resting: boolean): boolean {
  return resting || (lastSetAtMs !== undefined && now - lastSetAtMs < 5000);
}
