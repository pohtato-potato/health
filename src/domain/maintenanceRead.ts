import { fmtInt } from './format';
import { KCAL_PER_KG } from './maintenance';

/**
 * The maintenance read (y-maint, 11 Nov). After a day or a week over the calorie target, one or two plain lines:
 * where it sits against the estimated maintenance, and what that means for the trend. Informative, never a
 * scolding, and never a nudge to eat less the next day: no line here asks for anything to be made up.
 */
export interface ReadInput {
  /** The learned maintenance, kcal a day. Without one there is nothing honest to say. */
  maintenance?: number;
  kcalMax: number;
  /** Yesterday's total, when its food was logged. */
  yesterday?: number;
  /** The last seven finished days with food logged (oldest first). */
  week: number[];
}

/** Lines to show, or none when nothing went over. */
export function maintenanceRead(i: ReadInput): string[] {
  const m = i.maintenance;
  if (!m) return [];
  const out: string[] = [];
  if (i.yesterday !== undefined && i.yesterday > i.kcalMax) {
    const gap = i.yesterday - m;
    out.push(
      gap > 0
        ? `Yesterday came to ${fmtInt(i.yesterday)} kcal, about ${fmtInt(round50(gap))} over your estimated maintenance of ${fmtInt(m)}. That is roughly ${kg(gap)} kg of stored energy, which a trend line barely feels.`
        : `Yesterday came to ${fmtInt(i.yesterday)} kcal: over the target, still at or under your estimated maintenance of ${fmtInt(m)}. A maintenance day, not a gain.`,
    );
  }
  if (i.week.length >= 5) {
    const avg = Math.round(i.week.reduce((a, b) => a + b, 0) / i.week.length);
    if (avg > i.kcalMax) {
      const gap = avg - m;
      out.push(
        gap > 0
          ? `The last ${i.week.length} days average ${fmtInt(avg)} a day, about ${fmtInt(round50(gap))} above maintenance: around ${kg(gap * i.week.length)} kg over the week.`
          : `The last ${i.week.length} days average ${fmtInt(avg)} a day, above the target and at or under maintenance: the week holds steady.`,
      );
    }
  }
  return out.slice(0, 2);
}

const round50 = (x: number) => Math.max(50, Math.round(x / 50) * 50);
const kg = (kcal: number) => (Math.max(0, kcal) / KCAL_PER_KG).toFixed(2);
