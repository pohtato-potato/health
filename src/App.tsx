import { TrainProto } from './screens/proto/TrainLiving';
import { SessionProto } from './screens/proto/SessionLiving';
import { prefOn } from './domain/types';
import { Suspense, lazy, useEffect, type ComponentType, type ReactNode } from 'react';
import { findSession } from './domain/plan';
import { fmtLitres } from './domain/format';
import { addWater } from './db/actions';
import { db } from './db/db';
import { useActiveSession, useNow, useSettings, useToday } from './db/hooks';
import { clearParam, go, useRoute } from './router';
import { TabBar } from './ui/TabBar';
import { useToast } from './ui/Toasts';
import { ShelfPage } from './screens/walk/ShelfPage';
import { RouteScreen } from './screens/walk/RouteScreen';
import { JoinPage } from './screens/walk/JoinPage';
import { FinishPage } from './screens/walk/FinishPage';
import { CelebrationWatcher } from './state/Celebrations';
import { AchievementWatcher } from './state/Achievements';
import { NotFound } from './screens/NotFound';
import { ShakeStat } from './ui/Shake';
import { useThemeClass } from './ui/Theme';
import { MaintenanceWatcher } from './screens/MaintenanceCards';
import { ChallengeWatcher } from './state/Challenge';
import { bump, patchSettings } from './db/actions';
import { DEFAULT_EQUIPMENT, DEFAULT_PLAN } from './domain/defaultPlan';
import { Today } from './screens/Today';
import { Train } from './screens/Train';
import { Tracks, TrackPage } from './screens/Tracks';
import { Journey } from './screens/Journey';
import { You } from './screens/You';
import { Setup } from './screens/Setup';
import { FoodToday } from './screens/FoodToday';
import { SessionScreen } from './screens/Session';
import { SessionDone } from './screens/SessionDone';
import { clock } from './screens/NextUpCard';
import { LogSheet, MoreSheet } from './sheets/LogSheet';
import { MorningLog } from './sheets/MorningLog';
import { AddFood } from './sheets/AddFood';
import { EntrySheet, FoodForm, QuickKcal } from './sheets/FoodForms';
import { ChecklistSheet, DrinkSheet, FreeMealSheet, StepsSheet, WaistSheet, WaterSheet } from './sheets/QuickSheets';
import { WhatsLeft } from './sheets/WhatsLeft';
import { NightOutSheet } from './sheets/NightOut';
import { SaveMealSheet } from './sheets/Meals';
import { OccasionSheet } from './sheets/Occasion';
import { CloseDay } from './screens/CloseDay';
import { PlanEditor } from './screens/PlanEditor';
import { RecordsWall } from './screens/RecordsWall';
import { MuscleMapPage } from './screens/MuscleMap';
import { ShortSessionSheet } from './sheets/ShortSession';
import { WeeklyReviewPage } from './screens/WeeklyReview';
import { WalkTab } from './screens/WalkTab';
import { NightSkyPage } from './screens/NightSky';
import { MedicinesPage } from './screens/Medicines';
import { ExerciseGuidePage } from './screens/ExerciseGuide';
import { MonthlyFilmPage } from './screens/MonthlyFilm';
import { ExperimentsPage } from './screens/Experiments';

/** A page loaded when first opened, from its module's named export. */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

