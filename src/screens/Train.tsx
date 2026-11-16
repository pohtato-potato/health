import { sessionClock } from '../domain/quietSession';
import { useState } from 'react';
import { addDays, daysBetween } from '../domain/dates';
import { fmtDayMonth, fmtInt, weekdayName } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { fmtSet } from '../domain/setText';
import { allExercises, buildSession, extraSessions, findSession, groupExercises, hasGym, placeOfSession, realSets, targetText, valueOfSet, type ExerciseDef, type PlanDef } from '../domain/plan';
import { cardBack, cardFor, TIERS } from '../domain/cards';
import { POSES, poseFor } from '../domain/poses';
import { CardsRow } from './train/ExerciseCard';
import { removeExercise } from '../domain/planEdit';
import { loggedLater, neglectedExercises, suspiciousSets } from '../domain/trainingChecks';
import { askChoice, askConfirm } from '../ui/Confirm';
import type { SetEntry, Settings, TrainingSession } from '../domain/types';
import { useActiveSession, useAllDays, useAllSets, useAllSetsWithSkips, useBody, useNow, useSessions, useSettings, useToday } from '../db/hooks';
import { go, openSheet } from '../router';
import { Icon } from '../ui/Icon';
import { doneSessions, nextUp, triggersMet, weeksFor } from '../state/derived';
import { sessionStats } from './SessionDone';
import { HALF_RULES, HALF_TEXT, halfWhy, lighterCase, lighterOn, sickOn } from '../domain/deload';
import { GYM_SAFETY, heavyFirstOffer, isDumbbellKind, isGymKind, machineKey, unitFor, unitLabel } from '../domain/gym';
import { placeFor } from '../domain/places';
import { TRIP_SESSION_ID } from '../domain/trip';
import { markSetsSkipped, patchSettings } from '../db/actions';
import { loadBlocks, plateChanges, usualLength } from '../domain/sessionEdges';
import { filmDue, formFocus, fourWeeksAgo, monthSoFar, tonight } from '../domain/trainView';
import { alsoOffer, easyStartOf, easyStartOn, effortOf, effortText, goUpHint, muscleWeek, nextWeight, stepWeight, suggestNext, weekOf, weekWords, weightCanChange } from '../domain/trainWeek';
import { TonightCard } from './train/Cards';
import { FourWeeksCard, MonthCard, PlanCard, RecentCard, RecordsCard } from './train/Sections';
import { BodyPanel, ExerciseBlock, WeekLead, WeightSheet, type ExRow, type Pick, type Place } from './train/Week';
import { Action, Door, Doors, Empty, HelpButton, Panel, Sect, type HowThisWorks } from '../ui/kit/Kit';
import { FAMILIES } from '../ui/kit/families';
import { clock } from './NextUpCard';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];
/** A session's short name: its id when the plan uses codes (G1, H2), else its name. */
const codeOf = (plan: PlanDef, id: string) => (id.length <= 3 ? id : findSession(plan, id)?.name ?? id);

/** "How this works" for Train: four steps and the week's numbers. */
function trainHow(plan: PlanDef, target: number, easy: { days: number; sets: number; rir: number } | undefined): HowThisWorks {
  const t = plan.weeklyTarget;
  return {
    title: 'How Train works',
    steps: [
      { icon: 'calendar', ink: '#9db4d6', head: 'Any order', line: 'Pick today’s session from what is left this week, or repeat one. Nothing is tied to a weekday.' },
      { icon: 'bolt', ink: '#ff9a76', head: 'Where to stop', line: 'Each exercise says how many reps to leave: small lifts close to failure, big ones a few short.' },
      { icon: 'weight', ink: '#ede6da', head: 'Weights you can change', line: 'Tap a weight to change it for next time. When every set reached the top of the range, it suggests going up.' },
      { icon: 'win', ink: '#f2c46d', head: 'Records turn gold', line: 'Beat your best at a weight and the whole screen turns gold, at home or in the gym.' },
    ],
    chips: [
      { ink: '#9db4d6', text: t && (t.gym !== undefined || t.home !== undefined) ? `${t.gym ?? 0} gym + ${t.home ?? 0} home` : `${target} a week` },
      ...(easy ? [{ ink: '#d9e8f3', text: `first gym week: ${easy.sets} sets, ${easy.rir} short` }] : []),
      { ink: '#f2c46d', text: 'records in gold' },
    ],
  };
}

