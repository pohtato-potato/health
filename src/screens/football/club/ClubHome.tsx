// The Club section: the squad first, then deals, money, kits and the ground, one tap apart.
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { tierName, TIER_NAMES } from '../../../football/data/load';
import { loadClub, type Club } from '../../../football/store/club';
import { acceptOffer, equipAbility, keepHabit, pickKit, renewContract, sellHabit, setCaptain, setOwnSponsor, setSponsorStyle, bookMove } from '../../../football/store/save';
import { KitsView } from './Kits';
import { kitWall } from '../../../football/store/kitWall';
import { GroundView } from './Ground';
import { DealsView } from './Deals';
import { MoneyView } from './Money';
import { go, useRoute } from '../../../router';
import { PlayerView } from './Player';
import { SquadView } from './Squad';
import { Pitch } from '../players/Screens';
import { TreeHome } from '../tree/TreeScreens';
import { useWorldDoors } from '../world/WorldScreens';
import { useModel } from '../tree/model';
import { Kaai } from './Kaai';
import { Art } from '../Tonight';
import { Action, Door, Doors, Hero, Panel, Sect, Title, type HowThisWorks } from '../../../ui/kit/Kit';
import { usePlayers, useSheet, useTonight } from '../../../football/store/hooks';
import { loadLeague } from '../../../football/store/league';
import { loadDesk } from '../../../football/store/desk';
import { OWN } from '../../../football/store/season';
import { clubById } from '../../../football/data/load';
import { crestSvg } from '../../../football/art/crest';
import { elevenOf, UNIT_COLOUR } from '../../../football/players/eleven';
import { membersOf } from '../../../football/store/players';
import { AXES } from '../../../football/types';
import { euros } from '../../../football/money';
import { fmtCount } from '../../../football/tree/words';
import { VALUE_INK, valueTier } from '../../../ui/inks';

export const CLUB_VIEWS = [
  { id: 'squad', label: 'Squad' },
  { id: 'tree', label: 'Tree' },
  { id: 'deals', label: 'Deals' },
  { id: 'money', label: 'Money' },
  { id: 'kits', label: 'Kits' },
  { id: 'ground', label: 'Ground' },
] as const;
export type ClubViewId = (typeof CLUB_VIEWS)[number]['id'];

export const useClub = () => useLiveQuery(() => loadClub(), []);

export function ClubView({ c, view }: { c: Club; view: ClubViewId; extra?: Partial<Record<ClubViewId, ReactNode>> }) {
  return (
    <>
      {view === 'squad' && <SquadPage c={c} />}
      {view === 'deals' && <DealsView c={c} act={{ renew: (h) => void renewContract(h, c.today!), keep: (h) => void keepHabit(h, c.today!), sell: (h) => void sellHabit(h) }} />}
      {view === 'money' && <MoneyView c={c} onAccept={(o) => void acceptOffer(o)} onOwn={(n, s) => void setOwnSponsor(n, s)} />}
      {view === 'kits' && <KitsView c={c} act={{ pick: (s, sl, id) => void pickKit(s, sl, id), style: (sp) => void setSponsorStyle(sp) }} />}
      {view === 'ground' && <GroundView c={c} onMove={(on) => void bookMove(on)} />}
      {view === 'tree' && <TreeHome />}
    </>
  );
}

/** The squad page (a door on Club): the six units, then the habits that make the club. */
function SquadPage({ c }: { c: Club }) {
  const players = usePlayers();
  const squad = players?.filter((p) => p.status === 'squad') ?? [];
  return (
    <div className="k-page">
      {players && (
        <>
          <Hero value={squad.length} ink="#8fdcb6" label={squad.length === 1 ? 'player in the squad' : 'players in the squad'} />
          <Doors label="The units">
            {AXES.map((u) => <Door key={u} icon="people" name={u} ink={UNIT_COLOUR[u]} value={squad.filter((p) => p.unit === u).length} onClick={() => go('/football/unit', { u })} />)}
          </Doors>
        </>
      )}
      <SquadView c={c} onCaptain={(a) => void setCaptain(a)} onEquip={(id, i) => void equipAbility(id, i)} />
    </div>
  );
}

const CLUB_HOW: HowThisWorks = {
  title: 'How the club works',
  steps: [
    { icon: 'people', ink: '#8fdcb6', head: 'Your habits are the players', line: 'Each habit you log signs for the club and plays in its unit.' },
    { icon: 'sheet', ink: '#ede6da', head: 'The best eleven start', line: 'The highest match ratings start, unless you pick on the team sheet.' },
    { icon: 'tree', ink: '#c2b2ff', head: 'Research grows the club', line: 'Matches and logging earn research for the tree; the tree opens buildings.' },
    { icon: 'ground', ink: '#ff9a76', head: 'The Kaai grows with you', line: 'Every building finished is added to the picture; each division up redraws it larger.' },
  ],
  chips: [{ text: '11 start', ink: '#ede6da' }, { text: `${AXES.length} units`, ink: '#8fdcb6' }, { text: `${Object.keys(TIER_NAMES).length} divisions`, ink: '#f2c46d' }],
};

