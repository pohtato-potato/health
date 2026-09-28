/** Whether a rest timer is running right now, for the shake-during-rest secret. */
let running = false;

export function setRestRunning(on: boolean) {
  running = on;
}

export function isRestRunning() {
  return running;
}