export function Train() {
  const settings = useSettings();
  const today = useToday();
  const sessions = useSessions();
  const sets = useAllSets();
  const days = useAllDays();
  const active = useActiveSession();
  const withSkips = useAllSetsWithSkips();
  const body = useBody();
  const now = useNow(active ? 1000 : 60_000);
  const [picked, setPicked] = useState<string | undefined>();
  const [weightFor, setWeightFor] = useState<string | undefined>();
  if (!settings || !sessions || !sets || !days || active === undefined) return <div className="page" />;

  const plan = settings.plan;
  if (!plan) {
    return (
      <div className="page tr-kit tr-home k-light">
        <div className="k-page">
          <h1 className="k-title lg">Train</h1>
          <Empty icon="train" ink="#ff9a76" title="No plan yet" line="Add one, and Train runs it: the week, the weights and every rule.">
            <Action onClick={() => openSheet('session-settings')}>Add a plan</Action>
          </Empty>
        </div>
      </div>
    );
  }

  const gym = hasGym(plan);
  const weeks = weeksFor(settings, sessions, today, days);
  const done = doneSessions(sessions);
  const week = weekOf(plan, sessions, today, weeks.perWeek);
  const loopNext = (pl: Place) => nextUp(settings, sessions, sets, days, false, pl, body ?? [])?.sessionId ?? week.slots[0]?.sessionId ?? plan.sessions[0].id;
  const suggested = suggestNext(plan, week, sessions, loopNext);
  const pick = picked && findSession(plan, picked) ? picked : suggested;
  const place: Place = gym ? placeOfSession(plan, pick) : 'home';
  const up = nextUp(settings, sessions, sets, days, false, place, body ?? [], pick);
  const def = findSession(plan, pick);
  const trainedToday = done.filter((s) => s.date === today);
  const triggers = triggersMet(plan, sets);
  const lighterInput = { sessions, sets: withSkips ?? sets, days, body: body ?? [], occasions: settings.occasions, lighterWeek: settings.lighterWeek };
  const lighter = lighterCase(lighterInput, today);
  const lighterNow = lighterOn(settings.lighterWeek, today);
  const halfTonight = trainedToday.length ? undefined : halfWhy(lighterInput, today);
  const sickToday = sickOn(today, days, settings.occasions);
  const todayDay = days.find((d) => d.date === today);
  const isTripDay = placeFor(todayDay, settings).kind === 'trip' || todayDay?.status === 'travelling';
  const easy = halfTonight ? undefined : easyStartOn(plan, sessions, today, place);
  const tn = active ? undefined : tonight(sessions, sets, today);
  const nameOf = (id: string) => findSession(plan, id)?.name ?? `Session ${id}`;
  const four = fourWeeksAgo(sessions, sets, tn?.session.session ?? pick, today);
  const muscles = muscleWeek(sets, plan, today);
  const month = monthSoFar(sessions, sets, today);
  const d = new Date(`${today}T12:00:00`);
  const monthName = d.toLocaleString('en-IN', { month: 'long' });
  const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleString('en-IN', { month: 'short' });
  const seen = new Set<string>();
  const allRecords = realSets(sets).filter((x) => x.mark === '!!');
  const recs = [...allRecords]
    .sort((x, y) => y.at - x.at)
    .filter((x) => !seen.has(x.exerciseId) && seen.add(x.exerciseId))
    .slice(0, 3);
  const setsByEx = new Map<string, SetEntry[]>();
  for (const s of realSets(sets)) {
    const list = setsByEx.get(s.exerciseId);
    if (list) list.push(s);
    else setsByEx.set(s.exerciseId, [s]);
  }

  // Today's session as it will be built, swaps in their slots, with each weight as it stands for next time.
  const exs = buildSession(plan, pick, { swaps: up?.swaps, equipment: settings.equipment });
  const statusOf = (id: string) => up?.exercises.find((e) => e.id === id)?.status;
  const weightOf = (ex: ExerciseDef) => {
    const st = statusOf(ex.id);
    return st ? nextWeight(ex.id, st, settings.loadNext, sets) : null;
  };
  const dumbbellKg = (ex: ExerciseDef) => (isDumbbellKind(ex.load) ? weightOf(ex) : null);
  const blocks = loadBlocks(exs, dumbbellKg);
  const heavy = place === 'home' ? heavyFirstOffer(blocks) : undefined;
  const startArgs = (extra: Record<string, string> = {}) => ({ start: pick, ...(gym ? { place } : {}), ...extra });
  const usual = usualLength(sessions, sets, pick, def?.minutes ?? 60);
  const changes = plateChanges(blocks);
  const focus = formFocus(sets, plan, pick);
  const row = (ex: ExerciseDef): ExRow => {
    const st = statusOf(ex.id);
    const kg = weightOf(ex);
    const eff = effortOf(ex, plan, easy);
    const unit = unitLabel(ex.load, unitFor(ex, settings));
    const can = weightCanChange(ex);
    const text = kg === null ? (isGymKind(ex.load) ? 'find' : ex.load === 'body' ? 'body' : '') : `${fmtKg(kg)} ${unit}`;
    const extras = [st?.tempo ? '3 s lowering' : '', ex.lead ? `${ex.lead === 'L' ? 'left' : 'right'} first` : ''].filter(Boolean).join(' · ');
    return {
      id: ex.id,
      name: st?.name ?? ex.name,
      target: targetText(easy ? { ...ex, sets: Math.min(ex.sets, easy.sets) } : ex).replace(' each side', ' a side'),
      extra: extras || undefined,
      effort: effortText(eff),
      hard: !!eff && eff[0] <= 1,
      weight: text ? { text, label: `${st?.name ?? ex.name}: ${text}${can ? '. Change it' : ''}`, onTap: can ? () => setWeightFor(ex.id) : undefined } : undefined,
      up: st && !easy && !halfTonight ? goUpHint(ex, st, kg, settings) : undefined,
    };
  };
  const inkFor = place === 'gym' ? '#9db4d6' : '#e9a07a';
  const exBlocks =
    place === 'gym' || blocks.every((b) => b.kg === null)
      ? [{ head: undefined as string | undefined, groups: groupExercises(exs).map((g) => g.map(row)) }]
      : blocks.map((b, i) => ({
          head: b.kg === null ? undefined : `${i > 0 && blocks[i - 1].kg !== null && blocks[i - 1].kg !== b.kg ? 'Plates change · at' : 'At'} ${fmtKg(b.kg)} kg`,
          groups: groupExercises(b.exs).map((g) => g.map(row)),
        }));

  const editing = weightFor ? exs.find((e) => e.id === weightFor) : undefined;
  const picks: Pick[] = (week.left.length ? week.left : week.slots.map((s) => s.sessionId)).map((id) => ({ id, code: codeOf(plan, id), focus: findSession(plan, id)?.focus || nameOf(id), minutes: findSession(plan, id)?.minutes ?? 60, place: gym ? placeOfSession(plan, id) : 'home' }));
  const also = week.left.length ? alsoOffer(plan, week).map((id) => ({ id, label: extraSessions(plan).some((x) => x.id === id) ? nameOf(id).toLowerCase() : `repeat ${codeOf(plan, id)}` })) : extraSessions(plan).map((x) => ({ id: x.id, label: x.name.toLowerCase() }));
  const safety = (plan.gymSafety?.[0] ?? GYM_SAFETY[0]).text.split(/(?<=\.)\s/).slice(0, 2).join(' ');
  const how = trainHow(plan, week.target, easyStartOf(plan));
  const activeDef = active ? findSession(plan, active.session) : undefined;
  const activeSets = active ? sets.filter((s) => s.sessionId === active.id && !s.drop).length : 0;

  return (
    <div className={`page tr-kit k-light ${place === 'gym' ? 'tr-gym' : 'tr-home'}`}>
      <div className="k-page">
        <header className="k-row tr-head">
          <h1 className="k-title lg">Train</h1>
          <span className="k-row" style={{ gap: 2 }}>
            <HelpButton how={how} />
            <button type="button" className="k-help" aria-label="Session settings, the plan and import" onClick={() => openSheet('session-settings')}>
              <Icon name="more" size={24} stroke={2} />
            </button>
          </span>
        </header>

        {triggers.map((t) => (
          <Panel key={t.id} ink="#f2c46d">
            <b className="k-lb">{t.title}</b>
            <span>{t.message}</span>
          </Panel>
        ))}

        {active ? (
          <>
            <Panel ink="#8fc9b0">
              <span className="k-lb">In progress · {clock(sessionClock(active, sets?.filter((x) => x.sessionId === active.id) ?? [], now))}</span>
              <span className="k-title">{activeDef?.name ?? `Session ${active.session}`}</span>
              <span className="k-q">
                {activeSets} set{activeSets === 1 ? '' : 's'} logged{active.short ? ' · short session' : ''}
              </span>
            </Panel>
            <Action wide onClick={() => go('/session')}>Back to the session</Action>
          </>
        ) : (
          <>
            <WeekLead
              words={weekWords(week.doneCount, week.target)}
              done={week.slots.filter((s) => s.done).map((s) => ({ code: codeOf(plan, s.sessionId), day: s.done!.day, place: s.place }))}
              picks={picks}
              picked={pick}
              onPick={setPicked}
              also={also}
              allDone={!week.left.length}
            />

            {tn && (
              <TonightCard
                name={nameOf(tn.session.session)}
                records={tn.records.map((r) => `${r.exercise} ${fmtSet(r)}`)}
                mins={tn.mins}
                later={tn.later}
                sets={tn.sets}
                liftMin={tn.liftMin}
                quality={tn.quality}
                checks={tn.checks}
                onReplay={() => go('/session/replay', { id: tn.session.id })}
              />
            )}

            <BodyPanel rows={muscles} onOpen={() => go('/muscles')} />

            <div className="k-row end tr-session-h">
              <span className="k-col">
                <span className="k-title">{codeOf(plan, pick)}</span>
                <span className="k-q">{def?.focus || def?.name}</span>
              </span>
              <span className="k-col k-r">
                <b className="k-num">{usual.min} min</b>
                <span className="k-q">{changes > 0 ? `${WORDS[changes] ?? changes} plate change${changes === 1 ? '' : 's'}` : `${exs.length} exercises`}</span>
              </span>
            </div>

            {easy && (
              <Panel ink="#d9e8f3">
                <span className="tr-panel-h">
                  <Icon name="gym" size={20} stroke={1.8} />
                  <b>First gym week</b>
                </span>
                <span>
                  {WORDS[easy.sets] ? `${WORDS[easy.sets][0].toUpperCase()}${WORDS[easy.sets].slice(1)}` : easy.sets} sets of everything, stopping {WORDS[easy.rir] ?? easy.rir} short, while you find your loads. {easy.daysLeft} day{easy.daysLeft === 1 ? '' : 's'} left.
                </span>
              </Panel>
            )}
            {(halfTonight || sickToday) && (
              <Panel ink="#93c3dc">
                <b className="k-lb">{halfTonight ? `${HALF_TEXT[halfTonight]}: half sets` : 'Marked sick today'}</b>
                <span>{halfTonight ? HALF_RULES : 'The lighter version is offered when you start.'}</span>
              </Panel>
            )}

            {exBlocks.map((b, i) => (
              <ExerciseBlock key={i} head={b.head} groups={b.groups} ink={inkFor} />
            ))}
            {(up?.swaps.length ?? 0) > 0 && <span className="k-q">{up!.swaps.length} swapped out for a joint flag.</span>}
            {focus && <span className="k-q">Form focus: {focus.toLowerCase()}.</span>}
            {place === 'gym' && (
              <span className="tr-note">
                <Icon name="wind" size={22} stroke={1.8} />
                {safety}
              </span>
            )}
            <span className="k-q">Tap any weight to change it. It stays changed for next time.</span>

            <div className="tr-also">
              <button type="button" className="tr-chipbtn" onClick={() => openSheet('short', { session: pick })}>
                Short on time
              </button>
              {heavy && (
                <button type="button" className="tr-chipbtn" onClick={() => go('/session', startArgs({ heavy: '1' }))}>
                  Start with the {fmtKg(heavy.heavyKg)} kg block
                </button>
              )}
              {isTripDay && (
                <button type="button" className="tr-chipbtn" onClick={() => go('/session', { start: TRIP_SESSION_ID })}>
                  Trip workout instead
                </button>
              )}
            </div>

            <Action wide quiet={trainedToday.length > 0} onClick={() => go('/session', startArgs())}>
              Start {codeOf(plan, pick)}
            </Action>
          </>
        )}

        {lighterNow ? (
          <Panel ink="#93c3dc">
            <b className="k-lb">Lighter week</b>
            <span>Same exercises: {HALF_RULES.toLowerCase()} Until {fmtDayMonth(settings.lighterWeek!.to)}.</span>
          </Panel>
        ) : (
          lighter.due &&
          (!settings.lighterDismissed || daysBetween(settings.lighterDismissed, today) >= 7) && (
            <Panel ink="#93c3dc">
              <b className="k-lb">A lighter week?</b>
              {lighter.evidence.map((e) => (
                <span key={e}>{e}</span>
              ))}
              <span className="k-q">Two of the coach’s five signs hold. A lighter week keeps the same exercises: {HALF_RULES.toLowerCase()} Your call.</span>
              <span className="tr-also">
                <button type="button" className="tr-chipbtn" onClick={() => patchSettings({ lighterDismissed: today })}>
                  Not now
                </button>
                <button type="button" className="tr-chipbtn on" onClick={() => patchSettings({ lighterWeek: { from: today, to: addDays(today, 6) } })}>
                  Take it
                </button>
              </span>
            </Panel>
          )
        )}

        <TidyCards settings={settings} sessions={sessions} sets={sets} />

        <Sect>Around training</Sect>
        <Doors label="Around training">
          <Door icon="win" family="earned" name="Records" value={fmtInt(allRecords.length)} onClick={() => go('/records')} />
          <Door icon="list" family="upkeep" name="The plan" value={plan.planVersion ? `v${plan.planVersion}` : `${plan.sessions.length} sessions`} onClick={() => go('/plan')} />
          <Door icon="body" family="body" name="Body log" value={String((body ?? []).filter((b) => daysBetween(b.date, today) < 7).length || '–')} onClick={() => go('/body')} />
        </Doors>

        {four && <FourWeeksCard name={nameOf(tn?.session.session ?? pick)} then={four.then} rows={four.rows} />}

        <RecordsCard total={allRecords.length} rows={recs.map((r) => ({ what: fmtSet(r), name: r.exercise, when: r.date === today ? 'tonight' : fmtDayMonth(r.date) }))} onAll={() => go('/records')} />

        <CardsRow
          cards={[...new Map(allExercises(plan).map((e) => [e.id, e])).values()]
            .map((ex) => {
              const mine = setsByEx.get(ex.id) ?? [];
              return { ex, card: cardFor(ex, mine), back: cardBack(mine) };
            })
            .filter((c) => c.card.logged)
            .sort((a, b) => TIERS.indexOf(b.card.tier) - TIERS.indexOf(a.card.tier) || a.ex.name.localeCompare(b.ex.name))
            .map(({ ex, card, back }) => ({ key: ex.id, name: ex.name, pose: POSES[poseFor(ex)], tier: card.tier, next: card.next, seed: ex.id, back }))}
        />

        <Panel ink={FAMILIES.record.ink} onClick={() => go('/football/bounties')} label="Bounties, in Football's record: training jobs in Football's bounty list, this week">
          <b className="k-lb">Bounties<small className="k-head-fam">Football · {FAMILIES.record.name}</small></b>
          <span>Training jobs sit in Football's one bounty list, with the rest. Every week has at least one.</span>
        </Panel>

        <MonthCard month={monthName} next={`1 ${nextMonth}`} m={month} film={filmDue(sessions, today)} onFilm={() => go('/film')} />

        <RecentCard
          rows={[...done]
            .reverse()
            .slice(0, 6)
            .map((s) => {
              const mine = sets.filter((x) => x.sessionId === s.id);
              const st = sessionStats(mine, plan);
              const mins = Math.round(((s.endedAt ?? s.startedAt) - s.startedAt) / 60000);
              return {
                id: s.id,
                title: `${weekdayName(s.date)} · ${nameOf(s.session)}`,
                sub: `${loggedLater(mine) ? 'logged later' : `${mins} min`} · ${st.sets} set${st.sets === 1 ? '' : 's'}${st.kg ? ` · ${fmtInt(st.kg)} kg moved` : ''}${s.short ? ' · short' : ''}`,
                records: st.records,
              };
            })}
          onOpen={(id) => go('/session/view', { id })}
        />

        <PlanCard name={plan.name} version={plan.planVersion} sessions={plan.sessions.map((x) => x.id)} since={plan.from} warmup={plan.warmup} rules={plan.rules ?? []} onOpen={() => go('/plan')} />
      </div>

      {editing && (
        <WeightSheet
          name={statusOf(editing.id)?.name ?? editing.name}
          kg={weightOf(editing)}
          unit={unitLabel(editing.load, unitFor(editing, settings))}
          step={(kg, dir) => stepWeight(editing, kg, dir, settings)}
          note={isGymKind(editing.load) ? 'The number this machine shows. Never compared with another machine.' : 'From the dumbbells you have.'}
          onType={isGymKind(editing.load) ? () => void typeWeight(editing, weightOf(editing), settings).then(() => setWeightFor(undefined)) : undefined}
          onSave={(kg) => void keepWeight(editing.id, kg).then(() => setWeightFor(undefined))}
          onClose={() => setWeightFor(undefined)}
        />
      )}
    </div>
  );
}

