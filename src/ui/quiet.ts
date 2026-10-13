/**
 * Quiet in public: with it on, no confetti or sound from 10 pm to 7 am, or while the app
 * isn't on screen (a session minimised to the background).
 */
export function quietNow(on: boolean, now: number, hidden: boolean): boolean {
  if (!on) return false;
  const h = new Date(now).getHours();
  return hidden || h >= 22 || h < 7;
}
