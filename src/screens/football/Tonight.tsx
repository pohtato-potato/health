// Tonight (look pass L4, kit-visual-3 "Tonight"): one lead (the match, both crests, what is at stake), tonight's
// shape, the plan and anything waiting as filled panels, one glowing action, doors for the rest.
import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadExpected } from '../../football/store/chance';
import { xpWords } from './HabitLine';
import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
import { seasonName } from '../../football/pyramid/redraw';
import { OWN } from '../../football/store/season';
import type { Tonight as TonightData } from '../../football/store/hooks';
import type { StoredMatch } from '../../football/store/tables';
import { go } from '../../router';
import { CatchUp } from './CatchUp';
import { SeasonChangeView } from './moments/SeasonChange';
import { levelUpCrest, markAwakeSeen, markOpened, markRivalSeen, markSeasonSeen } from '../../football/store/save';
import { RivalBornView } from './moments/RivalBorn';
import { OpeningNightView } from './moments/OpeningNight';
import { LevelUpView } from './moments/LevelUp';
import { AwakeningView } from './moments/Awakening';
import { FullTime } from './FullTime';
import { AXES, type Axis } from '../../football/types';
import { PlanPanel } from './match/MatchBits';
import { WaitingMatch } from './match/Waiting';
import { planFor, readScouted, scoutLevel } from '../../football/store/paused';
import { readOf, TEMPO_NAME, WIDTH_NAME } from '../../football/matchday';
import { MorningCards } from './world/WorldScreens';
import { TacticPicker } from './players/Rotation';
import { breakBeforeFor, matchdayList, paceNight, paceOn } from '../../football/pace';
import { ChanceBar, lateFor, lossInkOf, shownChance, useChances } from './Chance';
import { chancePercents } from '../../football/chance';
import { heroLook, TonightHero } from './TonightHero';
import { BRABO_INK } from '../../ui/inks';
import { tablesFor } from '../../football/store/league';
import type { Result } from '../../football/types';
import type { NightChance } from '../../football/store/chance';
import { paceSum, PaceSumView } from './PaceSum';
import type { Fixture } from '../../football/store/tonight';
import { TACTIC_NAME } from '../../football/rotation/night';
import { AXIS_INK } from '../../ui/inks';
import { Action, Door, FamilyDoors, Panel, Sect } from '../../ui/kit/Kit';
import { Sheet } from '../../ui/Sheet';
import { loadDesk } from '../../football/store/desk';
import { loadBook, loadRun } from '../../football/cup/store';
import { cupByN } from '../../football/cup/ladder';
import { cupsOpen } from '../../football/cup/book';
import { useAllDays } from '../../db/hooks';
import { weekStrip } from '../../domain/pledge';
import { clockOf } from '../Pledge';
import { watchWaiting } from './match/Waiting';
import '../../styles/look-tonight.css';
import { db } from '../../db/db';
import { useSeenBefore } from '../../ui/motion/motion';
import { useMarkMatchNight } from '../../ui/motion/matchNight';

/**
 * Your crest catches a shine after a win (motion board one, O44): once per won match, the first time Tonight opens
 * after it. Undefined while loading.
 */
function useWinShine(date: string): boolean {
  const last = useLiveQuery(() => db.fbMatches.where('date').below(date).reverse().sortBy('date').then((ms) => ms[0] ?? null), [date]);
  const won = last?.result === 'W' ? last.id : null;
  const before = useSeenBefore<string | null>('crest-shine', won);
  return Boolean(won && before !== won);
}

