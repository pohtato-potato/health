import { useEffect, useRef, useState, type ReactNode, createContext, useContext } from 'react';
import { fmtDayMonth, fmtDuration, fmtInt, fmtLitres } from '../domain/format';
import { dayKey } from '../domain/dates';
import { DEFAULT_MEAL_TIMES, MEAL_NAMES, MEALS, prefOn, type ChecklistItem, type Place, type PlaceKind, type Settings, type Targets } from '../domain/types';
import { homePlace } from '../domain/places';
import { bump, patchSettings, setTargets } from '../db/actions';
import { backupWords, saveBackup, summarise, type FileCheck } from '../db/backup';
import { spokenLine } from '../domain/voice';
import { checkFullBackupFile, readBackupFile, restoreAll, saveFullBackup, type ParsedBackup } from '../db/fullBackup';
import { canUseFingerprint, registerFingerprint } from '../checkin/lock';
import { saveWorkbook } from '../export/saveWorkbook';
import { db, uid } from '../db/db';
import { useSettings, useToday } from '../db/hooks';
import { askPersist, usePwa } from '../pwa';
import { back, go, openSheet, useRoute } from '../router';
import { DecField, IntField, LinkRow, Seg, SwitchRow, TimeTile } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { targetsFor } from '../state/derived';
import { ThemeSheet, useUnlockedIds } from '../ui/Theme';
import { PROJECT_INSTRUCTIONS, ReviewSheet } from './Review';
import { themeById } from '../domain/themes';
import { askConfirm } from '../ui/Confirm';
import { setupGaps } from '../domain/setupCheck';
import { saveAuditPack } from '../export/saveAuditPack';
import { parseFoodFixes, type FoodFix } from '../domain/foodFixes';
import { FoodFixSheet } from '../sheets/FoodFixSheet';

type Editor = null | 'targets' | 'item' | 'homes' | 'you' | 'theme' | 'review';