/** A weight kept for next time: used when that exercise is next started, until a set of it is logged. */
export function keepWeight(exId: string, kg: number) {
  return patchSettings((s) => ({ loadNext: { ...s.loadNext, [exId]: { kg, at: Date.now() } } }));
}

/** The exact number for a gym machine, and the unit its stack shows (remembered per machine). */
async function typeWeight(ex: ExerciseDef, current: number | null, settings: Settings) {
  const unit = unitFor(ex, settings);
  const stacky = ex.load === 'stack' || ex.load === 'assist';
  const res = await askChoice({
    title: 'Next time',
    body: ex.load === 'barbell' ? 'Total kg, bar included.' : ex.load === 'plates' ? 'Plates added, not the sled.' : 'The number this machine’s stack shows.',
    input: { label: `In ${unitLabel(ex.load, unit)}`, value: current?.toString() ?? '', inputMode: 'decimal' },
    options: [
      { id: 'save', label: 'Keep it', primary: true },
      ...(stacky ? (['kg', 'lb', 'stack'] as const).map((u) => ({ id: `unit:${u}`, label: u === 'stack' ? 'This stack shows plain numbers' : `This stack is in ${u}` })) : []),
    ],
  });
  if (!res) return;
  if (res.id.startsWith('unit:')) await patchSettings((s) => ({ machineUnits: { ...s.machineUnits, [machineKey(ex)]: res.id.slice(5) as 'kg' | 'lb' | 'stack' } }));
  const v = parseFloat(res.text);
  if (Number.isFinite(v) && v >= 0) await keepWeight(ex.id, v);
}

