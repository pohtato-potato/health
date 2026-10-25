import { useRef, useState, type ReactNode } from 'react';
import { BANNER_PRIORITY, doseBannerId, holdBanner, morningLogBanner, notDismissed, pickBanner, type BannerCandidate } from '../domain/banners';
import { occasionDue, occasionOn } from '../domain/occasions';
import { fmtInt } from '../domain/format';
import { maintenanceFor } from '../sheets/Occasion';
import { TodayBanner, type BannerAction } from './today/TodayBanner';
import { saveBackup } from '../db/backup';
import { useAllDays, useAllEntries, useSettings } from '../db/hooks';
import { applyUpdate, promptInstall, usePwa } from '../pwa';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addDays, dayKey, logMinutes, logWeekdaySun, weekday } from '../domain/dates';
import { fmtDayMonth, fmtTime } from '../domain/format';
import { lastFullWeek } from '../domain/weekly';
import { go, openSheet } from '../router';
import { checkInDue } from '../domain/checkinSchedule';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';
import { modelFor } from './MaintenanceCards';
import { weeklyCheckIn } from '../domain/benchmark';
import { targetsFor } from '../state/derived';
import { patchSettings, setTargets } from '../db/actions';
import { doseSchedule, nextDose } from '../domain/medicines';
import { NewsBannerView } from './walk/NewsBanner';
import { useRoadNews } from './walk/useRoadNews';

const DISMISSED_KEY = 'health.banner.dismissed';
function readDismissed(): { date: string; ids: string[] } | null {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? 'null');
  } catch {
    return null;
  }
}

type Banner = BannerCandidate & { icon: ReactNode; title: string; sub?: string; actions: BannerAction[]; node?: ReactNode };