// Pages opened now and then load on demand; the tabs, sessions and sheets stay in the main bundle.
const AchievementsPage = page(() => import('./screens/AchievementsPage'), 'AchievementsPage');
const ReadinessPage = page(() => import('./screens/Readiness'), 'ReadinessPage');
const CheckInScreen = page(() => import('./screens/CheckIn'), 'CheckInScreen');
const PhotosPage = page(() => import('./screens/Photos'), 'PhotosPage');
const MapPage = page(() => import('./screens/MapPage'), 'MapPage');
const PostcardPage = page(() => import('./screens/Postcard'), 'PostcardPage');
const StretchPage = page(() => import('./screens/walk/RoadPages'), 'StretchPage');
const StopPage = page(() => import('./screens/walk/RoadPages'), 'StopPage');
const ArrivalPage = page(() => import('./screens/walk/ArrivalPage'), 'ArrivalPage');
const PassportPage = page(() => import('./screens/walk/PassportPage'), 'PassportPage');
const ArrivalRedirect = page(() => import('./screens/Postcard'), 'ArrivalRedirect');
const DiaryPage = page(() => import('./screens/Diary'), 'DiaryPage');
const DeparturesPage = page(() => import('./screens/Departures'), 'DeparturesPage');
const CharacterPage = page(() => import('./screens/Character'), 'CharacterPage');
const PhysioPage = page(() => import('./screens/Physio'), 'PhysioPage');
const RevealPage = page(() => import('./screens/Reveal'), 'RevealPage');
const SessionView = page(() => import('./screens/SessionView'), 'SessionView');
const Replay = page(() => import('./screens/live/Replay'), 'Replay');
const SettingsScreen = page(() => import('./screens/Settings'), 'SettingsScreen');
const ReceiptPage = page(() => import('./screens/Week'), 'ReceiptPage');
const WeekRecap = page(() => import('./screens/Week'), 'WeekRecap');
const ClimatePage = page(() => import('./screens/Reports'), 'ClimatePage');
const WrappedPage = page(() => import('./screens/Reports'), 'WrappedPage');

const SHEETS: Record<string, () => ReactNode> = {
  log: () => <LogSheet />,
  more: () => <MoreSheet />,
  morning: () => <MorningLog />,
  addfood: () => <AddFood />,
  'food-new': () => <FoodForm />,
  quick: () => <QuickKcal />,
  entry: () => <EntrySheet />,
  whatsleft: () => <WhatsLeft />,
  water: () => <WaterSheet />,
  steps: () => <StepsSheet />,
  checklist: () => <ChecklistSheet />,
  waist: () => <WaistSheet />,
  drink: () => <DrinkSheet />,
  free: () => <FreeMealSheet />,
  nightout: () => <NightOutSheet />,
  short: () => <ShortSessionSheet />,
  savemeal: () => <SaveMealSheet />,
  occasion: () => <OccasionSheet />,
};

const PAGES: Record<string, { el: () => ReactNode; tab?: string }> = {
  '/today': { el: () => <Today />, tab: 'today' },
  '/train': { el: () => <Train />, tab: 'train' },
  '/tracks': { el: () => <Tracks />, tab: 'you' },
  '/journey': { el: () => <Journey /> },
  '/walk': { el: () => <WalkTab />, tab: 'walk' },
  '/arrival': { el: () => <ArrivalRedirect /> },
  '/sky': { el: () => <NightSkyPage /> },
  '/medicines': { el: () => <MedicinesPage /> },
  '/guide': { el: () => <ExerciseGuidePage /> },
  '/film': { el: () => <MonthlyFilmPage /> },
  '/experiments': { el: () => <ExperimentsPage /> },
  '/track': { el: () => <TrackPage /> },
  '/food': { el: () => <FoodToday /> },
  '/close': { el: () => <CloseDay /> },
  '/plan': { el: () => <PlanEditor /> },
  '/records': { el: () => <RecordsWall /> },
  '/muscles': { el: () => <MuscleMapPage /> },
  '/you': { el: () => <You />, tab: 'you' },
  '/review': { el: () => <WeeklyReviewPage /> },
  '/settings': { el: () => <SettingsScreen /> },
  '/session': { el: () => <SessionScreen /> },
  '/session/done': { el: () => <SessionDone /> },
  '/session/view': { el: () => <SessionView /> },
  '/session/replay': { el: () => <Replay /> },
  '/achievements': { el: () => <AchievementsPage /> },
  '/readiness': { el: () => <ReadinessPage /> },
  '/checkin': { el: () => <CheckInScreen /> },
  '/photos': { el: () => <PhotosPage /> },
  '/week': { el: () => <WeekRecap /> },
  '/receipt': { el: () => <ReceiptPage /> },
  '/map': { el: () => <MapPage /> },
  '/postcard': { el: () => <PostcardPage /> },
  '/stretch': { el: () => <StretchPage /> },
  '/stop': { el: () => <StopPage /> },
  '/arrive': { el: () => <ArrivalPage /> },
  '/passport': { el: () => <PassportPage /> },
  '/routes': { el: () => <ShelfPage /> },
  '/route': { el: () => <RouteScreen /> },
  '/join': { el: () => <JoinPage /> },
  '/finish': { el: () => <FinishPage /> },
  '/diary': { el: () => <DiaryPage /> },
  '/departures': { el: () => <DeparturesPage /> },
  '/climate': { el: () => <ClimatePage /> },
  '/wrapped': { el: () => <WrappedPage /> },
  '/character': { el: () => <CharacterPage /> },
  '/physio': { el: () => <PhysioPage /> },
  '/reveal': { el: () => <RevealPage /> },
  '/proto/session': { el: () => <SessionProto /> },
  '/proto/train': { el: () => <TrainProto /> },
};

