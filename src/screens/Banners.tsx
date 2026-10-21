import { useState, type ReactNode } from 'react';
import { morningLogBanner, pickBanner, type BannerCandidate } from '../domain/banners';
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

/** One quiet banner on Today: a new version, a backup nudge, the week, a check-in, installing. Never notifications. */
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
  if (!settings || !days || !checkins || recapNote === undefined || !usage) return null;
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

  const candidates: (BannerCandidate & { el: ReactNode })[] = [];
  if (pwa.needRefresh)
    candidates.push({
      id: 'update',
      priority: 10,
      anytime: true,
      el: (
        <>
          <Icon name="upload" size={20} color="var(--sage)" />
          <span className="grow">A new version of Health is ready.</span>
          <button type="button" className="btn sm" onClick={() => applyUpdate()}>
            Reload
          </button>
        </>
      ),
    });
  if (nudge)
    candidates.push({
      id: 'backup',
      priority: 6,
      el: (
        <>
          <Icon name="save" size={20} color="var(--gold)" />
          <span className="grow">{last ? `No backup for ${daysSince} days.` : 'No backup yet.'} One tap keeps your data safe.</span>
          <button type="button" className="btn sm" onClick={backup} disabled={busy}>
            Back up
          </button>
        </>
      ),
    });
  if (recapReady)
    candidates.push({
      id: 'recap',
      priority: 5,
      el: (
        <>
          <Icon name="calendar" size={20} color="var(--gold)" />
          <span className="grow">
            Your week, {fmtDayMonth(lastWeek)}–{fmtDayMonth(addDays(lastWeek, 6))}, is ready. The receipt is printed.
          </span>
          <button type="button" className="btn sm" onClick={() => go('/week')}>
            Open
          </button>
        </>
      ),
    });
  const todayDay = days.find((d) => d.date === today);
  const morning = morningLogBanner(!!todayDay?.morning, logMinutes(Date.now()));
  if (morning)
    candidates.push({
      id: 'morning-log',
      priority: morning.priority,
      anytime: true,
      el: (
        <>
          <Icon name="sun" size={20} color="var(--gold)" />
          <span className="grow">{morning.text}</span>
          <button type="button" className="btn sm" onClick={() => openSheet('morning')}>
            Log
          </button>
        </>
      ),
    });
  if (checkinDue)
    candidates.push({
      id: 'checkin',
      priority: 4,
      el: (
        <>
          <Icon name="camera" size={20} color="var(--pearl)" />
          <span className="grow">{lastCheck ? 'Your monthly check-in is due.' : 'Time for your first check-in: photos and a tape measure.'}</span>
          <button type="button" className="btn sm" onClick={() => go('/checkin')}>
            Start
          </button>
        </>
      ),
    });
  if (pwa.canInstall && !pwa.installed)
    candidates.push({
      id: 'install',
      priority: 1,
      el: (
        <>
          <Icon name="phone" size={20} color="var(--pearl)" />
          <span className="grow">Install Health on your home screen so it opens full-screen.</span>
          <button type="button" className="btn sm" onClick={() => promptInstall()}>
            Install
          </button>
        </>
      ),
    });

  const model = entries ? modelFor(settings, days, entries, today) : undefined;
  const checkIn = model ? weeklyCheckIn(model, targetsFor(settings, today), settings.maintenanceSeen) : undefined;
  if (checkIn && model?.kcal !== undefined)
    candidates.push({
      id: 'maintenance',
      priority: 7,
      el: (
        <>
          <Icon name="trend" size={20} color="var(--kcal)" />
          <span className="grow">{checkIn.text}</span>
          <span className="col gap4">
            <button type="button" className="btn sm" onClick={() => patchSettings({ maintenanceSeen: model.kcal })}>
              Keep
            </button>
            {checkIn.proposal && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={async () => {
                  await setTargets({ ...targetsFor(settings, today), ...checkIn.proposal });
                  await patchSettings({ maintenanceSeen: model.kcal });
                  toast({ text: 'Calorie range moved with maintenance', sub: `${checkIn.proposal!.kcalMin}–${checkIn.proposal!.kcalMax} kcal` });
                }}
              >
                Adjust
              </button>
            )}
          </span>
        </>
      ),
    });

  const dose = nextDose(Date.now(), doseSchedule(settings.checklist.filter((i) => i.med), today, settings, todayDay), todayDay?.ticks, todayDay?.missed);
  if (dose && dose.at - Date.now() <= 2 * 3_600_000) {
    const mins = Math.round((dose.at - Date.now()) / 60_000);
    const when = mins > 0 ? `in ${mins >= 60 ? `${Math.floor(mins / 60)} h ` : ''}${mins % 60} min` : mins === 0 ? 'now' : `${-mins} min ago`;
    candidates.push({
      id: 'next-dose',
      priority: 8,
      anytime: true,
      el: (
        <>
          <Icon name="pill" size={20} color="var(--sage)" />
          <span className="grow">
            {dose.name} at {fmtTime(dose.at)} · {when}
          </span>
          <button type="button" className="btn sm" onClick={() => openSheet('checklist')}>
            Tick
          </button>
        </>
      ),
    });
  }
  const weekdayNow = logWeekdaySun(Date.now());
  if (settings.reviewDay !== undefined && weekdayNow === settings.reviewDay)
    candidates.push({
      id: 'review-day',
      priority: 3,
      el: (
        <>
          <Icon name="save" size={20} color="var(--protein)" />
          <span className="grow">Review day. Export the audit pack and ask Claude what to change.</span>
          <button type="button" className="btn sm" onClick={() => go('/settings', { at: 'data' })}>
            Open
          </button>
        </>
      ),
    });
  const lastFull = settings.backup.lastFull;
  if (weekdayNow === 0 && (!lastFull || Date.now() - lastFull > 6 * 86_400_000) && !nudge)
    candidates.push({
      id: 'backup-sunday',
      priority: 6,
      el: (
        <>
          <Icon name="save" size={20} color="var(--gold)" />
          <span className="grow">Sunday: time for the weekly full backup, photos included.</span>
          <button type="button" className="btn sm" onClick={() => go('/settings', { at: 'backup' })}>
            Back up
          </button>
        </>
      ),
    });

  // One banner at a time, near the hour you usually log.
  const shown = pickBanner(candidates, usage, Date.now());
  return shown ? <div className="banner">{shown.el}</div> : null;
}