export function SettingsScreen() {
  const settings = useSettings();
  const today = useToday();
  const { params } = useRoute();
  const pwa = usePwa();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [item, setItem] = useState<ChecklistItem | null>(null);
  const [pending, setPending] = useState<{ kind: 'backup'; parsed: ParsedBackup } | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const fixesInput = useRef<HTMLInputElement>(null);
  const [foodFixes, setFoodFixes] = useState<{ fixes: FoodFix[]; from?: string } | null>(null);
  const checkInput = useRef<HTMLInputElement>(null);
  const [checked, setChecked] = useState<FileCheck>();
  const [savedLine, setSavedLine] = useState('');
  const unlocked = useUnlockedIds();

  const [open, setOpen] = useState<string | null>(params.get('at'));
  useEffect(() => {
    const at = params.get('at');
    if (at) {
      const id = at === 'data' || at === 'backup' || at === 'export' || at === 'storage' ? 'backups' : at === 'walk' ? 'walking' : at;
      setOpen(id);
      requestAnimationFrame(() => document.getElementById(`s-${id}`)?.scrollIntoView({ block: 'start' }));
    }
  }, [params, settings === undefined]);

  if (!settings) return <div className="page bare" />;
  const t = targetsFor(settings, today);
  const p = settings.prefs;
  const setPref = (k: keyof Settings['prefs'], v: boolean) => patchSettings((s) => ({ prefs: { ...s.prefs, [k]: v } }));

  const pickFixes = async (f: File | undefined) => {
    if (!f) return;
    let raw: unknown;
    try {
      raw = JSON.parse(await f.text());
    } catch {
      return toast({ text: 'That file doesn’t open as a food fix file.' });
    }
    const fixes = parseFoodFixes(raw);
    if (typeof fixes === 'string') return toast({ text: fixes });
    setFoodFixes({ fixes, from: typeof (raw as { from?: unknown }).from === 'string' ? (raw as { from: string }).from : undefined });
  };
  const pickBackup = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending({ kind: 'backup', parsed: await readBackupFile(f) });
    } catch (e) {
      toast({ text: (e as Error).message });
    }
  };
  const last = settings.backup.lastQuick;
  const meds = settings.checklist.filter((i) => i.active && i.med).length;
  const summary: Record<string, string> = {
    you: [settings.name, settings.heightCm ? `${settings.heightCm} cm` : '', settings.goalDate ? `reveal ${fmtDayMonth(settings.goalDate)}` : ''].filter(Boolean).join(' · '),
    targets: `${fmtInt(t.kcalMin)}–${fmtInt(t.kcalMax)} · ${t.proteinG} g · ${fmtInt(t.steps)}`,
    walking: `${settings.places?.length ?? 0} places · meal times`,
    checklist: `${settings.checklist.filter((i) => i.active).length} items${meds ? ` · ${meds} medicine${meds === 1 ? '' : 's'}` : ''}`,
    'food-categories': `${settings.foodCategories?.length ?? 0} categor${settings.foodCategories?.length === 1 ? 'y' : 'ies'}`,
    backups: backupWords(settings, today),
    lastfm: settings.lastfm?.key ? `Last.fm connected · ${settings.lastfm.users.length} user${settings.lastfm.users.length === 1 ? '' : 's'}` : 'Last.fm not connected',
    moments: `Gremlin ${prefOn(p, 'gremlin') ? 'on' : 'off'} · ${themeById(settings.theme)?.name ?? 'Dusk'}`,
    privacy: `photos ${prefOn(p, 'blurPhotos') ? 'blurred' : 'shown'}${prefOn(p, 'lockPhotos') && settings.photoKey ? ' · locked' : ''}`,
  };

  return (
    <div className="page bare yu-set-page" style={{ gap: 10 }}>
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <h1 className="h1" style={{ fontSize: 32, marginBottom: 6 }}>
        Settings
      </h1>
      <SetupCard settings={settings} />

      <OpenGroup.Provider value={{ open, toggle: (id) => setOpen(open === id ? null : id), summary }}>
      <Group id="you" title="About you">
        <LinkRow title="Name" value={settings.name || 'Not set'} onClick={() => setEditor('you')} />
        <LinkRow title="Height" value={settings.heightCm ? `${settings.heightCm} cm` : 'Not set'} onClick={() => setEditor('you')} />
        <LinkRow title="Goal date" value={settings.goalDate ? fmtDayMonth(settings.goalDate) + ` ${settings.goalDate.slice(0, 4)}` : 'Not set'} onClick={() => setEditor('you')} />
        <LinkRow title="Birthday" sub="For a theme on the day" value={settings.birthday ? fmtDayMonth(`2000-${settings.birthday}`) : 'Not set'} onClick={() => setEditor('you')} />
      </Group>

      <Group id="targets" title="Targets">
        <LinkRow title="Calories" value={`${fmtInt(t.kcalMin)}–${fmtInt(t.kcalMax)} kcal`} onClick={() => setEditor('targets')} />
        <LinkRow title="Protein" value={`${t.proteinG} g`} onClick={() => setEditor('targets')} />
        <LinkRow title="Steps" value={fmtInt(t.steps)} onClick={() => setEditor('targets')} />
        {prefOn(settings.prefs, 'water') && <LinkRow title="Water" value={`${fmtLitres(t.waterMl)} L`} onClick={() => setEditor('targets')} />}
        <LinkRow title="Sleep" value={`${fmtDuration(t.sleepMin)} or more`} onClick={() => setEditor('targets')} />
        <LinkRow title="Training" value={`${t.sessionsPerWeek} sessions a week`} onClick={() => setEditor('targets')} />
        <SwitchRow
          title="Free-meal save-up"
          sub="Landing under your calorie ceiling banks the difference for the week's free meal. Days under the floor never count."
          checked={prefOn(p, 'freeMealSaveUp')}
          onChange={(v) => setPref('freeMealSaveUp', v)}
        />
        <SwitchRow title="Suggest target changes" sub="Only ever more food or more steps, and only when you tap to accept" checked={prefOn(p, 'suggestTargets')} onChange={(v) => setPref('suggestTargets', v)} />
      </Group>

      <Group id="walking" title="Places and the walk">
        <div className="li" style={{ minHeight: 64 }}>
          <span className="s">
            <span>Your loop at home</span>
            <small>Steps for one lap, used for laps stats</small>
          </span>
          <div style={{ width: 92 }}>
            <IntField value={settings.loopSteps} onChange={(v) => patchSettings({ loopSteps: v })} placeholder="steps" className="field sm" />
          </div>
        </div>
        <div className="li" style={{ minHeight: 64 }}>
          <span className="s">
            <span>Your stride</span>
            <small>Metres per step, used for every distance on the walk. Changing it moves the whole walk at once. Leave empty for 0.74</small>
          </span>
          <div style={{ width: 92 }}>
            <DecField value={settings.strideM} onChange={(v) => patchSettings({ strideM: v === undefined || (v >= 0.3 && v <= 1.5) ? v : settings.strideM })} placeholder="0.74" label="Stride in metres" className="field sm" />
          </div>
        </div>
        <SwitchRow title="Confirm yesterday's steps each morning" sub="Samsung Health has the final count by then" checked={p.confirmSteps} onChange={(v) => setPref('confirmSteps', v)} />
        <LinkRow title="Places and the walk" sub="Each brings its meal times, step goal and the foods shown first" value={(settings.places?.length ? settings.places : settings.homes).map((h) => h.name).join(', ')} onClick={() => setEditor('homes')} />
      </Group>

      <Group id="checklist" title="Checklist">
        <LinkRow title="Medicines" sub="Courses, stock, appointments and rewards" onClick={() => go('/medicines')} />
        {settings.checklist.map((i) => (
          <div key={i.id} className="li">
            <button type="button" className="s grow" style={{ textAlign: 'left' }} onClick={() => (setItem(i), setEditor('item'))}>
              <span>{i.name}</span>
              <small>{i.slots.join(' and ') || 'Daily'}</small>
            </button>
            <input
              type="checkbox"
              className="sw"
              aria-label={`${i.name} on the checklist`}
              checked={i.active}
              onChange={(e) => patchSettings((s) => ({ checklist: s.checklist.map((x) => (x.id === i.id ? { ...x, active: e.target.checked } : x)) }))}
            />
          </div>
        ))}
        <button type="button" className="li q" onClick={() => (setItem(null), setEditor('item'))}>
          + Add an item
        </button>
        <div className="li" style={{ minHeight: 44 }}>
          <small className="t12 d">No streaks or confetti here. It's a plain record you can show your doctor.</small>
        </div>
      </Group>

      <Group id="food-categories" title="Food categories">
        {(settings.foodCategories ?? []).map((c) => (
          <div key={c.id} className="li">
            <input
              className="field inline-name"
              defaultValue={c.name}
              aria-label="Category name"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (!v) e.target.value = c.name;
                else if (v !== c.name) void patchSettings((st) => ({ foodCategories: (st.foodCategories ?? []).map((x) => (x.id === c.id ? { ...x, name: v } : x)) }));
              }}
            />
            <small className="t12 q">{c.foodIds.length} foods</small>
            <button
              type="button"
              className="chip sm"
              onClick={async () => {
                if (await askConfirm({ title: `Remove the category “${c.name}”?`, body: 'The foods stay; only the tab goes.', yes: 'Remove' })) void patchSettings((st) => ({ foodCategories: (st.foodCategories ?? []).filter((x) => x.id !== c.id) }));
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="li" style={{ minHeight: 44 }}>
          <small className="t12 d">Add a food to a category from the food's own page. Categories show as tabs when adding food.</small>
        </div>
      </Group>

      <div className="list">
        <LinkRow title="Session settings" sub="Plan, plates, rest ding and buzz. Also on Train." onClick={() => openSheet('session-settings')} />
      </div>

      <Group id="moments" title="Moments and themes">
        <SwitchRow title="The Gremlin" sub="Its lines around the app. Off, the app just gives you the facts." checked={prefOn(p, 'gremlin')} onChange={(v) => { setPref('gremlin', v); void bump('voices', { value: v ? 'on' : 'off' }); }} />
        <LinkRow title="Theme" value={themeById(settings.theme)?.name ?? 'Dusk'} onClick={() => setEditor('theme')} />
        <SwitchRow title="Moments" sub="Full-screen celebrations for records, firsts and perfect days" checked={prefOn(p, 'moments')} onChange={(v) => setPref('moments', v)} />
        <SwitchRow title="Seasonal themes" sub="Diwali, Holi and your birthday take over for the day" checked={prefOn(p, 'seasonal')} onChange={(v) => setPref('seasonal', v)} />
        <SwitchRow title="Quiet in public" sub="No confetti or buzz from 10 pm to 7 am, or while a session runs in the background" checked={prefOn(p, 'quietPublic')} onChange={(v) => setPref('quietPublic', v)} />
        <SwitchRow title="Shake for a stat" sub="Shake the phone anywhere in the app" checked={prefOn(p, 'shake')} onChange={(v) => setPref('shake', v)} />
      </Group>

      <Group id="privacy" title="Privacy">
        <SwitchRow title="Blur photos until tapped" checked={prefOn(p, 'blurPhotos')} onChange={(v) => setPref('blurPhotos', v)} />
        {canUseFingerprint() && (
          <SwitchRow
            title="Fingerprint to open photos"
            sub="Uses the phone's own screen lock. A gate for casual eyes: the photos never leave this phone either way."
            checked={prefOn(p, 'lockPhotos') && !!settings.photoKey}
            onChange={async (v) => {
              if (!v) return setPref('lockPhotos', false);
              try {
                const key = await registerFingerprint();
                await patchSettings((s) => ({ photoKey: key, prefs: { ...s.prefs, lockPhotos: true } }));
              } catch {
                toast({ text: 'The fingerprint wasn’t set up. Try again, or keep the blur on.' });
              }
            }}
          />
        )}
      </Group>

      <Group id="backups" title="Data and backups" plain>
        <div className="col gap12" style={{ padding: '18px 18px 6px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 20 }}>
          <div className="row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0, background: last && Date.now() - last < 3 * 86_400_000 ? 'var(--sage)' : 'var(--gold)' }} />
            <div className="col gap2">
              <div className="t15">{backupWords(settings, today)}</div>
              <div className="t12 q">Everything you've logged, in one small file.</div>
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                const r = await saveBackup();
                if (r !== 'cancelled') { toast({ kicker: 'Backup', text: r === 'shared' ? 'Handed over. Pick Drive to keep it safe.' : 'Saved to Downloads.', tone: 'sage' }); setSavedLine(spokenLine(settings, today, 'backup', String(Date.now()))); }
              } catch (e) {
                toast({ text: (e as Error).message });
              }
            }}
          >
            Back up now
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await saveFullBackup();
                if (r !== 'cancelled') toast({ kicker: 'Full backup', text: r === 'shared' ? 'Handed over. Pick Drive to keep it safe.' : 'Saved to Downloads.', tone: 'sage' });
              } catch (e) {
                toast({ text: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            Full backup, with photos
          </button>
          <div className="t12 q lh">
            A quick backup holds every number you've logged: one small file for Google Drive. A full backup adds your photos and form clips. Photos only change at check-ins, so one full backup after each check-in is enough.
            {settings.backup.lastFull ? ` Last full backup: ${fmtDayMonth(dayKey(new Date(settings.backup.lastFull)))}${settings.backup.lastFullBytes ? `, ${(settings.backup.lastFullBytes / 1e6).toFixed(1)} MB` : ''}.` : ''}
          </div>
          <div className="li" style={{ minHeight: 64 }}>
            <span className="s">
              <span>Nudge me after</span>
              <small>A banner on Today, not a notification</small>
            </span>
            <select
              className="field sm"
              style={{ width: 110 }}
              value={settings.backup.nudgeDays}
              onChange={(e) => patchSettings((s) => ({ backup: { ...s.backup, nudgeDays: Number(e.target.value) } }))}
            >
              {[1, 2, 3, 7].map((n) => (
                <option key={n} value={n}>
                  {n} day{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
          {savedLine && <div className="voice" role="status">{savedLine}</div>}
          <LinkRow title="Check a backup file" sub="Looks inside without restoring" onClick={() => checkInput.current?.click()} />
          <input ref={checkInput} type="file" accept="application/json,.json,application/zip,.zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void checkFullBackupFile(f).then(setChecked); }} />
          {checked && (
            <div className="yu-card" role="status">
              <b>{checked.ok ? 'This file opens and reads correctly.' : 'This file has a problem.'}</b>
              <span className="yu-q">{checked.ok ? `${checked.newestDay ? `Up to ${fmtDayMonth(checked.newestDay)}. ` : ''}${checked.summary}.` : checked.why}</span>
            </div>
          )}
          <LinkRow title="Restore from a backup" sub="A snapshot of your numbers is taken first" onClick={() => backupInput.current?.click()} />
          <input ref={backupInput} type="file" accept="application/json,.json,application/zip,.zip" hidden onChange={(e) => (pickBackup(e.target.files?.[0]), (e.target.value = ''))} />
        </div>
        <div className="list">
          <LinkRow title="Data check-up" sub="Slips in your data, each with a fix" onClick={() => go('/checkup')} />
          <LinkRow title="Food fixes from a file" sub="Corrections the coach sends: each offered once" onClick={() => fixesInput.current?.click()} />
          <input ref={fixesInput} type="file" accept="application/json,.json" hidden onChange={(e) => (void pickFixes(e.target.files?.[0]), (e.target.value = ''))} />
          <LinkRow title="Edit history" sub="Every change by day, with undo" onClick={() => go('/history')} />
          <LinkRow title="Snapshots" sub="Seven daily copies, and one before any big change" onClick={() => go('/snapshots')} />
        </div>
        <div className="col gap12" style={{ padding: 18, background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 20 }}>
          <div className="col gap2">
            <div className="t15">Export workbook (.xlsx)</div>
            <div className="t12 q">12 sheets, every log, no photos. Readable by Claude, Excel and Google Sheets.</div>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' }}>
            {['README', 'Summary', 'Daily', 'Food log', 'My foods', 'Sets', 'Sessions', 'Weekly', 'Measurements', 'Records', 'Targets history', 'Plan'].map((n, i) => (
              <span key={n} className="t12" style={{ padding: '6px 10px', borderRadius: 12, background: 'var(--raised)', color: i < 2 ? 'var(--pearl)' : 'var(--quiet)' }}>
                {n}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={async () => {
              try {
                const r = await saveWorkbook();
                if (r !== 'cancelled') toast({ kicker: 'Workbook', text: r === 'shared' ? 'Handed over. Save it or send it to Claude.' : 'Saved to Downloads.', tone: 'sage' });
              } catch (e) {
                toast({ text: `Export failed: ${(e as Error).message}` });
              }
            }}
          >
            Export workbook
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={async () => {
              try {
                const r = await saveAuditPack();
                if (r !== 'cancelled') toast({ kicker: 'Audit pack', text: 'Ready for Claude: the workbook, usage, edits and notes. No secrets inside.', tone: 'sage' });
              } catch (e) {
                toast({ text: `Export failed: ${(e as Error).message}` });
              }
            }}
          >
            Export the audit pack
          </button>
          <div className="col gap8">
            <span className="lbl">Review day</span>
            <div className="row wrap" style={{ gap: 6, justifyContent: 'flex-start' }} role="radiogroup" aria-label="Review day">
              {['Off', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                const v = i === 0 ? undefined : i - 1;
                const on = settings.reviewDay === v;
                return (
                  <button key={d} type="button" role="radio" aria-checked={on} className={`chip sm${on ? ' on' : ''}`} onClick={() => patchSettings({ reviewDay: v })}>
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <AuditNoteBox />
        </div>
        <button type="button" className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setEditor('review')}>
          <span className="col gap2">
            <span className="t15">Monthly review with Claude</span>
            <span className="t12 q">A ready-made prompt, plus the workbook, in one tap</span>
          </span>
          <Icon name="right" size={18} stroke={1.8} color="var(--dim)" />
        </button>
        <div className="card" style={{ gap: 10 }}>
          <div className="row base">
            <span className="t15">Claude Project instructions</span>
            <button
              type="button"
              className="btn ghost sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(PROJECT_INSTRUCTIONS);
                  toast({ kicker: 'Copied', text: 'Paste into a Claude Project’s instructions.', tone: 'sage' });
                } catch {
                  toast({ kicker: 'Copy', text: 'Select the text and copy it by hand.', tone: 'sage' });
                }
              }}
            >
              Copy
            </button>
          </div>
          <div className="t12 q lh">Make a Project in Claude for your monthly reviews and paste these in, so every month is read against the last.</div>
          <div className="t13 lh prompt-box">{PROJECT_INSTRUCTIONS}</div>
        </div>
        <div className="list">
        <div className="li" style={{ minHeight: 64 }}>
          <span className="s">
            <span>{pwa.persisted ? 'Protected storage is on' : 'Protected storage is off'}</span>
            <small>{pwa.persisted ? "Chrome won't clear Health's data when space runs low." : 'Ask Chrome not to clear Health’s data when space runs low.'}</small>
          </span>
          {!pwa.persisted && (
            <button type="button" className="btn sm" onClick={async () => toast({ text: (await askPersist()) ? 'Protected storage is on.' : 'Chrome said not yet. Installing the app usually unlocks it.' })}>
              Turn on
            </button>
          )}
        </div>
        <button
          type="button"
          className="li"
          style={{ color: '#e38a7c' }}
          onClick={async () => {
            if (!(await askConfirm({ title: 'Erase everything on this phone?', body: 'Make a backup first: this cannot be undone.', yes: 'Erase', danger: true }))) return;
            if (!(await askConfirm({ title: 'Really erase everything?', yes: 'Erase everything', danger: true }))) return;
            await db.delete();
            window.location.replace(window.location.pathname);
          }}
        >
          Erase everything on this phone
        </button>
        <div className="li" style={{ minHeight: 64 }}>
          <span className="s">
            <span>Shortcuts</span>
            <small>Long-press the Health icon for Morning log, Add food and Start session.</small>
          </span>
        </div>
        {!pwa.installed && (
          <div className="li" style={{ minHeight: 64 }}>
            <span className="s">
              <span>Install</span>
              <small>In Chrome, tap ⋮ then Add to Home screen, and open Health from its icon.</small>
            </span>
          </div>
        )}
        </div>
      </Group>

      <Group id="lastfm" title="Connections">
        <LastfmFields settings={settings} />
      </Group>
      </OpenGroup.Provider>

      <div className="t12 d center" style={{ paddingTop: 18 }}>
        Health {__APP_VERSION__} · everything stays on this phone
      </div>

      {editor === 'targets' && <TargetsEditor targets={t} onClose={() => setEditor(null)} />}
      {editor === 'item' && <ItemEditor item={item} onClose={() => setEditor(null)} />}
      {editor === 'homes' && <HomesEditor settings={settings} onClose={() => setEditor(null)} />}
      {editor === 'you' && <YouEditor settings={settings} onClose={() => setEditor(null)} />}
      {editor === 'review' && <ReviewSheet onClose={() => setEditor(null)} />}
      {editor === 'theme' && unlocked && <ThemeSheet settings={settings} unlocked={unlocked} today={today} onClose={() => setEditor(null)} />}
      {pending?.kind === 'backup' && (
        <Sheet title="Restore this backup?" onClose={() => setPending(null)}>
          <div className="t15 lh">
            From {new Date(pending.parsed.file.exportedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}: {summarise(pending.parsed.file)}
            {pending.parsed.media ? `, ${pending.parsed.media.photos.length} photos and ${pending.parsed.media.clips.length} clips` : ''}.
          </div>
          <div className="t14 apri lh">This replaces everything on this phone with the backup. Anything logged since then is lost, so back up first if unsure.</div>
          <button
            type="button"
            className="btn lg block"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await restoreAll(pending.parsed);
                setPending(null);
                toast({ kicker: 'Restored', text: summarise(pending.parsed.file), tone: 'sage' });
              } catch (e) {
                toast({ text: (e as Error).message });
              } finally {
                setBusy(false);
              }
            }}
          >
            Replace and restore
          </button>
        </Sheet>
      )}
      {foodFixes && <FoodFixSheet fixes={foodFixes.fixes} from={foodFixes.from} onClose={() => setFoodFixes(null)} />}
    </div>
  );
}

const OpenGroup = createContext<{ open: string | null; toggle: (id: string) => void; summary: Record<string, string> }>({ open: null, toggle: () => {}, summary: {} });

/** A Settings group as one summary row (s43); tapping it opens the group's detail beneath. */
function Group({ id, title, children, plain }: { id: string; title: string; children: ReactNode; plain?: boolean }) {
  const { open, toggle, summary } = useContext(OpenGroup);
  const isOpen = open === id;
  return (
    <section id={`s-${id}`} className="col gap8" style={{ scrollMarginTop: 16 }}>
      <button type="button" className="set-row" aria-expanded={isOpen} onClick={() => toggle(id)}>
        <span className="col gap2" style={{ minWidth: 0, textAlign: 'left' }}>
          <span className="t15">{title}</span>
          {summary[id] && !isOpen && <span className="t12 q">{summary[id]}</span>}
        </span>
        <Icon name={isOpen ? 'up' : 'down'} size={16} stroke={1.8} color="var(--dim)" />
      </button>
      {isOpen && (plain ? children : <div className="list">{children}</div>)}
    </section>
  );
}

function TargetsEditor({ targets, onClose }: { targets: Targets; onClose: () => void }) {
  const [v, setV] = useState({ ...targets, waterL: targets.waterMl / 1000, sleepH: targets.sleepMin / 60 });
  const num = (k: keyof typeof v) => (x: number | undefined) => setV({ ...v, [k]: x ?? 0 });
  const ok = v.kcalMin > 0 && v.kcalMax >= v.kcalMin && v.proteinG > 0 && v.steps > 0;
  return (
    <Sheet title="Targets" sub="New targets apply from today. Past days keep theirs." onClose={onClose}>
      <div className="grid2">
        <label className="flabel">
          <span className="lbl apri">Calories from</span>
          <IntField value={v.kcalMin} onChange={num('kcalMin')} />
        </label>
        <label className="flabel">
          <span className="lbl apri">Calories to</span>
          <IntField value={v.kcalMax} onChange={num('kcalMax')} />
        </label>
        <label className="flabel">
          <span className="lbl lav">Protein, g</span>
          <IntField value={v.proteinG} onChange={num('proteinG')} />
        </label>
        <label className="flabel">
          <span className="lbl sage">Steps</span>
          <IntField value={v.steps} onChange={num('steps')} />
        </label>
        <label className="flabel">
          <span className="lbl blue">Water, litres</span>
          <DecField value={v.waterL} onChange={num('waterL')} />
        </label>
        <label className="flabel">
          <span className="lbl blue">Sleep, hours</span>
          <DecField value={v.sleepH} onChange={num('sleepH')} />
        </label>
        <label className="flabel">
          <span className="lbl">Sessions a week</span>
          <IntField value={v.sessionsPerWeek} onChange={num('sessionsPerWeek')} />
        </label>
      </div>
      <div className="t13 q lh">The calorie ring closes inside the range: a floor as well as a ceiling, so eating too little never counts.</div>
      <button
        type="button"
        className="btn lg block"
        disabled={!ok}
        onClick={async () => {
          await setTargets({
            kcalMin: v.kcalMin,
            kcalMax: v.kcalMax,
            proteinG: v.proteinG,
            steps: v.steps,
            waterMl: Math.round(v.waterL * 1000),
            sleepMin: Math.round(v.sleepH * 60),
            sessionsPerWeek: v.sessionsPerWeek,
          });
          onClose();
        }}
      >
        Save targets
      </button>
    </Sheet>
  );
}

function ItemEditor({ item, onClose }: { item: ChecklistItem | null; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '');
  const [slots, setSlots] = useState(item?.slots.join(', ') ?? 'Morning');
  const save = async () => {
    const next: ChecklistItem = {
      id: item?.id ?? uid(),
      name: name.trim(),
      slots: slots
        .split(/,| and /)
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1)),
      active: item?.active ?? true,
    };
    await patchSettings((s) => ({ checklist: item ? s.checklist.map((x) => (x.id === item.id ? next : x)) : [...s.checklist, next] }));
    onClose();
  };
  return (
    <Sheet title={item ? 'Edit item' : 'Add an item'} onClose={onClose}>
      <label className="flabel">
        <span className="lbl">What</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vitamin D" autoFocus={!item} />
      </label>
      <label className="flabel">
        <span className="lbl">When, one tick each</span>
        <input className="field" value={slots} onChange={(e) => setSlots(e.target.value)} placeholder="Morning, 9 pm" />
        <span className="t12 q">Separate times with commas: “Morning, 9 pm” makes two ticks a day.</span>
      </label>
      <button type="button" className="btn lg block" disabled={!name.trim()} onClick={save}>
        Save
      </button>
      {item && (
        <button
          type="button"
          className="btn danger block"
          onClick={async () => {
            await patchSettings((s) => ({ checklist: s.checklist.filter((x) => x.id !== item.id) }));
            onClose();
          }}
        >
          Remove from the checklist
        </button>
      )}
    </Sheet>
  );
}

const KINDS: { id: PlaceKind; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'office', label: 'Office' },
  { id: 'trip', label: 'Trip' },
  { id: 'friends', label: 'Friends' },
];

/** A new place of a kind starts with that kind's usual rules. */
function newPlace(kind: PlaceKind): Place {
  const outside = kind !== 'home';
  return { id: uid(), name: KINDS.find((k) => k.id === kind)!.label, kind, meals: { ...(kind === 'office' ? DEFAULT_MEAL_TIMES.office : DEFAULT_MEAL_TIMES.home) }, eased: kind === 'office' || kind === 'trip', foodsFirst: outside ? 'outside' : 'home' };
}

function HomesEditor({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const [places, setPlaces] = useState<Place[]>(() => (settings.places?.length ? settings.places : [homePlace(settings)]).map((p) => ({ ...p, meals: { ...p.meals } })));
  const [open, setOpen] = useState<string | null>(null);
  const edit = (id: string, patch: Partial<Place>) => setPlaces(places.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  return (
    <Sheet title="Places" sub="The morning log asks where you are. Each place sets its meal times, step goal and which foods come first." onClose={onClose} tall>
      {places.map((p) => (
        <div key={p.id} className="card" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <input className="field inline-name" value={p.name} aria-label="Place name" onChange={(e) => edit(p.id, { name: e.target.value })} />
            <button type="button" className="chip sm" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>
              {open === p.id ? 'Done' : 'Edit'}
            </button>
          </div>
          <Seg options={KINDS} value={p.kind} onChange={(kind) => edit(p.id, { kind })} />
          {open === p.id && (
            <>
              {p.kind !== 'trip' && p.kind !== 'friends' ? (
                <div className="grid2">
                  {MEALS.map((m) => (
                    <TimeTile key={m} label={MEAL_NAMES[m]} minutes={p.meals[m]} onChange={(v) => edit(p.id, { meals: { ...p.meals, [m]: v } })} />
                  ))}
                </div>
              ) : (
                <div className="t13 q">Trips and friends' places keep home's meal times.</div>
              )}
              <SwitchRow title="Ease the step goal here" sub="2,000 fewer steps, never below 6,000" checked={p.eased} onChange={(eased) => edit(p.id, { eased })} />
              <div className="flabel">
                <span className="lbl">Foods shown first</span>
                <Seg
                  options={[
                    { id: 'home', label: 'Home food' },
                    { id: 'outside', label: 'Outside' },
                    { id: 'normal', label: 'As usual' },
                  ]}
                  value={p.foodsFirst}
                  onChange={(foodsFirst) => edit(p.id, { foodsFirst })}
                />
              </div>
              {places.length > 1 && (
                <button type="button" className="link" onClick={() => setPlaces(places.filter((x) => x.id !== p.id))}>
                  Remove this place
                </button>
              )}
            </>
          )}
        </div>
      ))}
      <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-start' }}>
        {KINDS.map((k) => (
          <button key={k.id} type="button" className="chip sm" onClick={() => setPlaces([...places, newPlace(k.id)])}>
            + {k.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn lg block"
        onClick={async () => {
          const clean = places.map((p) => ({ ...p, name: p.name.trim() || KINDS.find((k) => k.id === p.kind)!.label }));
          // Foods still point at v1 home ids, which are the same ids as places.
          await patchSettings({ places: clean, homes: clean.map((p) => ({ id: p.id, name: p.name })) });
          onClose();
        }}
      >
        Save
      </button>
    </Sheet>
  );
}

function YouEditor({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const [name, setName] = useState(settings.name);
  const [height, setHeight] = useState<number | undefined>(settings.heightCm);
  const [goal, setGoal] = useState(settings.goalDate ?? '');
  const [birthday, setBirthday] = useState(settings.birthday ? `2000-${settings.birthday}` : '');
  const [birthYear, setBirthYear] = useState<number | undefined>(settings.birthYear);
  return (
    <Sheet title="You" onClose={onClose}>
      <label className="flabel">
        <span className="lbl">Birth year, for the maintenance estimate</span>
        <IntField value={birthYear} onChange={setBirthYear} placeholder="e.g. 1995" />
      </label>
      <label className="flabel">
        <span className="lbl">Name, for the greeting</span>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flabel">
        <span className="lbl">Height, cm</span>
        <DecField value={height} onChange={setHeight} />
      </label>
      <label className="flabel">
        <span className="lbl">Goal date</span>
        <input className="field" type="date" value={goal} onChange={(e) => setGoal(e.target.value)} />
      </label>
      <label className="flabel">
        <span className="lbl">Birthday, optional. Only the day and month are kept</span>
        <input className="field" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
      </label>
      <button
        type="button"
        className="btn lg block"
        onClick={async () => {
          await patchSettings({ name: name.trim(), heightCm: height, goalDate: goal || undefined, birthday: birthday ? birthday.slice(5) : undefined, birthYear: birthYear && birthYear > 1900 ? birthYear : undefined });
          onClose();
        }}
      >
        Save
      </button>
    </Sheet>
  );
}

/** Username and API key, typed here and kept only on this phone. */
function LastfmFields({ settings }: { settings: Settings }) {
  const [user, setUser] = useState(settings.lastfm?.users[0] ?? '');
  const [key, setKey] = useState(settings.lastfm?.key ?? '');
  const save = () => patchSettings({ lastfm: user.trim() && key.trim() ? { key: key.trim(), users: [user.trim()] } : undefined });
  return (
    <div className="col gap8" style={{ padding: '12px 0' }}>
      <label className="flabel">
        <span className="lbl">Username</span>
        <input className="field" value={user} onChange={(e) => setUser(e.target.value)} onBlur={save} autoCapitalize="none" autoComplete="off" />
      </label>
      <label className="flabel">
        <span className="lbl">API key</span>
        <input className="field" value={key} onChange={(e) => setKey(e.target.value)} onBlur={save} autoCapitalize="none" autoComplete="off" spellCheck={false} />
      </label>
      <small className="t12 q lh">Sessions show what was playing. The key stays on this phone and is left out of audit exports.</small>
    </div>
  );
}

/** What is still missing, at the top of Settings, so every feature can work. */
function SetupCard({ settings }: { settings: Settings }) {
  const gaps = setupGaps(settings);
  if (!gaps.length) return null;
  return (
    <div className="notice" role="status">
      <span className="t15">
        Setup: {gaps.length} thing{gaps.length === 1 ? '' : 's'} missing
      </span>
      <span className="t13 q">{gaps.map((g) => g.label).join(', ')}</span>
    </div>
  );
}

/** A note left while using the app ("this looked wrong"), for the next review. */
function AuditNoteBox() {
  const toast = useToast();
  const [text, setText] = useState('');
  return (
    <div className="col gap8">
      <textarea className="field" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Something looked wrong or could be better? Leave a note for the review." spellCheck />
      <button
        type="button"
        className="btn ghost sm"
        disabled={!text.trim()}
        onClick={async () => {
          await db.auditNotes.add({ at: Date.now(), screen: 'settings', text: text.trim() });
          setText('');
          toast({ text: 'Noted for the next review' });
        }}
      >
        Save the note
      </button>
    </div>
  );
}
