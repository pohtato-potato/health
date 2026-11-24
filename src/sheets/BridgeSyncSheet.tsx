import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { editDay } from '../db/actions';
import { applyBridgeDayFiles, resolveBridgeMeal, reviewBridgeMeals } from '../db/bridgeApply';
import { readBridgeStepDay } from '../db/bridgeSteps';
import { readBridgeSleepNight } from '../db/bridgeSleep';
import { syncConnectedBridge } from '../db/bridgeSync';
import { useDay, useSettings, useToday } from '../db/hooks';
import { fmtDayMonth, fmtDuration, fmtInt, fmtTime } from '../domain/format';
import { timestamp } from '../sources/bridgeFile';
import {
  bridgeDriveClientId, bridgeDriveToken, connectBridgeDrive, disconnectBridgeDrive, prepareBridgeDriveSignIn,
} from '../sources/bridgeDriveAuth';
import { DateChip } from '../ui/DateChip';
import { Sheet } from '../ui/Sheet';

const CLIENT_ID = 'health-bridge-client-id';
function getClientId() {
  if (bridgeDriveClientId) return bridgeDriveClientId;
  try { return localStorage.getItem(CLIENT_ID) ?? ''; } catch { return ''; }
}

function when(iso: string) {
  const at = timestamp(iso);
  return at ? `${fmtDayMonth(at.localDate)}, ${String(Math.floor(at.minute / 60)).padStart(2, '0')}:${String(at.minute % 60).padStart(2, '0')}` : '';
}

