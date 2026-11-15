// Football's routes. Each screen is filled in by its own task; the shell is shared.
import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useSave, useTonight } from '../../football/store/hooks';
import { MatchPlayer } from './Match';
import { LiveRoute } from './match/Live';
import { useRoute } from '../../router';
import { Aurora, FootballHome, SECTIONS, type FbInner, type FbSection } from './FootballHome';
import { TonightView } from './Tonight';
import { LEAGUE_VIEWS, LeagueHome } from './league/LeagueHome';
import { ClubPage } from './league/ClubPage';
import { RivalRoute, STORY_VIEWS, StoryHome, WrappedRoute } from './story/StoryHome';
import { CLUB_HELP, CLUB_VIEWS, ClubHome, PlayerRoute } from './club/ClubHome';
import { FullTime } from './FullTime';
import { CardMomentRoute, PlayerPage, UnitRoute } from './players/Screens';
import { BlendRoute, LimitBreakRoute, TeamSheetRoute } from './players/Rotation';
import { FirstRun } from './FirstRun';
import { BoardPage, EraMoment, EurekaMoment, ProjectsPage, StaffPage, TechPage } from './tree/TreeScreens';
import { BoonPage, BountiesPage, TrackPage } from './tree/SeasonScreens';
import { AlbumPage, PacksPage } from './tree/PackScreens';
import { AcademyPage, DutyPage, LoanMoment, LoansPage, TiePage, TrialsPage } from './world/WorldScreens';
import { keyChances } from './CatchUp';
import { CupRoute } from './cup/CupScreens';
import { storyHow, TONIGHT_HOW } from './howDaily';
import { legendName } from './story/StoryLead';
import { go } from '../../router';
import { loadParcel } from '../../football/store/around';
import { NightGround, ParcelView } from './Parcel';
import { DeskRoute } from './desk/Desk';
import { MarketRoute } from './desk/Market';
import { Atlas } from './world/Atlas';
import type { StoredMatch } from '../../football/store/tables';
import { techDoor } from '../../football/tree/research';
import { Moved } from '../reports/Moved';
import type { HowThisWorks } from '../../ui/kit/Kit';
import { ACADEMY_HOW, ALBUM_HOW, BOARD_HOW, BOON_HOW, DEALS_HOW, DUTY_HOW, GROUND_HOW, KITS_HOW, LOANS_HOW, MEMBER_HOW, MONEY_HOW, PACKS_HOW, PLAYER_HOW, PROJECTS_HOW, SHEET_HOW, SQUAD_HOW, STAFF_HOW, TECH_HOW, TREE_HOW, TRIALS_HOW, UNIT_HOW } from './club/Bits';
import { ALBUM, ALBUM_CARDS } from '../../football/content/album';
import { CHEM_MAX } from '../../football/rotation/night';
import { BREAK_DAYS, DUTY_ATTR, DUTY_NEEDS } from '../../football/globe/duty';

const SECTION: Record<string, FbSection> = { '/football': 'tonight', '/football/club': 'club', '/football/league': 'league', '/football/story': 'story' };

function TonightSection() {
  const t = useTonight();
  if (t === undefined) return null;
  if (t === null) return <p className="fb-s">Football starts once you found the club.</p>;
  return <TonightView t={t} />;
}

/** Matchday §4 (Fork B): the morning parcel on the first open after 4 am; the ground at night after Close the day. */
function TonightRoute() {
  const t = useTonight();
  const p = useLiveQuery(async () => (t ? loadParcel(t) : null), [t]);
  if (t === undefined || p === undefined) return null;
  if (t && p?.due) return <ParcelView t={t} p={p} />;
  if (t && p?.shut) return <FootballHome section="tonight" night><NightGround t={t} packs={p.packs} sealAt={p.sealAt} /></FootballHome>;
  return <FootballHome section="tonight" help={TONIGHT_HOW}><TonightSection /></FootballHome>;
}

