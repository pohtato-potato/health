// The League section: the table first, then the pyramid, the calendar and the cups, one tap apart.
import { useLiveQuery } from 'dexie-react-hooks';
import type { CSSProperties } from 'react';
import { clubById, tierName } from '../../../football/data/load';
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { ordinal } from '../../../football/habitLines';
import type { Row } from '../../../football/table';
import { Art } from '../world/Fog';
import { loadLeague, type League } from '../../../football/store/league';
import { OWN } from '../../../football/store/season';
import type { Tier } from '../../../football/types';
import { go, useRoute } from '../../../router';
import { TIER_CUP } from '../../../football/cups';
import { Calendar, TonightLead } from './Calendar';
import { fixtureFor } from '../../../football/store/tonight';
import { ContinentalView, Cup } from './Cups';
import { Events, eventRows } from './Events';
import { BackPageCard, NewsView, useNews } from './News';
import { Pyramid } from './Pyramid';
import { FinalTable, Table } from './Table';
import { atlasOf } from '../world/Atlas';
import { Door, FamilyDoors, Sect } from '../../../ui/kit/Kit';
import { Icon } from '../../../ui/Icon';
import { worldOf } from '../../../football/pyramid/shape';
import { PAIRCUP_ID } from '../../../football/pyramid/cups';
import { EveryDivision, FullTable2, LeagueHome2 } from './League2';
import { CongressDoor } from '../desk/Congress';

/** The day the league finished this season, as "15 Nov". */
export const endedOn = (l: League) => { const d = l.season.leagueEnded?.date ?? l.season.dates[Math.max(0, ...Object.keys(l.season.dates).map(Number))]; return d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'this season'; };

export const LEAGUE_VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'pyramid', label: 'Pyramid' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'cups', label: 'Cups' },
  // World 2 (LG-4): the full table of 12 behind the League's top four, and every division with its fog.
  { id: 'full', label: 'The full table' },
  { id: 'divisions', label: 'Every division' },
] as const;
export type LeagueView = (typeof LEAGUE_VIEWS)[number]['id'] | 'news';

export function LeagueView({ l, view, tier, extra, n }: { l: League; view: LeagueView; tier?: Tier; extra?: Partial<Record<LeagueView, React.ReactNode>>; n?: { news: import('../../../football/store/tables').FbNews[]; matches: import('../../../football/store/tables').StoredMatch[]; today: string } }) {
  const mine = l.season.tierOf[OWN];
  const t = tier ?? mine;
  const set = (p: Record<string, string | undefined>) => go('/football/league', p, { replace: true });
  const world = worldOf(l.season);
  if (world === 2 && view === 'table' && !tier) return <><LeagueHome2 l={l} n={n} />{extra?.table ?? null}</>;
  if (world === 2 && (view === 'full' || (view === 'table' && tier === mine))) return <FullTable2 l={l} />;
  if (world === 2 && (view === 'divisions' || view === 'pyramid' || view === 'table')) return <EveryDivision l={l} tier={tier} />;
  return (
    <>
      {view === 'news' && n && <NewsView news={n.news} matches={n.matches} today={n.today} />}
      {view === 'table' && (
        <>
          {!tier && l.season.final && <FinalTable tier={mine} rows={l.season.final.tables[mine] ?? []} division={tierName(mine)} own={crestSvg(l.save.crest.step, l.save.crest.opt, 72)} ended={endedOn(l)} />}
          {!tier && !l.season.final && (() => {
            const rows = l.tables[mine] ?? [];
            const me = rows.find((r) => r.id === OWN);
            return (
              <>
                <LeagueHead crest={crestSvg(l.save.crest.step, l.save.crest.opt, 76)} pos={rows.indexOf(me!) + 1} division={tierName(mine)} line={`of ${rows.length} · ${l.save.phase === 'season' ? `Day ${l.save.day} of 42` : 'Between seasons'} · ${me?.p ?? 0} played`} />
                <CrestLadder rows={rows} own={crestSvg(l.save.crest.step, l.save.crest.opt, 30)} up={mine > 1 ? 2 : 0} down={mine < 6 ? 3 : 0} division={tierName(mine)} />
              </>
            );
          })()}
          {n && <BackPageCard news={n.news} matches={n.matches} today={n.today} more />}
          <div className="fb-tierpick">
            <button type="button" className="fb-btn sm" disabled={t === 1} aria-label={t > 1 ? `Up to ${tierName((t - 1) as Tier)}` : 'Top tier'} onClick={() => set({ tier: String(t - 1) })}><Icon name="up" size={22} stroke={2} /></button>
            <span className="fb-s">{t === mine ? 'Your division' : `${Math.abs(t - mine)} ${Math.abs(t - mine) === 1 ? 'tier' : 'tiers'} ${t < mine ? 'above' : 'below'} you`}</span>
            <button type="button" className="fb-btn sm" disabled={t === 6} aria-label={t < 6 ? `Down to ${tierName((t + 1) as Tier)}` : 'Bottom tier'} onClick={() => set({ tier: String(t + 1) })}><Icon name="down" size={22} stroke={2} /></button>
          </div>
          {(tier || !l.season.final) && <Table tier={t} rows={l.tables[t]} form={l.form} waiting={Boolean(l.save.paused)} day={l.save.phase === 'season' ? `Day ${l.save.day} of 42` : 'Between seasons'} own={t === mine ? crestSvg(l.save.crest.step, l.save.crest.opt, 30) : undefined} />}
        </>
      )}
      {view === 'table' && !tier && (
        <>
          <Sect>Around the league</Sect>
          <FamilyDoors two label="Around the league" groups={{ world: [
            <Door key="pyr" icon="ground" name="The pyramid" value={tierName(mine)} family="world" onClick={() => set({ view: 'pyramid' })} />,
            <Door key="atlas" icon="scope" name="The atlas" value={`${atlasOf(l).seen}% seen`} family="world" onClick={() => go('/football/atlas')} />,
            <Door key="cups" icon="pack" name="The cups" value={l.season.bigcup ? 'This season' : 'None yet'} family="world" onClick={() => set({ view: 'cups' })} />,
            <Door key="cal" icon="list" name="Calendar" value={l.save.phase === 'season' ? `Day ${l.save.day}` : 'Break'} family="world" onClick={() => set({ view: 'calendar' })} />,
            <CongressDoor key="congress" save={l.save} />,
          ] }} />
        </>
      )}
      {view === 'pyramid' && <Pyramid tierOf={l.season.tierOf} rating={l.rating} onTier={(x) => set({ tier: String(x) })} />}
      {view === 'calendar' && (
        <Calendar
          season={l.save.season}
          world={world}
          today={l.save.phase === 'season' ? l.save.day : 0}
          cont={Boolean(l.season.continental?.field.includes(OWN))}
          matches={l.matches}
          events={eventRows(l.matches).map((r, i) => ({ day: i + 1, label: `${r.label}: ${r.text}`, result: r.result }))}
          lead={(() => {
            const f = fixtureFor(l.save, l.season);
            if (!f) return null;
            const us = crestSvg(l.save.crest.step, l.save.crest.opt, 44);
            const name = f.opp ? clubById(f.opp).name : f.round ?? f.label;
            return <TonightLead us={us} them={f.opp ? clubCrest(clubById(f.opp), 44) : undefined} name={name} line={[f.label, f.opp ? f.round : undefined, f.opp ? (f.braboHome ? 'at home' : 'away') : undefined].filter(Boolean).join(' · ')} />;
          })()}
        />
      )}
      {view === 'cups' && (
        <>
          <Events event={l.save.phase === 'event' ? l.save.event : undefined} matches={l.matches} />
          {l.season.continental && (l.season.continental.field.includes(OWN) || mine === 1) && <ContinentalView c={l.season.continental} tierOf={l.season.tierOf} world={world} />}
          <Cup b={l.season.bigcup} tierOf={l.season.tierOf} />
          {world === 2
            ? l.season.tiercups[PAIRCUP_ID] && <Cup b={l.season.tiercups[PAIRCUP_ID]} tierOf={l.season.tierOf} />
            : l.season.tiercups[TIER_CUP[mine].id] && <Cup b={l.season.tiercups[TIER_CUP[mine].id]} tierOf={l.season.tierOf} />}
        </>
      )}
      {extra?.[view] ?? null}
    </>
  );
}