export function BridgeSyncSheet({ onClose }: { onClose: () => void }) {
  const [id, setId] = useState(getClientId);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const settings = useSettings();
  const today = useToday();
  const [date, setDate] = useState(today);
  const day = useDay(date);
  const readings = useLiveQuery(async () => ({
    steps: await readBridgeStepDay(date), sleep: (await readBridgeSleepNight(date))?.main,
  }), [date]);
  const pending = useLiveQuery(reviewBridgeMeals, []);
  const last = settings?.bridgeDriveSync;

  const run = (action: () => Promise<void>) => {
    setBusy(true);
    setProblem('');
    setNotice('');
    void action().catch((error: unknown) => setProblem(error instanceof Error ? error.message : 'Bridge sync could not finish.'))
      .finally(() => setBusy(false));
  };

  const prepare = () => prepareBridgeDriveSignIn().then(() => setReady(true));
  useEffect(() => {
    if (id && /^[\w-]+\.apps\.googleusercontent\.com$/.test(id)) void prepare().catch(() => undefined);
  }, [id]);

  const describe = (result: Awaited<ReturnType<typeof applyBridgeDayFiles>>) => {
    const changes = [result.steps && `${result.steps} step day${result.steps === 1 ? '' : 's'}`,
      result.sleep && `${result.sleep} sleep log${result.sleep === 1 ? '' : 's'}`,
      result.meals && `${result.meals} Bevel entr${result.meals === 1 ? 'y' : 'ies'}`].filter(Boolean);
    return (changes.length ? `Updated ${changes.join(', ')}.` : 'Health is up to date with the files received.') +
      (result.pendingMeals ? ` ${result.pendingMeals} possible meal duplicate${result.pendingMeals === 1 ? '' : 's'} to review.` : '');
  };
  const sync = () => run(async () => {
    if (!bridgeDriveToken()) {
      const client = id.trim();
      if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(client)) throw new Error('Enter the Google web OAuth client ID.');
      if (!ready) {
        await prepare();
        setNotice('Google sign-in loaded. Tap Connect and sync.');
        return;
      }
      await connectBridgeDrive(client);
      if (!bridgeDriveClientId) {
        try { localStorage.setItem(CLIENT_ID, client); } catch { /* The public ID can be entered again. */ }
      }
    }
    const result = await syncConnectedBridge();
    setNotice(describe(result) + (result.failed ? ` The iPad could not send ${result.failed} day${result.failed === 1 ? '' : 's'}.` : ''));
  });

  return (
    <Sheet title="Health Bridge" sub="Apple Health and Bevel" onClose={onClose}>
      {last && <p className="t13 q">Last Drive import {fmtTime(last.importedAt)} · iPad sync {when(last.lastSync)}{last.failed ? ` · ${last.failed} unsent` : ''}</p>}
      <DateChip value={date} onChange={setDate} />
      {readings?.steps && <p className="t13 q">Apple Health · {fmtInt(readings.steps.count)} steps through {fmtTime(readings.steps.observedThrough)}{day?.steps !== undefined && !day.bridgeSteps ? ` · You kept ${fmtInt(day.steps)}` : ''}</p>}
      {readings?.sleep && <p className="t13 q">Apple Health · {readings.sleep.source} · {fmtDuration(Math.round(readings.sleep.asleepMinutes))} measured sleep{day?.sleep && !day.bridgeSleep ? ' · You kept your sleep log' : ''}</p>}
      {(day?.bridgeSteps || day?.bridgeSleep) && <div className="col gap8">
        {day.bridgeSteps && <button type="button" className="btn ghost block" disabled={busy} onClick={() => run(async () => {
          await editDay(date, (current) => current.bridgeSteps ? { steps: undefined, stepsAt: undefined } : {});
          setNotice('Imported steps turned off for this day.');
        })}>Remove imported steps for this day</button>}
        {day.bridgeSleep && day.sleep?.rested === undefined && <button type="button" className="btn ghost block" disabled={busy} onClick={() => run(async () => {
          await editDay(date, (current) => current.bridgeSleep && current.sleep?.rested === undefined ? { sleep: undefined } : {});
          setNotice('Imported sleep turned off for this day.');
        })}>Remove imported sleep for this day</button>}
      </div>}
      {!bridgeDriveClientId && !bridgeDriveToken() && (
        <label className="flabel">
          <span className="lbl">Google web OAuth client ID</span>
          <input className="field" value={id} disabled={busy} autoCapitalize="none" autoComplete="off" spellCheck={false} onChange={(e) => setId(e.target.value)} />
          <span className="t13 q">Use a web client from the same Google Cloud project as the iPad Bridge.</span>
        </label>
      )}
      <button type="button" className="btn block" disabled={busy} onClick={sync}>{bridgeDriveToken() ? 'Sync now' : 'Connect and sync'}</button>
      {bridgeDriveToken() && <button type="button" className="btn ghost block" disabled={busy} onClick={() => { disconnectBridgeDrive(); setNotice('Drive disconnected. Cached readings are still in Health.'); }}>Disconnect Drive</button>}
      <button type="button" className="btn ghost block" disabled={busy} onClick={() => fileInput.current?.click()}>Import Bridge day files</button>
      <input ref={fileInput} type="file" accept="application/json,.json" multiple hidden onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (files.length) run(async () => setNotice(describe(await applyBridgeDayFiles(await Promise.all(files.map((file) => file.text()))))));
      }} />
      {busy && <p className="t13 q" role="status">Checking Bridge data…</p>}
      {notice && <p className="t13 q" role="status">{notice}</p>}
      {problem && <p className="t13" role="alert">{problem}</p>}
      {!!pending?.length && <h3 className="k-sect">Possible meal duplicates</h3>}
      {pending?.map((meal) => (
        <div className="card col gap8" key={meal.id}>
          <span className="t15">{meal.manualName}</span>
          <span className="t13 q">Bevel entry · {fmtInt(meal.kcal)} kcal · logged {when(meal.loggedAt)}</span>
          <button type="button" className="btn ghost block" disabled={busy} onClick={() => run(() => resolveBridgeMeal(meal.id, 'keep-manual'))}>Keep manual entry</button>
          <button type="button" className="btn ghost block" disabled={busy} onClick={() => run(() => resolveBridgeMeal(meal.id, 'include'))}>Add Bevel as a separate entry</button>
        </div>
      ))}
    </Sheet>
  );
}