function MatchRoute({ id, at, paused, ft = false }: { id: string | null; at?: number; paused?: boolean; ft?: boolean }) {
  const save = useSave();
  const [ended, setEnded] = useState(ft);
  const m = useLiveQuery(async () => (id ? db.fbMatches.get(id) : (await db.fbMatches.orderBy('date').last())) ?? null, [id]);
  if (save === undefined || m === undefined) return null;
  if (!save || !m) return <FootballHome section="tonight"><p className="fb-s">No match to show yet.</p></FootballHome>;
  if (ended) return <FootballHome section="tonight"><FullTime m={m} save={save} onWatch={() => setEnded(false)} /></FootballHome>;
  return <MatchPlayer key={`${m.id}:${at ?? ''}`} m={m} save={save} at={at} paused={paused} onEnd={() => { setEnded(true); window.scrollTo(0, 0); }} />;
}

/** The catch-up reel: every unwatched auto-played match, key chances only, one after another. */
function ReelRoute() {
  const save = useSave();
  const [list, setList] = useState<StoredMatch[] | null>(null);
  const [i, setI] = useState(0);
  const found = useLiveQuery(() => db.fbMatches.orderBy('date').filter((m) => !!m.auto && !m.watched).toArray(), []);
  if (list === null && found) setList(found);
  if (save === undefined || list === null) return null;
  const m = list[i];
  if (!save || !m) return <FootballHome section="tonight"><p className="fb-s">Nothing to catch up on.</p></FootballHome>;
  return <MatchPlayer key={m.id} m={keyChances(m)} save={save} onEnd={() => (i + 1 < list.length ? setI(i + 1) : go('/football', undefined, { replace: true }))} />;
}


const TREE_BACK = { back: 'The tree', to: '/football/club', params: { view: 'tree' } };
// Look pass L1: each Club page's rules live behind its "?" (club/Bits.tsx).
const CLUB_BACK = { back: 'Club', to: '/football/club' };
/** Navigation A: each page inside Club, with its name and its one way back. */
const INNER: Record<string, FbInner> = {
  '/football/tech': { title: 'A tech', ...TREE_BACK, help: TECH_HOW },
  '/football/era': { title: 'A new era', ...TREE_BACK },
  '/football/eureka': { title: 'Eureka', ...TREE_BACK },
  '/football/projects': { title: 'Projects', ...TREE_BACK, help: PROJECTS_HOW },
  '/football/staff': { title: 'Staff room', ...TREE_BACK, help: STAFF_HOW },
  '/football/board': { title: 'The board', ...TREE_BACK, help: BOARD_HOW },
  '/football/boon': { title: 'Boons', ...TREE_BACK, help: BOON_HOW },
  '/football/packs': { title: 'Packs', ...CLUB_BACK, help: PACKS_HOW },
  '/football/album': { title: 'The album', back: 'Packs', to: '/football/packs', help: ALBUM_HOW(ALBUM.length, ALBUM_CARDS.length) },
  '/football/loan': { title: 'A loan', back: 'Loans', to: '/football/loans' },
  '/football/loans': { title: 'Loans', ...CLUB_BACK, help: LOANS_HOW },
  '/football/trials': { title: 'Trials', ...CLUB_BACK, help: TRIALS_HOW },
  '/football/tie': { title: 'Tie to a habit', back: 'Trials', to: '/football/trials' },
  '/football/academy': { title: 'Academy', ...CLUB_BACK, help: ACADEMY_HOW },
  '/football/duty': { title: 'International duty', ...CLUB_BACK, help: DUTY_HOW(BREAK_DAYS, DUTY_NEEDS, DUTY_ATTR) },
};

