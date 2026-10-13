/**
 * What-if: move average steps, protein or sessions a week and see the walk and reveal-day
 * forecasts move. The walk is exact arithmetic; the waist's response is a rough, stated rule:
 * each extra 1,000 steps a day speeds the waist trend by 5 %, each extra session a week by
 * 8 %, each extra 10 g of protein a day by 2 %.
 */
export function whatIf(
  base: { kmSoFar: number; kmToGo: number; stepsPerDay: number; strideM: number; whtr: number; whtrPerDay: number; goal: number },
  delta: { stepsPerDay?: number; sessionsPerWeek?: number; proteinG?: number },
): { walkDays: number; revealDays?: number } {
  const steps = Math.max(1000, base.stepsPerDay + (delta.stepsPerDay ?? 0));
  const kmPerDay = (steps * base.strideM) / 1000;
  const walkDays = Math.ceil(base.kmToGo / kmPerDay);
  if (base.whtrPerDay >= 0 || base.whtr <= base.goal) return { walkDays };
  const speed = 1 + 0.05 * ((delta.stepsPerDay ?? 0) / 1000) + 0.08 * (delta.sessionsPerWeek ?? 0) + 0.02 * ((delta.proteinG ?? 0) / 10);
  const rate = base.whtrPerDay * Math.max(0.2, speed);
  return { walkDays, revealDays: Math.ceil((base.goal - base.whtr) / rate) };
}