export function App() {
  const settings = useSettings();
  const route = useRoute();
  const today = useToday();
  const largeText = settings ? prefOn(settings.prefs, 'largeText') : false;
  const contrast = settings ? prefOn(settings.prefs, 'highContrast') : false;
  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
    document.documentElement.classList.toggle('contrast', contrast);
  }, [largeText, contrast]);
  useThemeClass(settings, today);

  // Design prototypes use sample data only, so they open without setup (handy on a fresh phone).
  if (route.path.startsWith('/proto/') && PAGES[route.path]) return PAGES[route.path].el();
  if (!settings) return null;
  if (!settings.setupDone) return <Setup />;

  const page = PAGES[route.path] ?? { el: () => <NotFound /> };
  const sheet = route.params.get('sheet');
  return (
    <div className="app">
      <Suspense fallback={<div className="page" />}>{page.el()}</Suspense>
      {page.tab && <TabBar active={page.tab} />}
      {page.tab && <ResumePill />}
      {sheet && SHEETS[sheet]?.()}
      <DeepLinks />
      <CelebrationWatcher />
      <AchievementWatcher />
      <OpenCounters />
      <PlanDefault />
      <MaintenanceWatcher />
      <ChallengeWatcher />
      <ShakeStat />
    </div>
  );
}

/** Home-screen shortcuts arrive as links; water logs itself with an undo. */
function DeepLinks() {
  const route = useRoute();
  const today = useToday();
  const toast = useToast();
  const action = route.params.get('do');
  useEffect(() => {
    if (action !== 'water') return;
    clearParam('do');
    void addWater(today, 250).then(async () => {
      const ml = (await db.days.get(today))?.waterMl ?? 250;
      toast({ kicker: 'Water', text: `+250 ml · ${fmtLitres(ml)} L today`, action: { label: 'Undo', run: () => addWater(today, -250) } });
    });
  }, [action, today, toast]);
  return null;
}

/** An install set up before the built-in plan existed gets it once, with the kit its loads assume. */
function PlanDefault() {
  const settings = useSettings();
  const missing = !!settings?.setupDone && !settings.plan;
  useEffect(() => {
    if (!missing) return;
    void patchSettings((s) => ({
      plan: s.plan ?? DEFAULT_PLAN,
      equipment: s.equipment.plates.length || s.equipment.fixed.length ? s.equipment : DEFAULT_EQUIPMENT,
    }));
  }, [missing]);
  return null;
}

/** Counts the kinds of app opens a few achievements care about. */
function OpenCounters() {
  const settings = useSettings();
  const today = useToday();
  useEffect(() => {
    if (!settings?.setupDone) return;
    if (window.matchMedia?.('(display-mode: standalone)').matches) void bump('standalone', { day: today });
    if (settings.birthday && today.slice(5) === settings.birthday) void bump('birthday', { day: today });
  }, [settings?.setupDone, settings?.birthday, today]);
  return null;
}

function ResumePill() {
  const active = useActiveSession();
  const settings = useSettings();
  const now = useNow(1000);
  if (!active || !settings) return null;
  const name = settings.plan ? findSession(settings.plan, active.session)?.name : undefined;
  return (
    <button type="button" className="resume" onClick={() => go('/session')}>
      <span className="dot" />
      {name ?? `Session ${active.session}`} · {clock(now - active.startedAt)}
      <span className="q">Resume</span>
    </button>
  );
}
