import { useState } from 'react';
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

/** Quiet banners on Today: a new version, a backup nudge, installing. Never notifications. */
export function Banners() {
  const pwa = usePwa();
  const settings = useSettings();
  const days = useAllDays();
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const lastWeek = lastFullWeek(dayKey());
  const recapNote = useLiveQuery(async () => (await db.weeks.get(lastWeek)) ?? null, [lastWeek]);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!settings || !days || !checkins || recapNote === undefined) return null;
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

  return (
    <>
      {pwa.needRefresh && (
        <div className="banner">
          <Icon name="upload" size={20} color="var(--sage)" />
          <span className="grow">A new version of Health is ready.</span>
          <button type="button" className="btn sm" onClick={() => applyUpdate()}>
            Reload
          </button>
        </div>
      )}
      {nudge && (
        <div className="banner">
          <Icon name="save" size={20} color="var(--gold)" />
          <span className="grow">{last ? `No backup for ${daysSince} days.` : 'No backup yet.'} One tap keeps your data safe.</span>
          <button type="button" className="btn sm" onClick={backup} disabled={busy}>
            Back up
          </button>
        </div>
      )}
      {recapReady && (
        <div className="banner">
          <Icon name="calendar" size={20} color="var(--gold)" />
          <span className="grow">Your week, {fmtDayMonth(lastWeek)}–{fmtDayMonth(addDays(lastWeek, 6))}, is ready. The receipt is printed.</span>
          <button type="button" className="btn sm" onClick={() => go('/week')}>
            Open
          </button>
        </div>
      )}
      {checkinDue && (
        <div className="banner">
          <Icon name="camera" size={20} color="var(--pearl)" />
          <span className="grow">{due ? 'Your monthly check-in is due.' : 'Time for your first check-in: photos and a tape measure.'}</span>
          <button type="button" className="btn sm" onClick={() => go('/checkin')}>
            Start
          </button>
        </div>
      )}
      {pwa.canInstall && !pwa.installed && (
        <div className="banner">
          <Icon name="phone" size={20} color="var(--pearl)" />
          <span className="grow">Install Health on your home screen so it opens full-screen.</span>
          <button type="button" className="btn sm" onClick={() => promptInstall()}>
            Install
          </button>
        </div>
      )}
    </>
  );
}