/** One quiet banner on Today, always in the same slot: a new version, a dose, the morning log, a backup, the week, a check-in, an occasion, installing. Never notifications. */
export function Banners() {
  const pwa = usePwa();
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const lastWeek = lastFullWeek(dayKey());
  const recapNote = useLiveQuery(async () => (await db.weeks.get(lastWeek)) ?? null, [lastWeek]);
  const toast = useToast();
  const usage = useLiveQuery(() => db.usage.where('at').above(Date.now() - 14 * 86_400_000).toArray(), []);
  const [busy, setBusy] = useState(false);
  const news = useRoadNews();
  const [dismissed, setDismissed] = useState(readDismissed);
  // The banner chosen on load is held until the next load, so the page never moves while you read.
  const held = useRef<string | null | undefined>(undefined);
  if (!settings || !days || !checkins || recapNote === undefined || !usage || !news) return null;
  const recapReady = !recapNote?.recapSeenAt && weekday(dayKey()) <= 2 && days.some((d) => d.date >= lastWeek && d.date <= addDays(lastWeek, 6));
  const today = dayKey();
  const lastCheck = checkins.map((c) => c.date).sort().pop();
  // Monthly, on a fixed day; the first one is offered a few days after starting.
  const checkinDue = lastCheck ? checkInDue(today, settings.checkInDay ?? 1, lastCheck) : Date.now() - settings.createdAt > 3 * 86_400_000;

  const last = settings.backup.lastQuick;
  const hasData = days.length > 0;
  const daysSince = last ? Math.floor((Date.now() - last) / 86_400_000) : Infinity;
  const nudge = hasData && daysSince >= settings.backup.nudgeDays;

  const backup = async () => {
    setBusy(true);
    try {
      const r = await saveBackup();
      if (r !== 'cancelled') toast({ kicker: 'Backup', text: r === 'shared' ? 'Backup handed over. Pick Drive to keep it safe.' : 'Backup saved to Downloads.', tone: 'sage' });
    } catch (e) {
      toast({ text: `Backup failed: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const candidates: Banner[] = [];
  const todayDay = days.find((d) => d.date === today);
  if (pwa.needRefresh)
    candidates.push({ id: 'update', priority: BANNER_PRIORITY.update, anytime: true, icon: <Icon name="upload" size={20} color="var(--sage)" />, title: 'A new version of Health is ready.', actions: [{ label: 'Reload', run: () => applyUpdate() }] });

  const dose = nextDose(Date.now(), doseSchedule(settings.checklist.filter((i) => i.med), today, settings, todayDay), todayDay?.ticks, todayDay?.missed);
  if (dose && dose.at - Date.now() <= 2 * 3_600_000) {
    const mins = Math.round((dose.at - Date.now()) / 60_000);
    const when = mins > 0 ? `in ${mins >= 60 ? `${Math.floor(mins / 60)} h ` : ''}${mins % 60} min` : mins === 0 ? 'now' : `${-mins} min ago`;
    candidates.push({ id: doseBannerId(dose), priority: BANNER_PRIORITY.dose, anytime: true, icon: <Icon name="pill" size={20} color="var(--sage)" />, title: `${dose.name} at ${fmtTime(dose.at)}`, sub: when, actions: [{ label: 'Tick', run: () => openSheet('checklist') }] });
  }

  const morning = morningLogBanner(!!todayDay?.morning, logMinutes(Date.now()));
  if (morning)
    candidates.push({ id: 'morning-log', priority: morning.priority, anytime: true, icon: <Icon name="sun" size={20} color="var(--apricot)" />, title: morning.text, sub: 'Weight and sleep, then the night’s visitors', actions: [{ label: 'Log', run: () => openSheet('morning') }] });

  if (nudge)
    candidates.push({ id: 'backup', priority: BANNER_PRIORITY.backup, icon: <Icon name="save" size={20} color="var(--quiet)" />, title: last ? `No backup for ${daysSince} days.` : 'No backup yet.', sub: 'One tap keeps your data safe.', actions: [{ label: 'Back up', run: backup, disabled: busy }] });
  const weekdayNow = logWeekdaySun(Date.now());
  const lastFull = settings.backup.lastFull;
  if (weekdayNow === 0 && (!lastFull || Date.now() - lastFull > 6 * 86_400_000) && !nudge)
    candidates.push({ id: 'backup-sunday', priority: BANNER_PRIORITY.backup, icon: <Icon name="save" size={20} color="var(--quiet)" />, title: 'Sunday: time for the weekly full backup.', sub: 'Photos included.', actions: [{ label: 'Back up', run: () => go('/settings', { at: 'backup' }) }] });

  const model = entries ? modelFor(settings, days, entries, today) : undefined;
  const checkIn = model ? weeklyCheckIn(model, targetsFor(settings, today), settings.maintenanceSeen) : undefined;
  if (checkIn && model?.kcal !== undefined)
    candidates.push({
      id: 'maintenance',
      priority: BANNER_PRIORITY.maintenance,
      icon: <Icon name="trend" size={20} color="var(--kcal)" />,
      title: checkIn.text,
      actions: [
        { label: 'Keep', run: () => void patchSettings({ maintenanceSeen: model.kcal }) },
        ...(checkIn.proposal
          ? [{
              label: 'Adjust',
              ghost: true,
              run: async () => {
                await setTargets({ ...targetsFor(settings, today), ...checkIn.proposal });
                await patchSettings({ maintenanceSeen: model.kcal });
                toast({ text: 'Calorie range moved with maintenance', sub: `${checkIn.proposal!.kcalMin}–${checkIn.proposal!.kcalMax} kcal` });
              },
            }]
          : []),
      ],
    });

  if (checkinDue)
    candidates.push({ id: 'checkin', priority: BANNER_PRIORITY.checkin, icon: <Icon name="camera" size={20} color="var(--pearl)" />, title: lastCheck ? 'Your monthly check-in is due.' : 'Time for your first check-in.', sub: lastCheck ? undefined : 'Photos and a tape measure.', actions: [{ label: 'Start', run: () => go('/checkin') }] });
  if (recapReady)
    candidates.push({ id: 'recap', priority: BANNER_PRIORITY.recap, icon: <Icon name="calendar" size={20} color="var(--pearl)" />, title: `Your week, ${fmtDayMonth(lastWeek)}–${fmtDayMonth(addDays(lastWeek, 6))}, is ready.`, sub: 'The receipt is printed.', actions: [{ label: 'Open', run: () => go('/week') }] });
  if (settings.reviewDay !== undefined && weekdayNow === settings.reviewDay)
    candidates.push({ id: 'review-day', priority: BANNER_PRIORITY.review, icon: <Icon name="save" size={20} color="var(--protein)" />, title: 'Review day.', sub: 'Export the audit pack and ask Claude what to change.', actions: [{ label: 'Open', run: () => go('/settings', { at: 'data' }) }] });

  const current = occasionOn(settings, today);
  const fest = occasionDue(settings, today);
  if (current)
    candidates.push({ id: 'occasion-on', priority: BANNER_PRIORITY.occasion, anytime: true, icon: <Icon name="calendar" size={20} color="var(--pearl)" />, title: `${current.name} mode`, sub: `Calories up to ${fmtInt(maintenanceFor(settings, today))}. Streaks paused through ${fmtDayMonth(current.to)}.`, actions: [{ label: 'Change', run: () => openSheet('occasion') }] });
  else if (fest)
    candidates.push({ id: 'occasion', priority: BANNER_PRIORITY.occasion, icon: <Icon name="calendar" size={20} color="var(--pearl)" />, title: fest.inDays <= 0 ? `${fest.name} is here` : `${fest.name} in ${fest.inDays} day${fest.inDays === 1 ? '' : 's'}`, sub: 'Occasion mode holds the rings steady for it.', actions: [{ label: 'Set up', run: () => openSheet('occasion', { kind: 'festival', name: fest.name, from: fest.from > today ? fest.from : today, to: fest.to }) }] });

  if (news?.banner)
    candidates.push({ id: 'walk-news', priority: BANNER_PRIORITY.walkNews, anytime: true, icon: null, title: news.banner.title, actions: [], node: <NewsBannerView banner={news.banner} kmById={news.kmById} onOpen={news.open} onDismiss={news.dismiss} /> });

  if (pwa.canInstall && !pwa.installed)
    candidates.push({ id: 'install', priority: BANNER_PRIORITY.install, icon: <Icon name="phone" size={20} color="var(--pearl)" />, title: 'Install Health on your home screen.', sub: 'It opens full-screen.', actions: [{ label: 'Install', run: () => promptInstall() }] });

  // One banner at a time, near the hour you usually log; a dismissed one stays away for the day.
  const open = notDismissed(candidates, dismissed, today);
  const shown = holdBanner(held.current, pickBanner(open, usage, Date.now()), open);
  if (held.current === undefined) held.current = shown?.id ?? null;
  if (!shown) return null;
  const dismiss = () => {
    const next = { date: today, ids: [...(dismissed?.date === today ? dismissed.ids : []), shown.id] };
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      /* storage can be unavailable; the dismissal lasts until reload */
    }
  };
  if (shown.node) return shown.node;
  return <TodayBanner icon={shown.icon} title={shown.title} sub={shown.sub} actions={shown.actions} onDismiss={dismiss} />;
}