/** Housekeeping the log needs: sets that look unfinished, and exercises that keep getting left out. */
function TidyCards({ settings, sessions, sets }: { settings: Settings; sessions: TrainingSession[]; sets: SetEntry[] }) {
  const plan = settings.plan!;
  const odd = suspiciousSets(sets, settings.keptSets);
  const left = neglectedExercises(plan, sessions, sets, 3, settings.neglectDismissed);
  if (!odd.length && !left.length) return null;
  const name = (id: string) => sets.find((s) => s.exerciseId === id)?.exercise ?? id;
  const lines = odd.slice(0, 8).map((s) => `${fmtDayMonth(s.date)}: ${name(s.exerciseId)} ${s.loadKg ? `${fmtKg(s.loadKg)} kg × ` : '× '}${valueOfSet(s) ?? 0}`);
  return (
    <>
      {odd.length > 0 && (
        <Panel ink="#e8d27a">
          <b className="k-lb">Sets that look unfinished</b>
          <span>
            {odd.length} saved set{odd.length === 1 ? '' : 's'} look{odd.length === 1 ? 's' : ''} like a placeholder: 1 rep with no weight, or under a third of the sets around {odd.length === 1 ? 'it' : 'them'}. They count toward records and volume until skipped.
          </span>
          <span className="k-q">{lines.join(' · ')}{odd.length > lines.length ? ` · and ${odd.length - lines.length} more` : ''}</span>
          <span className="tr-also">
            <button type="button" className="tr-chipbtn" onClick={() => void patchSettings((s) => ({ keptSets: [...(s.keptSets ?? []), ...odd.map((x) => x.id)] }))}>
              They’re real
            </button>
            <button
              type="button"
              className="tr-chipbtn on"
              onClick={async () => {
                if (await askConfirm({ title: `Mark ${odd.length} set${odd.length === 1 ? '' : 's'} skipped?`, body: 'They stay in the session as skipped and leave records, volume and progression.', yes: 'Mark skipped' })) await markSetsSkipped(odd.map((x) => x.id));
              }}
            >
              Mark skipped
            </button>
          </span>
        </Panel>
      )}
      {left.map((n) => {
        const flagged = plan.flags.some((f) => f.swap && (f.swap.from === n.exerciseId || f.swap.to === n.exerciseId));
        return (
          <Panel key={n.exerciseId} ink="#e8d27a">
            <b className="k-lb">Always skipped</b>
            <span>
              {n.name} was left out of the last {n.missed} {findSession(plan, n.sessionId)?.name ?? n.sessionId} sessions. Move it, swap it, or drop it from the plan?
            </span>
            <span className="tr-also">
              <button type="button" className="tr-chipbtn" onClick={() => void patchSettings((s) => ({ neglectDismissed: { ...s.neglectDismissed, [n.exerciseId]: Date.now() } }))}>
                Keep it
              </button>
              <button type="button" className="tr-chipbtn" onClick={() => go('/plan')}>
                Move or swap
              </button>
              {!flagged && (
                <button
                  type="button"
                  className="tr-chipbtn"
                  onClick={async () => {
                    if (!(await askConfirm({ title: `Drop ${n.name} from the plan?`, body: 'Its history stays. You can add it back in the plan editor.', yes: 'Drop it' }))) return;
                    await patchSettings((s) => (s.plan ? { plan: { ...s.plan, sessions: s.plan.sessions.map((x) => (x.id === n.sessionId ? removeExercise(x, n.exerciseId) : x)) } } : {}));
                  }}
                >
                  Drop it
                </button>
              )}
            </span>
          </Panel>
        );
      })}
    </>
  );
}