/** The League's head (board 19, l19-home): your crest beside your position, the division and how far in. */
export function LeagueHead({ crest, pos, division, line }: { crest: string; pos: number; division: string; line: string }) {
  const word = pos ? ordinal(pos) : '';
  return (
    <div className="lh19">
      <span className="cr"><Art svg={crest} /></span>
      <div>
        <b className="fb-num" aria-label={pos ? word : 'No position yet'}>{pos ? <>{pos}<sup>{word.slice(String(pos).length)}</sup></> : '–'}</b>
        <strong>{division}</strong>
        <span>{line}</span>
      </div>
    </div>
  );
}

const ZONE_INK = { up: '#ffd36b', po: '#c2b2ff', dn: '#93c3dc' } as const;
const ZONE_WORD = { up: 'promotion place', po: 'play-off place', dn: 'relegation place' } as const;
/** Every crest in table order, the zones as a line under them and in words for a screen reader. `up` and `down`
 *  are how many go up and down (0 where none do); third to sixth are the play-offs wherever clubs go up. */
export function CrestLadder({ rows, own, up, down, division }: { rows: Row[]; own: string; up: number; down: number; division: string }) {
  const zone = (pos: number) => (pos <= up ? 'up' : up && pos >= 3 && pos <= 6 ? 'po' : down && pos > rows.length - down ? 'dn' : undefined);
  return (
    <ol className="ld19" aria-label={`${division} in order, by crest`}>
      {rows.map((r, i) => {
        const me = r.id === OWN;
        const z = zone(i + 1);
        const name = me ? 'Brabo United (you)' : clubById(r.id).name;
        return (
          <li key={r.id} className={me ? 'me' : undefined} aria-label={`${i + 1}, ${name}${z ? `, ${ZONE_WORD[z]}` : ''}`} style={{ '--zc': z ? ZONE_INK[z] : 'rgba(243, 238, 230, .2)', '--d': `${0.2 + i * 0.06}s` } as CSSProperties}>
            <Art svg={me ? own : clubCrest(clubById(r.id), 24)} /><i aria-hidden="true">{i + 1}</i>
          </li>
        );
      })}
    </ol>
  );
}

export function LeagueHome() {
  const { params } = useRoute();
  const l = useLiveQuery(loadLeague, []);
  const n = useNews();
  if (l === undefined) return null;
  if (l === null) return <p className="fb-s">The league starts once you found the club.</p>;
  const view = (params.get('view') === 'news' ? 'news' : LEAGUE_VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'table') as LeagueView;
  const tq = Number(params.get('tier'));
  return <LeagueView l={l} view={view} n={n} tier={tq >= 1 && tq <= (worldOf(l.season) === 2 ? 8 : 6) ? (tq as Tier) : undefined} />;
}