const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Club, on the kit (board four, pin "Club"): the Kaai leads, then the club and its rating, one thing to do, the eleven, doors. */
function ClubFront({ c }: { c: Club }) {
  const players = usePlayers();
  const sheet = useSheet();
  const league = useLiveQuery(() => loadLeague(), []);
  const tree = useModel();
  const t = useTonight();
  const desk = useLiveQuery(async () => (t ? loadDesk(t) : null), [t]);
  const world = useWorldDoors();
  if (!players || league === undefined) return null;
  const done = (c.bundles ?? []).filter((b) => b.done).map((b) => b.id);
  const own = clubById(OWN);
  const rows = league?.tables[c.tier] ?? [];
  const place = rows.findIndex((r) => r.id === OWN) + 1;
  const rating = league?.rating;
  const xi = sheet?.xi ?? elevenOf(membersOf(new Map(players.map((p) => [p.id, p]))));
  const card = players.find((p) => p.moments.some((m) => !m.seen));
  const lb = players.find((p) => p.limitBreaks.some((l) => !l.seen && l.why !== 'awakening'));
  const packs = tree?.packsWaiting.length ?? 0;
  const building = tree ? tree.projectsOpen.filter((p) => !tree.states.get(p.id)?.done).length : 0;
  const squad = players.filter((p) => p.status === 'squad').length;
  return (
    <div className="k-page kc-club">
      <div className="kc-kaai-wrap"><Kaai tier={c.tier} done={done} /></div>
      <div className="k-row">
        <span className="k-row" style={{ justifyContent: 'flex-start' }}>
          <Art svg={crestSvg(c.save.crest.step, c.save.crest.opt, 44, `${own.name} crest`)} />
          <Title under={`${tierName(c.tier)}${place ? ` · ${ordinal(place)}` : ''}`}>{own.name}</Title>
        </span>
        {rating !== undefined && (
          <span className="k-col k-r"><span className="k-hero sm" style={{ color: VALUE_INK[valueTier(rating, 100)] }}>{rating}</span><span className="k-q">rating</span></span>
        )}
      </div>
      {lb ? (
        <Panel ink="#f2c46d" flat>
          <span style={{ flex: 1 }}><b>{lb.name} broke its limit</b><br /><span className="k-q">See what changed.</span></span>
          <Action sm onClick={() => go('/football/limit', { id: lb.id })}>See it</Action>
        </Panel>
      ) : card ? (
        <Panel ink="#f2c46d" flat>
          <span style={{ flex: 1 }}><b>{card.name} has a new card</b><br /><span className="k-q">{players.filter((p) => p.moments.some((m) => !m.seen)).length > 1 ? 'More are waiting after it.' : 'It is waiting to be opened.'}</span></span>
          <Action sm onClick={() => go('/football/card', { id: card.id })}>See it</Action>
        </Panel>
      ) : packs > 0 ? (
        <Panel ink="#f2c46d" flat>
          <span style={{ flex: 1 }}><b>{packs === 1 ? 'A pack to open' : `${packs} packs to open`}</b><br /><span className="k-q">Cards for the album inside.</span></span>
          <Action sm onClick={() => go('/football/packs')}>Open it</Action>
        </Panel>
      ) : null}
      <Sect>The eleven · {sheet?.save.sheet?.formation ?? '4-3-3'}</Sect>
      {xi.length === 0 ? <p className="k-q">Log a habit and it signs for the club. The eleven fills as players sign.</p> : <Pitch xi={xi} />}
      <Sect>Around the club</Sect>
      <Doors label="Around the club">
        <Door icon="sheet" name="Team sheet" value={sheet?.save.sheet ? 'Yours' : 'Auto'} onClick={() => go('/football/sheet')} />
        <Door icon="people" name="Squad" value={squad} onClick={() => go('/football/club', { view: 'squad' })} />
        <Door icon="tree" name="The tree" value={tree ? `${fmtCount(tree.bank)} pts` : 'Research'} ink="#c2b2ff" onClick={() => go('/football/club', { view: 'tree' })} />
        <Door icon="desk" name="The desk" value={desk ? (desk.shut ? 'Shut' : desk.left.length ? count(desk.left.length, 'die', 'dice') : 'Spent') : '–'} ink="#93c3dc" onClick={() => go('/football/desk')} />
        <Door icon="deal" name="Deals" value={c.members.length} onClick={() => go('/football/club', { view: 'deals' })} />
        <Door icon="pack" name="Packs" value={packs || 'None'} ink="#f2c46d" onClick={() => go('/football/packs')} />
        <Door icon="ground" name="The ground" value={building || done.length} ink="#ff9a76" onClick={() => go('/football/club', { view: 'ground' })} />
        <Door icon="money" name="Money" value={euros(c.save.budget)} onClick={() => go('/football/club', { view: 'money' })} />
        <Door icon="kit" name="Kits" value={kitWall(c.save, c.matches).length} onClick={() => go('/football/club', { view: 'kits' })} />
      </Doors>
      {world && (
        <>
          <Sect>The wider world</Sect>
          <Doors two label="The wider world">
            {world.map((d) => <Door key={d.to} icon={d.icon} name={d.label} value={d.sub} onClick={() => go(d.to)} />)}
          </Doors>
        </>
      )}
    </div>
  );
}

export const CLUB_HELP = CLUB_HOW;

export function ClubHome({ extra }: { extra?: (c: Club) => Partial<Record<ClubViewId, ReactNode>> }) {
  const { params } = useRoute();
  const c = useClub();
  if (c === undefined) return null;
  if (c === null) return <p className="fb-s">The club starts once you found it.</p>;
  const v = params.get('view') as ClubViewId | null;
  if (!v || !CLUB_VIEWS.some((x) => x.id === v)) return <ClubFront c={c} />;
  return <ClubView c={c} view={v} extra={extra?.(c)} />;
}

export function PlayerRoute({ axis }: { axis: string }) {
  const c = useClub();
  if (!c) return null;
  const m = c.members.find((x) => x.axis === axis);
  if (!m) return <p className="fb-s">No such squad member.</p>;
  return (
    <>
      <PlayerView m={m} tierName={tierName(c.tier)} />
    </>
  );
}