/** A section's other views (?view=) are pages inside it now, reached by doors on the section's page. */
function viewInner(section: FbSection, view: string | null, storyHelp?: HowThisWorks): FbInner | undefined {
  if (!view) return undefined;
  const label = (section === 'club' ? CLUB_VIEWS : section === 'league' ? LEAGUE_VIEWS : section === 'story' ? STORY_VIEWS : []).find((v) => v.id === view)?.label;
  if (!label || (section === 'story' && view === 'home') || (section === 'league' && view === 'table')) return undefined;
  const sec = SECTIONS.find((x) => x.id === section)!;
  return { title: PAGE_NAME[label] ?? label, back: sec.label, to: sec.path, help: section === 'club' ? CLUB_PAGE_HOW[view] : section === 'story' && view !== 'settings' ? storyHelp : undefined };
}
/** The "?" on each of Club's own pages (look pass L1). */
const CLUB_PAGE_HOW: Record<string, HowThisWorks | undefined> = { squad: SQUAD_HOW, tree: TREE_HOW, deals: DEALS_HOW, money: MONEY_HOW, kits: KITS_HOW, ground: GROUND_HOW };
const PAGE_NAME: Record<string, string> = { Squad: 'The squad', Tree: 'The tree', Ground: 'The ground', Deals: 'Deals', Money: 'Money', Kits: 'Kits', Pyramid: 'The pyramid', Calendar: 'Calendar', Cups: 'The cups', Seasons: 'Seasons', Moments: 'Moments', 'Old Selves': 'Old Selves', Rivals: 'Rivals', Settings: 'Football settings' };

/** A player's page goes back to their unit. */
function PlayerFrame({ id }: { id: string }) {
  const p = useLiveQuery(() => db.fbPlayers.get(id), [id]);
  if (p === undefined) return null;
  return <FootballHome section="club" inner={p ? { title: p.name, back: p.unit, to: '/football/unit', params: { u: p.unit }, help: PLAYER_HOW } : { title: 'A player', ...CLUB_BACK }}><PlayerPage id={id} /></FootballHome>;
}

