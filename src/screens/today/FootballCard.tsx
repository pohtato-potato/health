// Today's one Football card (spec §3.3). It changes through the day: last night's match sealed in the morning,
// half-time from 6 pm, and tonight's match waiting once the day is closed. It never shows a score.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { dayOfLogging } from '../../domain/dates';
import { clubCrest, crestSvg } from '../../football/art/crest';
import { clubById } from '../../football/data/load';
import { loadTonight, type Tonight } from '../../football/store/hooks';
import { OWN } from '../../football/store/season';
import type { Fixture } from '../../football/store/tonight';
import type { FbSave, StoredMatch } from '../../football/store/tables';
import { AXES } from '../../football/types';
import { back, go } from '../../router';
import { Aurora } from '../football/FootballHome';
import { Radar } from '../football/Radar';
import { Art } from '../football/Tonight';

export type FootballCardState = 'sealed' | 'halftime' | 'evening' | 'none';
export const HALF_TIME_HOUR = 18;

/** Which face the card shows. The only time-of-day rule in Football: it changes the card, never the match. */
export function footballCardState(now: number, last?: StoredMatch, tonight?: Fixture): FootballCardState {
  if (!last && !tonight) return 'none';
  const today = dayOfLogging(now);
  const playedToday = last?.date === today;
  if (last && !last.watched && playedToday) return 'evening';
  const hour = new Date(now).getHours();
  // The logging day runs to 4 am, so half-time lasts from 6 pm until then.
  if (tonight && !playedToday && (hour >= HALF_TIME_HOUR || hour < 4)) return 'halftime';
  if (last && !last.watched) return 'sealed';
  return 'none';
}

const name = (id: string) => (id === OWN ? 'Brabo United' : clubById(id).name);
const crest = (save: FbSave, id: string, size: number) => (id === OWN ? crestSvg(save.crest.step, save.crest.opt, size) : clubCrest(clubById(id), size));

function Sealed({ m, save, title, line }: { m: StoredMatch; save: FbSave; title: string; line: string }) {
  return (
    <button type="button" className="fb-todaycard" onClick={() => go('/football/match', { id: m.id })}>
      <span className="fb-lb">{title}</span>
      <span className="fb-duel sm">
        <Art svg={crest(save, m.home, 40)} />
        <b className="fb-v" aria-hidden="true">v</b>
        <Art svg={crest(save, m.away, 40)} />
      </span>
      <span className="fb-s">{name(m.home)} v {name(m.away)}</span>
      <span className="fb-sealed">Sealed · {line}</span>
    </button>
  );
}

export function FootballCardView({ state, t, last }: { state: FootballCardState; t?: Tonight | null; last?: StoredMatch }) {
  if (state === 'none' || !t) return null;
  const save = t.save;
  let body: React.ReactNode = null;
  if (state === 'sealed' && last) body = <Sealed m={last} save={save} title="Last night" line="tap to watch" />;
  else if (state === 'evening' && last) body = <Sealed m={last} save={save} title="Tonight’s match" line="played, waiting for you" />;
  else if (state === 'halftime') {
    const weakest = AXES.filter((a) => !t.flags[a]).sort((a, b) => t.liveValues[a] - t.liveValues[b])[0];
    const presses = t.opp ? AXES.filter((a) => (t.opp!.presses[a] ?? 0) > 0) : [];
    body = (
      <button type="button" className="fb-todaycard" onClick={() => go('/football')}>
        <span className="fb-row"><span className="fb-lb">Half-time</span><span className="fb-s">{t.fixture?.label ?? ''}</span></span>
        <span className="fb-ht">
          <Radar values={t.liveValues} flags={t.flags} size={96} bare label="Tonight’s shape so far" />
          <span className="fb-col">
            <b>{t.opp ? `v ${t.opp.name}` : t.fixture?.round ?? 'Tonight'}</b>
            <span className="fb-s">{weakest ? `Weakest so far: ${weakest} ${t.liveValues[weakest]}` : 'Nothing logged yet today'}</span>
            {presses.length > 0 && <span className="fb-s">They press on {presses.join(' and ')}</span>}
          </span>
        </span>
        <span className="fb-s">Closing the day kicks off the match. Or it plays itself at 4 am.</span>
      </button>
    );
  }
  if (!body) return null;
  return <Aurora className="fb-todaywrap">{body}</Aurora>;
}

/** The live card: the latest match and tonight's fixture. */
export function FootballCard({ now }: { now: number }) {
  const date = dayOfLogging(now);
  const got = useLiveQuery(async () => {
    const t = await loadTonight(date);
    if (!t) return { t: null, last: undefined };
    const last = await db.fbMatches.orderBy('date').last();
    return { t, last };
  }, [date]);
  if (!got?.t) return null;
  return <FootballCardView state={footballCardState(now, got.last, got.t.fixture)} t={got.t} last={got.last} />;
}

/** Close the day's last screen: the two crests, the fixture, Watch now and Later (Later keeps it sealed). */
export function KickOffCard({ m, save, onWatch, onLater }: { m: StoredMatch; save: FbSave; onWatch: () => void; onLater: () => void }) {
  return (
    <Aurora className="fb-todaywrap fb-kickoff">
      <div className="fb-todaycard" role="group" aria-label="Kick-off">
        <span className="fb-lb">Kick-off</span>
        <span className="fb-duel sm">
          <Art svg={crest(save, m.home, 48)} />
          <b className="fb-v" aria-hidden="true">v</b>
          <Art svg={crest(save, m.away, 48)} />
        </span>
        <span className="fb-s">{name(m.home)} v {name(m.away)}</span>
        {m.round && <span className="fb-s">{m.round}</span>}
        <span className="fb-s">Your shape is fixed for tonight.</span>
        <span className="fb-btns">
          <button type="button" className="fb-btn" onClick={onLater}>Later</button>
          <button type="button" className="fb-btn pri" onClick={onWatch}>Watch now</button>
        </span>
      </div>
    </Aurora>
  );
}

/** Close the day's kick-off: shows once the closed day's match is stored. */
export function DayKickOff({ date }: { date: string }) {
  const got = useLiveQuery(async () => {
    const save = await db.fbSave.get('save');
    const m = save ? await db.fbMatches.where('date').equals(date).first() : undefined;
    return save && m ? { save, m } : null;
  }, [date]);
  if (!got) return null;
  return <KickOffCard m={got.m} save={got.save} onWatch={() => go('/football/match', { id: got.m.id })} onLater={() => back('/today')} />;
}
