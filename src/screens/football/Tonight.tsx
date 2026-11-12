import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
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
import { Radar } from './Radar';
import { AXES } from '../../football/types';
import { PlanPanel } from './match/MatchBits';
import { WaitingMatch } from './match/Waiting';
import { planFor, readScouted, scoutLevel } from '../../football/store/paused';
import { readOf } from '../../football/matchday';
import { MorningCards } from './world/WorldScreens';
import { TacticPicker } from './players/Rotation';

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

export function TonightView({ t, onWatch }: { t: TonightData; onWatch?: (id: string) => void }) {
  const own = { step: t.save.crest.step, opt: t.save.crest.opt };
  const watch = onWatch ?? ((id: string) => go('/football/match', { id }));
  const f = t.fixture;
  const awake = (t.save.awakeLog ?? [])[t.save.awakeSeen ?? 0];
  const opening = t.save.openings?.[0];
  const bornId = t.save.rivalMoments?.[0];
  const born = bornId ? t.save.rivals.find((r) => r.clubId === bornId) : undefined;
  const quiet = !t.change && !t.save.crestPending;
  const away = t.unwatchedAuto.filter((m) => m.date !== t.date);
  const catchUp = (
    <>
      {t.change && <SeasonChangeView c={t.change} onDone={() => void markSeasonSeen(t.change!.season)} />}
      {!t.change && t.save.crestPending && <LevelUpView from={t.save.crest} step={t.save.crestPending} onPick={(o) => void levelUpCrest(o)} />}
      {!t.change && !t.save.crestPending && opening && <OpeningNightView id={opening} onDone={() => void markOpened(opening)} />}
      {quiet && !opening && born && <RivalBornView r={born} onDone={() => void markRivalSeen(born.clubId)} />}
      {quiet && !opening && !born && awake && <AwakeningView axis={awake.axis} at={awake.band} values={t.liveValues} onDone={() => void markAwakeSeen(t.save.awakeLog!.length)} />}
      {away.length > 0 && <CatchUp ms={away} />}
      {t.save.paused && <WaitingMatch save={t.save} />}
      <MorningCards m={t.morning} />
    </>
  );
  if (t.played.length) return <>{catchUp}{t.played.map((m) => <FullTime key={m.id} m={m} save={t.save} onWatch={() => watch(m.id)} />)}</>;
  return (
    <>
      {catchUp}
      {t.morning.intl && <p className="fb-s fb-ctr"><b>No game tonight: the season waits for the break.</b> Next up, once it's over:</p>}
      <div className="fb-row">
        <span className="fb-lb">{f?.label ?? 'Between seasons'}</span>
        <span className="fb-s">{t.morning.intl ? 'After the break' : 'Half-time 6 pm'}</span>
      </div>
      {f && (
        <>
          <div className="fb-duel">
            <figure className="fb-side">
              <Art svg={crestSvg(own.step, own.opt, 56)} />
              <figcaption>Brabo United</figcaption>
            </figure>
            <b className="fb-v" aria-hidden="true">v</b>
            <figure className="fb-side">
              {t.opp ? <Art svg={clubCrest(t.opp, 56)} /> : <span className="fb-unknown" aria-hidden="true">?</span>}
              <figcaption>{t.opp ? t.opp.name : 'Drawn on the night'}</figcaption>
            </figure>
          </div>
          <h2 className="fb-hl">{t.opp ? `${t.morning.intl ? 'Next' : 'Tonight'}: ${t.opp.name}` : f.round ?? 'Tonight'}</h2>
          <p className="fb-s fb-ctr">{[f.round, f.opp ? (f.braboHome ? 'Home' : 'Away') : undefined].filter(Boolean).join(' · ')}</p>
          {t.also && <p className="fb-s fb-ctr"><b>{t.also}</b></p>}
        </>
      )}
      <Radar values={t.liveValues} flags={t.flags} fog={AXES.filter((a) => t.flags[a])} captain={t.save.slots.includes('armband') ? t.save.captain : undefined} />
      <p className="fb-s fb-ctr">Your shape so far. It’s fixed when you close the day.{AXES.some((a) => t.flags[a] === 'not-logged') ? ' An axis marked ? isn’t logged yet: left that way, it plays low and unpredictable.' : ''}</p>
      {t.loansPlaying.length > 0 && !t.morning.intl && <p className="fb-s fb-ctr">{t.xi.filter((x) => x.player.startsWith('loan:')).map((x) => x.name).join(' and ')} on loan in the eleven tonight{t.loanRested.length ? `; ${t.loanRested.length === 1 ? 'one starter rests' : `${t.loanRested.length} starters rest`} to make room` : ''}.</p>}
      {t.tactic && f?.comp === 'league' && t.opp ? (
        <>
          <PlanPanel date={t.date} tactic={t.tactic} plan={planFor(t.save, t.date, t.tactic.pick)} read={readOf(planFor(t.save, t.date, t.tactic.pick), { id: t.opp.id, style: t.opp.style }, readScouted(scoutLevel(t.save, t.opp.id)))} xi={t.xi} cards={t.save.tacticCards ?? []} />
          <p className="fb-s fb-ctr">The match plays at 4 am and waits for you in the morning: watch it with your calls, or skip to the result. The plan can change until kick-off.</p>
          <button type="button" className="fb-btn sm" onClick={() => go('/football/blend')}>How tonight adds up ›</button>
        </>
      ) : t.tactic && <TacticPicker date={t.date} pick={t.tactic.pick} by={t.tactic.by} />}
      {(t.known.length > 0 || t.hiddenNote) && (
        <section className="fb-card pu" aria-label="Their abilities">
          <span className="fb-lb">Their abilities</span>
          {t.known.map((a) => (
            <div key={a.name} className="fb-col"><b>{a.name}</b><span className="fb-s">{a.text}</span></div>
          ))}
          {t.hiddenNote && <p className="fb-s">One ability, found out after you first play them.</p>}
        </section>
      )}
      {(t.knocks.length > 0 || t.stack > 0) && (
        <section className="fb-card" aria-label="Your side tonight">
          {t.knocks.map((k) => <p key={k.why} className="fb-s"><b>{k.why}</b>{k.d ? ` · ${k.axis} ${k.d > 0 ? '+' : ''}${k.d}` : ''}</p>)}
          {t.stack > 0 && <p className="fb-s"><b>Weekly stack</b> · {t.stack} {t.stack === 1 ? 'ability' : 'abilities'} earned this week lift your attack</p>}
        </section>
      )}
    </>
  );
}