export function Football() {
  const { path, params } = useRoute();
  const save = useSave();
  if (save === undefined) return null;
  if (save === null) return <Aurora><main className="fb-page"><FirstRun /></main></Aurora>;
  if (path === '/football/match' && params.get('reel') === '1') return <ReelRoute />;
  // Matchday depth: the waiting league match, watched live with its calls.
  if (path === '/football/match' && params.get('live') === '1') return <LiveRoute />;
  if (path === '/football/match') {
    // Dev only: ?at=<ms>&pause=1 freezes the replay at a moment, for checking each visual.
    const dev = import.meta.env.DEV;
    const at = dev && params.get('at') ? Number(params.get('at')) : undefined;
    return <MatchRoute id={params.get('id')} at={at} paused={dev && params.get('pause') === '1'} ft={params.get('ft') === '1'} />;
  }
  // Cup runs (ledger O28): the cups page, and the run in progress.
  if (path === '/football/desk' || path.startsWith('/football/desk/')) return <DeskRoute />;
  if (path === '/football/cup' || path === '/football/cup/run' || path === '/football/cup/match') return <CupRoute path={path} />;
  if (path === '/football/market') return <MarketRoute />;
  if (path === '/football/atlas') return <FootballHome section="league" inner={{ title: 'The atlas', back: 'League', to: '/football/league' }}><Atlas /></FootballHome>;
  if (path === '/football/club-page') return <FootballHome section="league" inner={{ title: 'A club', back: 'League', to: '/football/league' }}><ClubPage id={params.get('id') ?? ''} wiki={params.get('wiki') === '1'} /></FootballHome>;
  if (path === '/football/wrapped') return <WrappedRoute season={Number(params.get('season') ?? 1)} />;
  if (path === '/football/rival') return <FootballHome section="story" inner={{ title: 'A rival', back: 'Rivals', to: '/football/story', params: { view: 'rivals' }, help: storyHow(legendName(save.rivals)) }}><RivalRoute id={params.get('id') ?? ''} /></FootballHome>;
  if (path === '/football/player' && params.get('id')) return <PlayerFrame id={params.get('id')!} />;
  if (path === '/football/player') return <FootballHome section="club" inner={{ title: 'Squad member', back: 'Squad', to: '/football/club', params: { view: 'squad' }, help: MEMBER_HOW }}><PlayerRoute axis={params.get('axis') ?? ''} /></FootballHome>;
  if (path === '/football/unit') return <FootballHome section="club" inner={{ title: params.get('u') ?? 'A unit', back: 'Squad', to: '/football/club', params: { view: 'squad' }, help: UNIT_HOW }}><UnitRoute unit={params.get('u') ?? ''} /></FootballHome>;
  if (path === '/football/card') return <FootballHome section="club" inner={{ title: 'A new card', back: 'Club', to: '/football/club' }}><CardMomentRoute id={params.get('id') ?? ''} /></FootballHome>;
  // Engine 2, layer 3: the tree.
  const tree: Record<string, () => ReactNode> = {
    // A link to a tech that is missing or unknown lands on the tree, never on an empty page.
    '/football/tech': () => { const d = techDoor(params.get('id')); return d.path === '/football/tech' ? <TechPage id={d.params.id} /> : <Moved to={d.path} params={d.params} />; },
    '/football/era': () => <EraMoment e={params.get('e') ?? ''} />,
    '/football/eureka': () => <EurekaMoment id={params.get('id') ?? ''} />,
    '/football/projects': () => <ProjectsPage />,
    '/football/staff': () => <StaffPage />,
    '/football/board': () => <BoardPage />,
    '/football/boon': () => <BoonPage />,
    '/football/packs': () => <PacksPage />,
    '/football/album': () => <AlbumPage />,
    // Layer 4: the world.
    '/football/loan': () => <LoanMoment k={params.get('key') ?? ''} />,
    '/football/loans': () => <LoansPage />,
    '/football/trials': () => <TrialsPage />,
    '/football/tie': () => <TiePage id={params.get('id') ?? ''} />,
    '/football/academy': () => <AcademyPage />,
    '/football/duty': () => <DutyPage />,
  };
  if (tree[path]) return <FootballHome section="club" inner={INNER[path]}>{tree[path]()}</FootballHome>;
  if (path === '/football/track') return <FootballHome section="story" inner={{ title: 'Season track', back: 'Story', to: '/football/story', help: storyHow(legendName(save.rivals)) }}><TrackPage /></FootballHome>;
  if (path === '/football/bounties') return <FootballHome section="story" inner={{ title: 'Bounties', back: 'Story', to: '/football/story', help: storyHow(legendName(save.rivals)) }}><BountiesPage /></FootballHome>;
  if (path === '/football/limit') return <FootballHome section="club" inner={{ title: 'Limit break', back: 'Club', to: '/football/club' }}><LimitBreakRoute id={params.get('id') ?? ''} /></FootballHome>;
  if (path === '/football/sheet') return <FootballHome section="club" inner={{ title: 'Team sheet', back: 'Club', to: '/football/club', help: SHEET_HOW(CHEM_MAX) }}><TeamSheetRoute /></FootballHome>;
  if (path === '/football/blend') return <FootballHome section="tonight" inner={{ title: 'How tonight adds up', back: 'Tonight', to: '/football' }}><BlendRoute /></FootballHome>;
  const section = SECTION[path] ?? 'tonight';
  if (section === 'tonight') return <TonightRoute />;
  const story = storyHow(legendName(save.rivals));
  const inner = viewInner(section, params.get('view'), story);
  return <FootballHome section={section} inner={inner} help={inner ? undefined : section === 'club' ? CLUB_HELP : section === 'story' ? story : undefined}>{section === 'league' ? <LeagueHome /> : section === 'story' ? <StoryHome /> : <ClubHome />}</FootballHome>;
}