/** Our own SVG strings (crests, kits): built from data we ship, escaped where text goes in. */
export function Art({ svg, className }: { svg: string; className?: string }) {
  return <span className={`fb-art ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

const nameOf = (id: string) => (id ? clubById(id).name : '');
/** Stored scores are Brabo first; shown home first. */
export const homeFirst = (m: StoredMatch): [number, number] => (m.home === OWN ? m.score : [m.score[1], m.score[0]]);
const pensHomeFirst = (m: StoredMatch) => (m.pens ? (m.home === OWN ? m.pens : [m.pens[1], m.pens[0]]) : undefined);
export const scoreLine = (m: StoredMatch) => {
  const s = homeFirst(m), p = pensHomeFirst(m);
  return `${nameOf(m.home)} ${s[0]}–${s[1]} ${nameOf(m.away)}${p ? ` (${p[0]}–${p[1]} on penalties)` : ''}`;
};
export const RESULT = { W: 'Won', D: 'Drew', L: 'Lost' } as const;

const BRABO = '#ff7a1a';
/** What an unlogged axis waits on, in words (the same answers Today gives). */
/** O42 slip 36: the whole phrase, so the verb agrees ("until your steps are in"). */
const LOG_FOR: Record<Axis, string> = { Pace: 'your steps are in', Power: 'a session is in', Fuel: 'your food is in', Rest: 'your sleep is in', Routine: 'the checklist is ticked', Shape: 'a weigh-in is in' };

/**
 * O41 1 (O42): the day between worlds, or a night already used with no match: says so, with the next match and that
 * it plays tomorrow. Nothing is drawn as tonight's.
 */
export function NoMatchTonight({ t, next }: { t: Pick<TonightData, 'save'>; next: NonNullable<TonightData['next']> }) {
  const opp = next.opp ? clubById(next.opp) : undefined;
  const first = t.save.phase === 'season' && t.save.day === 1;
  const vs = opp ? (next.braboHome ? `at home to ${opp.name}` : `away at ${opp.name}`) : (next.round ?? next.label);
  return (
    <Panel ink="#93c3dc">
      <b className="k-lb">No match tonight</b>
      <span>{first ? `${seasonName(t.save.season)} kicks off tomorrow, ${vs}.` : `Next up tomorrow: ${next.round ?? next.label}, ${vs}.`}</span>
      <span className="k-q">A match is only shown as tonight’s when it plays tonight.</span>
    </Panel>
  );
}

/** A season moment waiting to be seen takes Tonight until it is: one thing leads. */
function momentOf(t: TonightData): ReactNode {
  const awake = (t.save.awakeLog ?? [])[t.save.awakeSeen ?? 0];
  const opening = t.save.openings?.[0];
  const bornId = t.save.rivalMoments?.[0];
  const born = bornId ? t.save.rivals.find((r) => r.clubId === bornId) : undefined;
  if (t.change) return <SeasonChangeView c={t.change} crest={crestSvg(t.save.crest.step, t.save.crest.opt, 44)} onDone={() => void markSeasonSeen(t.change!.season)} />;
  if (t.save.crestPending) return <LevelUpView from={t.save.crest} step={t.save.crestPending} onPick={(o) => void levelUpCrest(o)} />;
  if (opening) return <OpeningNightView id={opening} onDone={() => void markOpened(opening)} />;
  if (born) return <RivalBornView r={born} onDone={() => void markRivalSeen(born.clubId)} />;
  if (awake) return <AwakeningView axis={awake.axis} at={awake.band} values={t.liveValues} onDone={() => void markAwakeSeen(t.save.awakeLog!.length)} />;
  return null;
}

/**
 * Both clubs' places when they share a league table (from the stored season), and whether tonight is a big night:
 * both in the top four. "Top" is first against second.
 */
function useRanks(t: TonightData, oppId: string | undefined) {
  const season = useLiveQuery(() => db.fbSeasons.get(t.save.season), [t.save.season]);
  if (!season || !oppId) return undefined;
  const table = Object.values(tablesFor(season)).find((rows) => rows.some((r) => r.id === OWN));
  if (!table || !table.some((r) => r.p > 0)) return undefined;
  const at = (id: string) => {
    const i = table.findIndex((r) => r.id === id);
    return i < 0 ? undefined : { pos: i + 1, form: table[i].form as Result[] };
  };
  const us = at(OWN), them = at(oppId);
  return { us, them, big: Boolean(us && them && us.pos <= 4 && them.pos <= 4), top: Boolean(us && them && us.pos + them.pos === 3) };
}

export function TonightView({ t, onWatch }: { t: TonightData; onWatch?: (id: string) => void }) {
  const [plan, setPlan] = useState(false);
  const chances = useChances(t.date);
  const chance = chances === undefined ? undefined : chances[0] ?? null;
  const xp = useLiveQuery(() => loadExpected(t.date), [t.date]);
  const shine = useWinShine(t.date);
  useMarkMatchNight(t.date, Boolean(t.fixture) && !t.played.length);
  const ranks = useRanks(t, (t.fixture ?? t.next)?.opp || undefined);
  const watch = onWatch ?? ((id: string) => go('/football/match', { id }));
  const moment = momentOf(t);
  if (moment) return <div className="lt-moment">{moment}</div>;
  const away = t.unwatchedAuto.filter((m) => m.date !== t.date);
  const waiting = (
    <>
      {t.save.paused && <WaitingMatch save={t.save} />}
      {away.length > 0 && <CatchUp ms={away} />}
      <MorningCards m={t.morning} />
    </>
  );
  // Tonight is played: the result leads, as it always has.
  if (t.played.length) return <div className="k-page lt-page">{waiting}{t.played.map((m) => <FullTime key={m.id} m={m} save={t.save} onWatch={() => watch(m.id)} />)}</div>;

  const f = t.fixture;
  const own = crestSvg(t.save.crest.step, t.save.crest.opt, 96);
  const many = t.fixtures.length > 1;
  const pace = f ? paceSum(t) : undefined;
  const unlogged = AXES.filter((a) => t.flags[a] === 'not-logged');
  const noData = AXES.filter((a) => t.flags[a] === 'no-data');
  const league = Boolean(t.tactic && f?.comp === 'league' && t.opp);
  const p = t.tactic ? planFor(t.save, t.date, t.tactic.pick) : undefined;
  const read = league && p && t.opp ? readOf(p, { id: t.opp.id, style: t.opp.style }, readScouted(scoutLevel(t.save, t.opp.id))) : undefined;
  const paced = paceOn(t.save, t.date) && !t.morning.intl;
  const night = paceNight(t.save.day, breakBeforeFor(t.save));
  // On a night with no match, the header shows the next one, marked tomorrow.
  const hf = f ?? t.next;
  const hopp = t.opp ?? (t.next?.opp ? clubById(t.next.opp) : undefined);
  const where = hf ? [f ? undefined : 'Tomorrow', hf.round ?? hf.label, hf.opp ? (hf.braboHome ? 'home' : 'away') : undefined].filter(Boolean).join(' · ') : 'Between seasons';
  // One glowing action: last night's match first, then the plan.
  const act = t.save.paused
    ? <Action wide onClick={watchWaiting}>Watch last night’s match</Action>
    : t.tactic && f ? <Action wide onClick={() => setPlan(true)}>Change the plan</Action> : null;

  return (
    <div className="k-page lt-page">
      {!f && t.next && !t.morning.intl && <NoMatchTonight t={t} next={t.next} />}
      {t.morning.intl && <Panel ink="#93c3dc"><b className="k-lb">No game tonight</b><span className="k-q">The season waits for the break. Next up, once it’s over:</span></Panel>}
      {hf ? (
        <TonightHero
          look={heroLook({ comp: hf.comp, rival: Boolean(hopp && t.save.rivals.some((r) => r.clubId === hopp.id)), big: Boolean(ranks?.big) })}
          us={{ name: 'Brabo', crest: own, ink: BRABO_INK, pos: ranks?.us?.pos, form: ranks?.us?.form }}
          them={hopp ? { name: hopp.name, crest: clubCrest(hopp, 96), ink: lossInkOf(hopp.id), pos: ranks?.them?.pos, form: ranks?.them?.form } : undefined}
          where={where}
          tag={ranks?.top ? 'Top-of-the-table clash' : undefined}
          chance={!many && chance && t.opp && !t.morning.intl ? (() => { const s = shownChance(chance, lateFor(t.date)); return { p: chancePercents(s.c), usual: s.usual }; })() : undefined}
          shine={shine}
        />
      ) : (
        <header className="lt-lead lt-quiet"><span className="lt-vs"><b className="lt-opp">{where}</b></span></header>
      )}
      {many && <NightList t={t} chances={chances ?? []} />}
      {pace && <PaceSumView p={pace} />}
            {xp && t.opp && !t.morning.intl && <p className="k-q lt-ctr">The head of data: <b>{xpWords(xp.xp, xp.usual).replace(/^E/, 'e')}</b>.</p>}
      {unlogged.map((a) => (
        <Panel key={a} ink={AXIS_INK[a]}><span><b style={{ color: AXIS_INK[a] }}>{a} isn’t logged yet.</b> It plays low and wild until {LOG_FOR[a]}.</span></Panel>
      ))}
      {noData.length > 0 && <Panel ink={AXIS_INK[noData[0]]}><span><b style={{ color: AXIS_INK[noData[0]] }}>{noData.join(' and ')} {noData.length === 1 ? 'has' : 'have'} no data yet.</b> No data plays as an even 10.</span></Panel>}
      {f && t.tactic && (
        <div className={`lt-plan${league ? '' : ' one'}`}>
          <Panel ink={BRABO} onClick={() => setPlan(true)} label="Change the plan"><span className="k-q">Plan</span><b className="lt-v" style={{ color: '#ff9a4d' }}>{TACTIC_NAME[t.tactic.pick]}</b></Panel>
          {league && p && <Panel onClick={() => setPlan(true)} label="Change the tempo"><span className="k-q">Tempo</span><b className="lt-v">{TEMPO_NAME[p.tempo ?? 'normal']}</b></Panel>}
          {league && p && <Panel onClick={() => setPlan(true)} label="Change the width"><span className="k-q">Width</span><b className="lt-v">{WIDTH_NAME[p.width ?? 'middle'].replace('Through the ', '').replace('Down the ', '').replace(/^./, (c) => c.toUpperCase())}</b></Panel>}
        </div>
      )}
      {read && <Panel ink={read.tacticRight || read.widthRight ? '#f2c46d' : '#93c3dc'}><b className="k-lb">{read.tacticRight && read.widthRight ? 'Good read' : 'The read'}</b><span className="k-q">{read.line}</span></Panel>}
      {paced && night.matchdays.length > 1 && <Panel ink="#f2c46d"><b className="k-lb">Three a day: {matchdayList(night.matchdays)} tonight</b><span className="k-q">{night.rounds.length ? `${night.rounds.join('; ')} on the way. ` : ''}All on today’s numbers, each with its own dice. You watch the last one; your assistant plays the others.</span></Panel>}
      <Waiting t={t} />
      {waiting}
      {(t.known.length > 0 || t.hiddenNote) && (
        <Panel ink="#c2b2ff">
          <b className="k-lb">Their abilities</b>
          {t.known.map((a) => <span key={a.name} className="k-q"><b style={{ color: '#ede6da' }}>{a.name}</b> · {a.text}</span>)}
          {t.hiddenNote && <span className="k-q">{t.known.length ? 'One more' : 'One ability'}, found out after you first play them.</span>}
        </Panel>
      )}
      {(t.knocks.length > 0 || t.stack > 0 || (t.loansPlaying.length > 0 && !t.morning.intl)) && (
        <Panel ink="#8fdcb6">
          <b className="k-lb">Your side tonight</b>
          {t.knocks.map((k) => <span key={k.why} className="k-q"><b style={{ color: '#ede6da' }}>{k.why}</b>{k.d ? ` · ${k.axis} ${k.d > 0 ? '+' : ''}${k.d}` : ''}</span>)}
          {t.stack > 0 && <span className="k-q"><b style={{ color: '#ede6da' }}>Weekly stack</b> · {t.stack} {t.stack === 1 ? 'ability' : 'abilities'} earned this week lift your attack</span>}
          {t.loansPlaying.length > 0 && !t.morning.intl && <span className="k-q">{t.xi.filter((x) => x.player.startsWith('loan:')).map((x) => x.name).join(' and ')} on loan in the eleven{t.loanRested.length ? `; ${t.loanRested.length === 1 ? 'one starter rests' : `${t.loanRested.length} starters rest`} to make room` : ''}.</span>}
        </Panel>
      )}
      <TonightDoors t={t} />
      {act && <div className="lt-act">{act}</div>}
      {plan && t.tactic && (
        <Sheet title="Tonight’s plan" sub={f && t.opp ? `${where} v ${t.opp.name}` : undefined} onClose={() => setPlan(false)}>
          <div className="lt-sheet">
            {league && p && t.opp
              ? <PlanPanel date={t.date} tactic={t.tactic} plan={p} read={read} xi={t.xi} cards={t.save.tacticCards ?? []} />
              : <TacticPicker date={t.date} pick={t.tactic.pick} by={t.tactic.by} />}
            <p className="k-q">The plan can change until kick-off. Tonight’s match is set up at 4 am and waits in the morning parcel.</p>
            <Action wide onClick={() => setPlan(false)}>Done</Action>
          </div>
        </Sheet>
      )}
    </div>
  );
}

const WORD_N = ['No', 'One', 'Two', 'Three', 'Four'];
/** The chance that belongs to a fixture: by opponent (one drawn on the night has none yet). */
export const chanceFor = (f: Fixture, cs: NightChance[]) => (f.opp ? cs.find((c) => c.oppId === f.opp) : undefined);
const shortName = (id: string) => { const c = clubById(id); return c.short && c.name.length > 12 ? c.name.split(' ')[0] : c.name; };

/** Every match of a double-header night (finding 1, O42): each with its crest, where it is, and its own chance. */
function NightList({ t, chances }: { t: TonightData; chances: NightChance[] }) {
  return (
    <section className="lt-night" aria-label={`${WORD_N[t.fixtures.length] ?? t.fixtures.length} matches tonight`}>
      <h2 className="k-sect">{WORD_N[t.fixtures.length] ?? t.fixtures.length} matches tonight</h2>
      {t.fixtures.map((f, i) => {
        const c = chanceFor(f, chances);
        const opp = f.opp ? clubById(f.opp) : undefined;
        return (
          <Panel key={`${f.comp}:${f.opp}:${i}`} ink={f.comp === 'league' ? '#93c3dc' : '#f2c46d'}>
            <div className="lt-nrow">
              {opp ? <Art svg={clubCrest(opp, 40)} className="lt-ncrest" /> : <span className="lt-ncrest lt-unknown" aria-hidden="true" />}
              <span className="lt-ntext">
                <span className="k-q">{f.round ?? f.label}{f.opp ? ` · ${f.braboHome ? 'home' : 'away'}` : ''}</span>
                <b>{opp ? `v ${opp.name}` : 'Drawn on the night'}</b>
              </span>
            </div>
            {c && opp && !t.morning.intl && <ChanceBar c={c} oppName={shortName(opp.id)} oppId={opp.id} date={t.date} values={t.liveValues} />}
          </Panel>
        );
      })}
      <p className="k-q">One shape plays {t.fixtures.length === 2 ? 'both' : 'them all'}. Each has its own chance.</p>
    </section>
  );
}

/** Tonight's pledge, when one is made, and the week's count: a filled panel in Rest's blue. */
function Waiting({ t }: { t: TonightData }) {
  const days = useAllDays();
  if (!days) return null;
  const map = new Map(days.map((d) => [d.date, d]));
  const made = map.get(t.date)?.pledge;
  const strip = weekStrip(map, t.date);
  if (!made && !strip.nights.length) return null;
  return (
    <Panel ink={AXIS_INK.Rest}>
      <div className="k-row"><b className="k-lb">Lights-out pledge</b><span className="k-q">kept {strip.kept} of {strip.nights.length} this week</span></div>
      <span className="k-q">{made ? (made.at === null ? 'Not tonight. That costs nothing.' : `Lights out by ${clockOf(made.at)} tonight.`) : 'Made after your session or your evening meal.'}</span>
      {strip.nights.length > 0 && <span className="lt-dots" aria-hidden="true">{strip.nights.map((x) => <i key={x.date} className={x.kept ? 'on' : ''} />)}</span>}
    </Panel>
  );
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
/** The rest of tonight, one tap away: how it adds up, the desk, the cups. */
function TonightDoors({ t }: { t: TonightData }) {
  const desk = useLiveQuery(() => loadDesk(t), [t]);
  const cup = useLiveQuery(async () => {
    const run = await loadRun();
    const book = await loadBook();
    const live = run && !run.run.over ? run.run : null;
    return { live: Boolean(live), name: cupByN(live ? live.cup : cupsOpen(book)).name };
  }, []);
  const dice = desk && (desk.dice.length || desk.desk.spends.length) ? desk : null;
  return (
    <>
      <Sect>Around tonight</Sect>
      <div className="lt-doors">
        <FamilyDoors two label="Around tonight" groups={{
          plans: [
            <Door key="blend" icon="trend" name="How it adds up" value="Your shape" count={t.nudges.length ? `${t.nudges.length} ${t.nudges.length === 1 ? 'nudge' : 'nudges'} in it` : undefined} family="plans" onClick={() => go('/football/blend')} />,
            dice && <Door key="desk" icon="desk" name="The desk" value={dice.shut ? 'Closed' : dice.left.length ? `${WORDS[dice.left.length] ?? dice.left.length} dice` : 'All spent'} family="plans" onClick={() => go('/football/desk')} />,
          ],
          world: [cup && <Door key="cup" icon="win" name={cup.live ? 'A cup run' : 'Cups'} value={cup.name.replace(/^The /, '')} family="world" onClick={() => go(cup.live ? '/football/cup/run' : '/football/cup')} />],
        }} />
      </div>
    </>
  );
}
