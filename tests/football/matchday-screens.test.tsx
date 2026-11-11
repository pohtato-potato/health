// Matchday depth, the screens (spec 2026-11-12 §3): the waiting match, before kick-off, a call, half-time, full time.
import 'fake-indexeddb/auto';
import './helpers/windowStub';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { setTargets } from '../../src/db/actions';
import { HealthDB, db, setDatabase } from '../../src/db/db';
import { nextChance, startMatch } from '../../src/football/engine';
import { loadTonight } from '../../src/football/store/hooks';
import { pausedInput } from '../../src/football/store/paused';
import { finishWithAssistant, kickOff } from '../../src/football/store/play';
import { foundClub } from '../../src/football/store/save';
import { FullTimeView } from '../../src/screens/football/FullTime';
import { CallView, HalfView, PreKickOff } from '../../src/screens/football/match/Live';
import { PickOfThree } from '../../src/screens/football/match/MatchBits';
import { TonightView } from '../../src/screens/football/Tonight';

let n = 0;
beforeEach(async () => {
  setDatabase(new HealthDB(`fb-matchday-${++n}`));
  await db.open();
  await setTargets({ kcalMin: 2000, kcalMax: 2300, proteinG: 140, steps: 8000, waterMl: 0, sleepMin: 450, sessionsPerWeek: 3 }, '2026-01-01');
  await foundClub('2026-11-06', { shirt: 'H1', crest: 'a' });
});
const save = async () => (await db.fbSave.get('save'))!;

describe('matchday screens', () => {
  it('the morning after: last night waits with Watch and Skip, and no score', async () => {
    await kickOff('2026-11-06');
    const t = (await loadTonight('2026-11-07'))!;
    const out = html(<TonightView t={t} />);
    expect(out).toContain('Last night');
    expect(out).toMatch(/>Watch</);
    expect(out).toMatch(/>Skip</);
    expect(out).not.toMatch(/class="fb-score"/);
  });
  it('Tonight shows the plan with tempo and width in place of the plain tactic picker', async () => {
    const t = (await loadTonight('2026-11-06'))!;
    const out = html(<TonightView t={t} />);
    expect(out).toContain('Your plan');
    expect(out).toContain('Tempo');
    expect(out).toContain('Width');
    expect(out).toContain('Not scouted yet');
    expect(out).not.toContain('Tonight’s tactic');
  });
  it('before kick-off: the club, the plan, the eleven as dots and Kick off', async () => {
    await kickOff('2026-11-06');
    const s = await save();
    const out = html(<PreKickOff p={s.paused!} save={s} onKickOff={() => {}} onSkip={() => {}} />);
    for (const x of ['Your plan', 'Press', 'Hold', 'Counter', 'Tempo', 'Width', 'Your eleven', 'Kick off', 'Skip to the result']) expect(out).toContain(x);
    expect(out).toContain('md-dots');
  });
  it('a call: the minute, call n of m, three options with their odds, and the assistant takes the best odds', async () => {
    await kickOff('2026-11-06');
    const s = await save();
    const st = startMatch(pausedInput(s.paused!, s, { watch: true, halfSeen: true }));
    while (nextChance(st)) { /* to the first call */ }
    expect(st.stop?.kind).toBe('call');
    const offer = st.stop!.kind === 'call' ? st.stop!.offer : undefined;
    const out = html(<CallView offer={offer!} p={s.paused!} save={s} chances={st.chances} onPick={() => {}} />);
    expect(out).toContain(`Call 1 of ${offer!.of}`);
    expect(out).toContain('Shoot on sight');
    expect(out).toContain('Keep the ball');
    expect(out).toContain(`${offer!.options[0].pct}%`);
    expect(out).toContain('your assistant takes the best odds');
    expect(out).not.toContain('middle road');
  });
  it('half-time: the studio, the shot map so far, and Change the plan?', async () => {
    await kickOff('2026-11-06');
    const s = await save();
    const st = startMatch(pausedInput(s.paused!, s, { watch: true, picks: ['take', 'take', 'take'] }));
    while (nextChance(st)) { /* to half-time */ }
    const out = html(<HalfView p={s.paused!} save={s} chances={st.chances} score={[0, 0]} onGo={() => {}} />);
    for (const x of ['Half-time', 'The Gremlin', 'The pundit', 'Chances', 'Expected goals', 'Change the plan?', 'Second half']) expect(out).toContain(x);
  });
  it('full time: the strip, the shot map, the calls, and after a win the pick of three', async () => {
    await kickOff('2026-11-06');
    const m = (await finishWithAssistant())!;
    const s = await save();
    const out = html(<FullTimeView m={m} save={s} />);
    expect(out).toContain('md-strip');
    expect(out).toContain('md-shots');
    expect(out).toContain('your assistant');
    const pick = html(<PickOfThree matchId="x" pick={{ tiles: [{ kind: 'card', axis: 'Pace' }, { kind: 'scout', club: 'hul' }, { kind: 'research', n: 2 }] }} name={() => 'Hull'} />);
    expect(pick).toContain('A win. Take one.');
    expect(pick.match(/<button/g)).toHaveLength(3);
  });
});
