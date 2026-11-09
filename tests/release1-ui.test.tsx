import { renderToStaticMarkup } from 'react-dom/server';
import './football/helpers/windowStub';
import { describe, expect, it } from 'vitest';
import { BODY_KINDS, BODY_REGIONS, bodyTileWords, marksOn } from '../src/domain/bodyLog';
import { BODY_PARTS } from '../src/domain/gym';
import { storyWeek } from '../src/domain/weekly';
import { OWN } from '../src/football/store/season';
import type { FbSave, StoredMatch } from '../src/football/store/tables';
import { DueCard, dueToday } from '../src/screens/today/DueCard';
import { MorningMatch, ResultRow } from '../src/screens/today/MatchToday';
import { valueTier } from '../src/ui/inks';

const e = (part: string, kind: 'sore' | 'tight' | 'strain' | 'pain', at: number, date = '2026-11-09') => ({ id: `${part}${at}`, part, kind, at, date });

describe('body log', () => {
  it('covers every region the brief names, front and back', () => {
    const labels = BODY_REGIONS.map((r) => r.label);
    for (const l of ['Head', 'Neck', 'Shoulders', 'Elbows', 'Wrists', 'Lower back', 'Hips', 'Knees', 'Ankles', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Chest', 'Upper back']) expect(labels).toContain(l);
    expect(BODY_REGIONS.some((r) => r.views.includes('back'))).toBe(true);
  });
  it("uses Train's part names where they overlap, so a knee is one knee everywhere", () => {
    for (const p of ['Neck', 'Shoulder', 'Elbow', 'Wrist', 'Upper back', 'Lower back', 'Chest', 'Hip', 'Knee', 'Ankle', 'Eyes or head']) {
      expect(BODY_PARTS).toContain(p);
      expect(BODY_REGIONS.map((r) => r.part)).toContain(p);
    }
  });
  it('has four kinds, each with words as well as a colour', () => expect(BODY_KINDS.map((k) => k.label)).toEqual(['Sore', 'Tight', 'Strain', 'Pain']));
  it('keeps the latest mark per part for the day', () => {
    const m = marksOn([e('Knee', 'sore', 1), e('Knee', 'pain', 2), e('Neck', 'tight', 3, '2026-11-08')], '2026-11-09');
    expect([...m.keys()]).toEqual(['Knee']);
    expect(m.get('Knee')!.kind).toBe('pain');
  });
  it('words the tile plainly', () => {
    expect(bodyTileWords([], '2026-11-09')).toBe('All good. Tap where it hurts.');
    expect(bodyTileWords([e('Knee', 'sore', 1)], '2026-11-09')).toBe('Knees: sore');
    expect(bodyTileWords([e('Knee', 'sore', 1), e('Neck', 'tight', 2), e('Hip', 'pain', 3)], '2026-11-09')).toBe('3 places marked: Knees, Neck…');
  });
});

describe('due today', () => {
  const settings = { checkInDay: 1, createdAt: new Date('2026-09-01T09:00:00').getTime() };
  it('puts the Sunday waist on Sunday until a waist is in for the week', () => {
    const sun = '2026-11-15';
    const due = dueToday({ today: sun, settings, checkins: ['2026-11-02'], measurements: [] });
    expect(due.map((d) => d.id)).toEqual(['waist']);
    expect(due[0].params).toEqual({ w: '2026-11-09', card: 'waist' });
    expect(dueToday({ today: sun, settings, checkins: ['2026-11-02'], measurements: [{ date: '2026-11-15', waistStanding: 34 }] })).toEqual([]);
  });
  it('shows nothing on an ordinary weekday', () => expect(dueToday({ today: '2026-11-10', settings, checkins: ['2026-11-02'], measurements: [] })).toEqual([]));
  it('offers the first Medical day a few days after starting', () => {
    expect(dueToday({ today: '2026-09-02', settings, checkins: [], measurements: [] })).toEqual([]);
    expect(dueToday({ today: '2026-09-10', settings, checkins: [], measurements: [] }).map((d) => d.id)).toEqual(['medical']);
  });
  it('renders a full-width card with words, not colour alone', () => {
    const html = renderToStaticMarkup(<DueCard due={dueToday({ today: '2026-11-15', settings, checkins: ['2026-11-02'], measurements: [] })} />);
    expect(html).toContain('Sunday waist');
    expect(html).toContain('Due today');
  });
});

describe('the Sunday story week', () => {
  it('tells the week ending today on Sunday, the last full week otherwise', () => {
    expect(storyWeek('2026-11-15')).toBe('2026-11-09');
    expect(storyWeek('2026-11-16')).toBe('2026-11-09');
    expect(storyWeek('2026-11-11')).toBe('2026-11-02');
  });
});

describe('the five-step value scale', () => {
  it('maps 1–20 onto the steps', () => {
    expect([20, 19, 18, 15, 14, 11, 10, 6, 5, 1].map((v) => valueTier(v))).toEqual(['v5', 'v5', 'v4', 'v4', 'v3', 'v3', 'v2', 'v2', 'v1', 'v1']);
  });
});

describe("Today's Football", () => {
  const save = { crest: { step: 1, opt: 'a' } } as unknown as FbSave;
  const m = { id: 'm1', date: '2026-11-08', home: OWN, away: 'bay', opp: 'bay', result: 'W', score: [2, 1], round: 'Matchday 3', watched: false, events: { xg: [1.4, 0.9], chances: [], moments: [] } } as unknown as StoredMatch;
  it('the morning match hides the score until watched', () => {
    const html = renderToStaticMarkup(<MorningMatch m={m} save={save} today="2026-11-09" more={1} />);
    expect(html).toContain('Watch the match');
    expect(html).toContain('played this morning');
    expect(html).not.toContain('2–1');
    expect(html).toContain('One more match waits on Football');
  });
  it('the result row is plain, full width and has no closed pill', () => {
    const html = renderToStaticMarkup(<ResultRow m={{ ...m, watched: true }} save={save} today="2026-11-09" />);
    expect(html).toContain('Won');
    expect(html).toContain('2–1');
    expect(html).toContain('tm-res r-W');
    expect(html.toLowerCase()).not.toContain('closed');
    expect(html).not.toMatch(/kcal|calorie/i);
  });
});
