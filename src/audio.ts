/**
 * The rest timer's soft ding, synthesised with Web Audio so it plays in your
 * headphones on top of your music. Each ding is scheduled on the audio clock at
 * the moment the rest starts, so it lands on time even if the page is busy.
 */
let ctx: AudioContext | undefined;

/** Must run inside a tap: browsers only start audio after a gesture. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = undefined;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx?.state === 'suspended') void ctx.resume();
  });
}

/** Schedules a ding `delaySec` from now. Returns a function that cancels it. */
export function scheduleDing(delaySec: number): () => void {
  if (!ctx) unlockAudio();
  const c = ctx;
  if (!c) return () => {};
  const t = c.currentTime + Math.max(0.02, delaySec);
  const out = c.createGain();
  out.connect(c.destination);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.32, t + 0.012);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  // A soft bell: a fundamental and two quiet overtones, slightly inharmonic.
  const partials: [number, number][] = [
    [784, 1],
    [1568 * 1.002, 0.28],
    [2352 * 1.004, 0.1],
  ];
  const oscs = partials.map(([f, g]) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const gain = c.createGain();
    gain.gain.value = g;
    o.connect(gain).connect(out);
    o.start(t);
    o.stop(t + 1.9);
    return o;
  });
  return () => {
    for (const o of oscs) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
    out.disconnect();
  };
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

/** Keeps the screen on during a session, so the timer and ding stay on time. */
export function wakeLockManager() {
  let lock: WakeLockSentinel | null = null;
  let wanted = false;
  const request = async () => {
    if (!wanted || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      lock = await navigator.wakeLock.request('screen');
    } catch {
      lock = null;
    }
  };
  const onVis = () => {
    if (document.visibilityState === 'visible') void request();
  };
  return {
    start() {
      wanted = true;
      document.addEventListener('visibilitychange', onVis);
      void request();
    },
    stop() {
      wanted = false;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
      lock = null;
    },
  };
}
