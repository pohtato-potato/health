import type { DayKey } from './dates';
import { festivalOn } from './festivals';
import { fmtDayMonth, fmtInt, lowerFirst } from './format';
import { sleepMinutes, type Rings } from './rings';
import type { Day, Targets } from './types';

/**
 * Golden moments: rare coincidences, not goals. Nothing here can be chased
 * by eating less, and each one shows at most once.
 */
export interface GoldenInput {
  date: DayKey;
  day?: Day;
  rings: Rings;
  targets: Targets;
  /** Checklist slots and how many were ticked that day. */
  slots: number;
  ticked: number;
  trained: boolean;
  /** Exercises with a new record that day. */
  records: string[];
  /** A city reached on the walk that day. */
  city?: string;
  birthday?: string;
  name?: string;
}

export interface Golden {
  key: string;
  kicker: string;
  place: string;
  title: string;
  text: string;
  foot?: string;
}

const isPalindrome = (n: number) => {
  const s = String(n);
  return s.length >= 5 && s === [...s].reverse().join('');
};

export function goldenMoments(g: GoldenInput): Golden[] {
  const out: Golden[] = [];
  const place = fmtDayMonth(g.date);
  const steps = g.day?.steps ?? 0;
  const water = (g.day?.waterMl ?? 0) >= g.targets.waterMl;
  const sleep = g.day?.sleep ? sleepMinutes(g.day.sleep.asleep, g.day.sleep.woke) >= g.targets.sleepMin : false;
  const checklist = g.slots === 0 || g.ticked >= g.slots;

  if (g.rings.perfect && water && sleep && checklist && g.trained) {
    out.push({
      key: `golden:everything:${g.date}`,
      kicker: 'Everything, all at once',
      place,
      title: 'A day where it all landed',
      text: `All three rings, your water, a full night’s sleep${g.slots ? ', the whole checklist' : ''} and a session, on the same day.`,
      foot: 'Days like this are rare. This one’s yours.',
    });
  }
  if (steps >= 10000 && isPalindrome(steps)) {
    out.push({
      key: `golden:palindrome:${g.date}`,
      kicker: 'Same both ways',
      place,
      title: `${fmtInt(steps)} steps`,
      text: 'Your step count reads the same forwards and backwards. Pure luck, and rather lovely.',
    });
  }
  if (g.city && g.rings.perfect) {
    out.push({
      key: `golden:arrival:${g.city}`,
      kicker: 'A perfect arrival',
      place: `${g.city} · ${place}`,
      title: `${g.city}, on a perfect day`,
      text: `You walked into ${g.city} on a day you closed all three rings.`,
    });
  }
  const fest = festivalOn(g.date);
  const birthday = g.birthday && g.date.slice(5) === g.birthday;
  if (g.rings.perfect && (fest?.day === g.date || birthday)) {
    const what = birthday ? 'your birthday' : fest!.name;
    out.push({
      key: `golden:festive:${g.date}`,
      kicker: birthday ? 'Happy birthday' : `Happy ${fest!.name}`,
      place,
      title: `A perfect day on ${what}`,
      text: birthday ? 'All three rings closed on your own day, without it feeling like work. That takes something.' : `All three rings closed on ${fest!.name} itself, sweets and all.`,
    });
  }
  if (g.rings.perfect && g.records.length) {
    out.push({
      key: `golden:record-perfect:${g.date}`,
      kicker: 'Stronger, and perfect',
      place,
      title: g.records.length === 1 ? `A record on ${lowerFirst(g.records[0])}` : `${g.records.length} records`,
      text: 'A new best in training on a day with all three rings closed. The whole plan, working at once.',
    });
  }
  return out;
}
