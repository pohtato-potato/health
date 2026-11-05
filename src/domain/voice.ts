export { GREMLIN_HELLO, gremlinLine, spokenLine, type GremlinVars, type Moment } from './gremlin';

/** When a joint is flagged, every voice switches to plain speech. */
export function plainFlagLine(what: string, change?: string): string {
  return change ? `${what} flagged. ${change}` : `${what} flagged. Take it easy, and see a physio if it keeps up.`;
}

/**
 * Today's line holds still through the day so it doesn't change on every visit, but a new
 * moment (a session done, a ring closed) brings a new line.
 */
export function pinnedLine(kept: { date: string; moment: string; line: string } | null, date: string, moment: string, line: string): { line: string; keep: { date: string; moment: string; line: string } } {
  if (kept && kept.date === date && kept.moment === moment) return { line: kept.line, keep: kept };
  const keep = { date, moment, line };
  return { line, keep };
}
