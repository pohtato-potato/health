import { useState, type ReactNode } from 'react';
import { pickBanner, type BannerCandidate } from '../domain/banners';
import { saveBackup } from '../db/backup';
import { useAllDays, useSettings } from '../db/hooks';
import { applyUpdate, promptInstall, usePwa } from '../pwa';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { addDays, dayKey, weekday } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { lastFullWeek } from '../domain/weekly';
import { go } from '../router';
import { nextCheckInDate } from './Photos';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';

/** One quiet banner on Today: a new version, a backup nudge, the week, a check-in, installing. Never notifications. */
export function Banners() {
  const pwa = usePwa();
  const settings = useSettings();
  const days = useAllDays();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const lastWeek = lastFullWeek(dayKey());
  const recapNote = useLiveQuery(async () => (await db.weeks.get(lastWeek)) ?? null, [lastWeek]);
  const toast = useToast();
  const usage = useLiveQuery(() => db.usage.where('at').above(Date.now() - 14 * 86_400_000).toArray(), []);
  const [busy, setBusy] = useState(false);
  if (!settings || !days || !checkins || recapNote === undefined || !usage) return null;
  const recapReady = !recapNote?.recapSeenAt && weekday(dayKey()) <= 2 && days.some((d) => d.date >= lastWeek && d.date <= addDays(lastWeek, 6));
  const due = nextCheckInDate(checkins);
  const today = dayKey();
  const checkinDue = due ? due <= today : Date.now() - settings.createdAt > 3 * 86_400_000;

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
  if (checkinDue)
    candidates.push({
      id: 'checkin',
      priority: 4,
      el: (
        <>
          <Icon name="camera" size={20} color="var(--pearl)" />
          <span className="grow">{due ? 'Your monthly check-in is due.' : 'Time for your first check-in: photos and a tape measure.'}</span>
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

  // One banner at a time, near the hour you usually log.
  const shown = pickBanner(candidates, usage, Date.now());
  return shown ? <div className="banner">{shown.el}</div> : null;
}
