import { useEffect, useRef, useState, type ReactNode, createContext, useContext } from 'react';
import { scheduleDing, unlockAudio } from '../audio';
import { fmtDayMonth, fmtDuration, fmtInt, fmtLitres } from '../domain/format';
import { dayKey } from '../domain/dates';
import { loadOptions, fmtKg } from '../domain/loads';
import { upgradePlan, validatePlan, type PlanDef } from '../domain/plan';
import { DEFAULT_MEAL_TIMES, MEAL_NAMES, MEALS, prefOn, type ChecklistItem, type Place, type PlaceKind, type Settings, type Targets } from '../domain/types';
import { homePlace } from '../domain/places';
import { bump, patchSettings, setTargets } from '../db/actions';
import { saveBackup, summarise } from '../db/backup';
import { readBackupFile, restoreAll, saveFullBackup, type ParsedBackup } from '../db/fullBackup';
import { canUseFingerprint, registerFingerprint } from '../checkin/lock';
import { saveWorkbook } from '../export/saveWorkbook';
import { db, uid } from '../db/db';
import { useSettings, useToday } from '../db/hooks';
import { askPersist, usePwa } from '../pwa';
import { back, go, useRoute } from '../router';
import { DecField, IntField, LinkRow, Seg, SwitchRow, TimeTile } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';
import { targetsFor } from '../state/derived';
import { ThemeSheet, useUnlockedIds } from '../ui/Theme';
import { ReviewSheet } from './Review';
import { themeById } from '../domain/themes';
import { askConfirm } from '../ui/Confirm';
import { useBatteryLevel } from '../ui/RestScreen';
import { setupGaps } from '../domain/setupCheck';
import { saveAuditPack } from '../export/saveAuditPack';

type Editor = null | 'targets' | 'item' | 'homes' | 'you' | 'plates' | 'theme' | 'review';

export function SettingsScreen() {
  const battery = useBatteryLevel();
  const settings = useSettings();
  const today = useToday();
  const { params } = useRoute();
  const pwa = usePwa();
  const toast = useToast();
  const [editor, setEditor] = useState<Editor>(null);
  const [item, setItem] = useState<ChecklistItem | null>(null);
  const [pending, setPending] = useState<{ kind: 'backup'; parsed: ParsedBackup } | { kind: 'plan'; plan: PlanDef } | null>(null);
  const backupInput = useRef<HTMLInputElement>(null);
  const planInput = useRef<HTMLInputElement>(null);
  const unlocked = useUnlockedIds();

  const [open, setOpen] = useState<string | null>(params.get('at'));
  useEffect(() => {
    const at = params.get('at');
    if (at) {
      setOpen(at === 'data' ? 'export' : at === 'backup' ? 'backups' : at);
      requestAnimationFrame(() => document.getElementById(`s-${at === 'data' ? 'export' : at === 'backup' ? 'backups' : at}`)?.scrollIntoView({ block: 'start' }));
    }
  }, [params, settings === undefined]);

  if (!settings) return <div className="page bare" />;
  const t = targetsFor(settings, today);
  const p = settings.prefs;
  const setPref = (k: keyof Settings['prefs'], v: boolean) => patchSettings((s) => ({ prefs: { ...s.prefs, [k]: v } }));

  const pickBackup = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending({ kind: 'backup', parsed: await readBackupFile(f) });
    } catch (e) {
      toast({ text: (e as Error).message });
    }
  };
  const pickPlan = async (f: File | undefined) => {
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const plan = (data.format === 'health-plan' ? data : data.plan) as PlanDef;
      const errs = validatePlan(plan);
      if (errs.length) throw new Error(`This plan has problems: ${errs.slice(0, 2).join(' ')}`);
      setPending({ kind: 'plan', plan: upgradePlan(plan) });
    } catch (e) {
      toast({ text: e instanceof SyntaxError ? "That file isn't a plan: it couldn't be read." : (e as Error).message });
    }
  };

  const last = settings.backup.lastQuick;
  const plates = settings.equipment.plates;
  const meds = settings.checklist.filter((i) => i.active && i.med).length;
  const summary: Record<string, string> = {
    you: [settings.name, settings.heightCm ? `${settings.heightCm} cm` : '', settings.goalDate ? `reveal ${fmtDayMonth(settings.goalDate)}` : ''].filter(Boolean).join(' · '),
    targets: `${fmtInt(t.kcalMin)}–${fmtInt(t.kcalMax)} · ${t.proteinG} g · ${fmtInt(t.steps)}`,
    walking: `${settings.places?.length ?? 0} places · meal times`,
    checklist: `${settings.checklist.filter((i) => i.active).length} items${meds ? ` · ${meds} medicine${meds === 1 ? '' : 's'}` : ''}`,
    training: settings.plan ? `${settings.plan.name} · editor` : 'No plan yet',
    'food-categories': `${settings.foodCategories?.length ?? 0} categories`,
    backups: `${last ? `last ${fmtDayMonth(dayKey(new Date(last)))}` : 'never'} · nudge after ${settings.backup.nudgeDays} days`,
    export: `Audit pack · review day ${settings.reviewDay !== undefined ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][settings.reviewDay] : 'not set'}`,
    lastfm: settings.lastfm?.key ? `connected · ${settings.lastfm.users.length} user${settings.lastfm.users.length === 1 ? '' : 's'}` : 'not connected',
    storage: pwa.persisted ? 'protected' : 'not protected yet',
    feel: `battery saver ${p.batterySaver ? 'on' : 'automatic below 30%'}`,
    home: `ticker ${prefOn(p, 'ticker') ? 'on' : 'off'}`,
    privacy: `photos ${prefOn(p, 'blurPhotos') ? 'blurred' : 'shown'}${prefOn(p, 'lockPhotos') && settings.photoKey ? ' · locked' : ''}`,
  };

  return (
    <div className="page bare" style={{ gap: 10 }}>
      <button type="button" className="backlink" onClick={() => back('/you')}>
        <Icon name="left" size={20} stroke={1.8} />
        You
      </button>
      <h1 className="h1" style={{ fontSize: 32, marginBottom: 6 }}>
        Settings
      </h1>
      <SetupCard settings={settings} />

      <OpenGroup.Provider value={{ open, toggle: (id) => setOpen(open === id ? null : id), summary }}>
      <h2 className="settings-part">Your plan</h2>

      <Group id="you" title="You">
        <LinkRow title="Name" value={settings.name || 'Not set'} onClick={() => setEditor('you')} />
        <LinkRow title="Height" value={settings.heightCm ? `${settings.heightCm} cm` : 'Not set'} onClick={() => setEditor('you')} />
        <LinkRow title="Goal date" value={settings.goalDate ? fmtDayMonth(settings.goalDate) + ` ${settings.goalDate.slice(0, 4)}` : 'Not set'} onClick={() => setEditor('you')} />
        <LinkRow title="Birthday" sub="For a theme on the day" value={settings.birthday ? fmtDayMonth(`2000-${settings.birthday}`) : 'Not set'} onClick={() => setEditor('you')} />
        <div className="li">
          <span>Units</span>
          <span className="v">kg and inches</span>
        </div>
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

      <Group id="walking" title="Places">
        <div className="li" style={{ minHeight: 64 }}>
          <span className="s">
            <span>Your loop at home</span>
            <small>Steps for one lap, used for laps stats</small>
          </span>
          <div style={{ width: 92 }}>
            <IntField value={settings.loopSteps} onChange={(v) => patchSettings({ loopSteps: v })} placeholder="steps" className="field sm" />
          </div>
        </div>
        <SwitchRow title="Confirm yesterday's steps each morning" sub="Samsung Health has the final count by then" checked={p.confirmSteps} onChange={(v) => setPref('confirmSteps', v)} />
        <LinkRow title="Places" sub="Each brings its meal times, step goal and the foods shown first" value={(settings.places?.length ? settings.places : settings.homes).map((h) => h.name).join(', ')} onClick={() => setEditor('homes')} />
      </Group>

      <Group id="checklist" title="Checklist and medicines">
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

      <Group id="training" title="Training plan">
        <SwitchRow
          title="Battery saver for sessions"
          sub={battery !== undefined ? `On by itself below 30%. The phone reports ${Math.round(battery * 100)}% now.` : "This browser doesn't report the battery, so switch it on by hand."}
          checked={!!settings.prefs.batterySaver}
          onChange={(v) => setPref('batterySaver', v)}
        />
        <LinkRow
          title="Plan"
          sub={settings.plan ? `${settings.plan.sessions.length} sessions · ${settings.plan.flags.length} joint checks` : 'None yet'}
          value={settings.plan ? `${settings.plan.name}, from ${fmtDayMonth(settings.plan.from)}` : 'Import'}
          onClick={() => (settings.plan ? go('/plan') : planInput.current?.click())}
        />
        {settings.plan && (
          <button type="button" className="li q" onClick={() => planInput.current?.click()}>
            Import a plan from a file
          </button>
        )}
        <input ref={planInput} type="file" accept="application/json,.json" hidden onChange={(e) => (pickPlan(e.target.files?.[0]), (e.target.value = ''))} />
        {plates.map((pl) => (
          <SwitchRow
            key={pl.kg}
            title={`${fmtKg(pl.kg)} kg plates × ${pl.count}`}
            sub={pl.owned ? undefined : 'Switch on when they arrive. Suggested loads then use them.'}
            checked={pl.owned}
            onChange={(v) => {
              void patchSettings((s) => ({ equipment: { ...s.equipment, plates: s.equipment.plates.map((x) => (x.kg === pl.kg ? { ...x, owned: v } : x)) } }));
              if (v) void bump('plates-on');
            }}
          />
        ))}
        <LinkRow
          title="Plates and dumbbells"
          sub={
            plates.length
              ? `Pairs: ${loadOptions(settings.equipment, 'pair').map(fmtKg).join(', ')} kg · one dumbbell: ${loadOptions(settings.equipment, 'single').map(fmtKg).join(', ')} kg`
              : 'Tell Health what you have, and it suggests loads you can actually make.'
          }
          onClick={() => setEditor('plates')}
        />
        <SwitchRow title="Resistance band" checked={settings.equipment.band} onChange={(v) => patchSettings((s) => ({ equipment: { ...s.equipment, band: v } }))} />
        <SwitchRow title="Soft ding when rest ends" sub="Plays in your headphones over your music" checked={p.ding} onChange={(v) => setPref('ding', v)} />
        <button
          type="button"
          className="li"
          onClick={() => {
            unlockAudio();
            scheduleDing(0.05);
          }}
        >
          <span className="s">
            <span>Test the ding</span>
            <small>Play music first, then tap: it should sound over it</small>
          </span>
          <Icon name="play" size={18} stroke={1.8} color="var(--quiet)" />
        </button>
        <SwitchRow title="Keep the screen on during sessions" sub="So the timer and ding stay on time" checked={p.wakeLock} onChange={(v) => setPref('wakeLock', v)} />
        <SwitchRow title="Buzz on records" checked={p.buzz} onChange={(v) => setPref('buzz', v)} />
        <SwitchRow title="Tempo coach" sub="A Coach button on slow-lowering sets: the phone buzzes 3 seconds down, 1 up" checked={prefOn(p, 'tempoCoach')} onChange={(v) => setPref('tempoCoach', v)} />
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

      <h2 className="settings-part">Your data</h2>

      <Group id="backups" title="Backup" plain>
        <div className="col gap12" style={{ padding: '18px 18px 6px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 20 }}>
          <div className="row" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0, background: last && Date.now() - last < 3 * 86_400_000 ? 'var(--sage)' : 'var(--gold)' }} />
            <div className="col gap2">
              <div className="t15">{last ? `Last backup: ${fmtDayMonth(dayKey(new Date(last)))}` : 'No backup yet'}</div>
              <div className="t12 q">Everything you've logged, in one small file.</div>
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              const r = await saveBackup();
              if (r !== 'cancelled') toast({ kicker: 'Backup', text: r === 'shared' ? 'Handed over. Pick Drive to keep it safe.' : 'Saved to Downloads.', tone: 'sage' });
            }}
          >
            Back up now
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={async () => {
              const r = await saveFullBackup();
              if (r !== 'cancelled') toast({ kicker: 'Full backup', text: r === 'shared' ? 'Handed over. Pick Drive to keep it safe.' : 'Saved to Downloads.', tone: 'sage' });
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
          <LinkRow title="Restore from a backup" onClick={() => backupInput.current?.click()} />
          <input ref={backupInput} type="file" accept="application/json,.json,application/zip,.zip" hidden onChange={(e) => (pickBackup(e.target.files?.[0]), (e.target.value = ''))} />
        </div>
      </Group>

      <Group id="export" title="Audit pack and Claude review" plain>
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
      </Group>

      <Group id="lastfm" title="Last.fm">
        <LastfmFields settings={settings} />
      </Group>

      <Group id="storage" title="Storage">
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
      </Group>

      <h2 className="settings-part">The feel</h2>

      <Group id="feel" title="Battery saver and feel">
        <LinkRow title="Voice" value={settings.voice === 'comm' ? 'Commentator' : settings.voice.charAt(0).toUpperCase() + settings.voice.slice(1)} onClick={() => back('/you')} />
        <SwitchRow title="News ticker on Today" checked={prefOn(p, 'ticker')} onChange={(v) => setPref('ticker', v)} />
        <SwitchRow title="Shake for a stat" sub="Shake the phone anywhere in the app" checked={prefOn(p, 'shake')} onChange={(v) => setPref('shake', v)} />
        <LinkRow title="Theme" value={themeById(settings.theme)?.name ?? 'Dusk'} onClick={() => setEditor('theme')} />
        <SwitchRow title="Seasonal themes" sub="Diwali, Holi and your birthday take over for the day" checked={prefOn(p, 'seasonal')} onChange={(v) => setPref('seasonal', v)} />
      </Group>

      <Group id="home" title="Home screen and ticker">
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

      </OpenGroup.Provider>

      <div className="t12 d center" style={{ paddingTop: 18 }}>
        Health {__APP_VERSION__} · everything stays on this phone
      </div>

      {editor === 'targets' && <TargetsEditor targets={t} onClose={() => setEditor(null)} />}
      {editor === 'item' && <ItemEditor item={item} onClose={() => setEditor(null)} />}
      {editor === 'homes' && <HomesEditor settings={settings} onClose={() => setEditor(null)} />}
      {editor === 'you' && <YouEditor settings={settings} onClose={() => setEditor(null)} />}
      {editor === 'plates' && <PlatesEditor settings={settings} onClose={() => setEditor(null)} />}
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
            onClick={async () => {
              await restoreAll(pending.parsed);
              setPending(null);
              toast({ kicker: 'Restored', text: summarise(pending.parsed.file), tone: 'sage' });
            }}
          >
            Replace and restore
          </button>
        </Sheet>
      )}
      {pending?.kind === 'plan' && (
        <Sheet title={`Use “${pending.plan.name}”?`} onClose={() => setPending(null)}>
          <div className="t15 lh">
            {pending.plan.sessions.map((s) => `${s.name}: ${s.exercises.length} exercises`).join(' · ')}. {pending.plan.flags.length} joint checks, {pending.plan.triggers?.length ?? 0} triggers.
          </div>
          <div className="t14 q lh">Your logged sessions stay. Exercises with the same id keep their history, so loads carry over.</div>
          <button
            type="button"
            className="btn lg block"
            onClick={async () => {
              await patchSettings({ plan: pending.plan });
              await bump('plan-import');
              setPending(null);
              toast({ text: `${pending.plan.name} is your plan now` });
            }}
          >
            Use this plan
          </button>
        </Sheet>
      )}
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
          {summary[id] && <span className="t12 q">{summary[id]}</span>}
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

function PlatesEditor({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const [plates, setPlates] = useState(settings.equipment.plates.map((p) => ({ ...p })));
  const [fixed, setFixed] = useState(settings.equipment.fixed.join(', '));
  const eq = { ...settings.equipment, plates, fixed: parseList(fixed) };
  return (
    <Sheet title="Plates and dumbbells" sub="Loads are per dumbbell. Plates go on in matching pairs." onClose={onClose} tall>
      {plates.map((p, i) => (
        <div key={i} className="grid3" style={{ alignItems: 'end' }}>
          <label className="flabel">
            <span className="lbl">Plate kg</span>
            <DecField value={p.kg} onChange={(v) => setPlates(plates.map((x, j) => (j === i ? { ...x, kg: v ?? 0 } : x)))} />
          </label>
          <label className="flabel">
            <span className="lbl">How many</span>
            <IntField value={p.count} onChange={(v) => setPlates(plates.map((x, j) => (j === i ? { ...x, count: v ?? 0 } : x)))} />
          </label>
          <label className="row" style={{ height: 48, gap: 8 }}>
            <span className="t14">Have them</span>
            <input type="checkbox" className="sw" checked={p.owned} onChange={(e) => setPlates(plates.map((x, j) => (j === i ? { ...x, owned: e.target.checked } : x)))} />
          </label>
        </div>
      ))}
      <button type="button" className="link" onClick={() => setPlates([...plates, { kg: 2.5, count: 4, owned: true }])}>
        + Add a plate size
      </button>
      <label className="flabel">
        <span className="lbl">Fixed dumbbells, kg each</span>
        <input className="field" value={fixed} onChange={(e) => setFixed(e.target.value)} placeholder="e.g. 1, 2.5, 5" />
      </label>
      <div className="t13 q lh">
        Pairs you can make: {loadOptions(eq, 'pair').map(fmtKg).join(', ') || 'none'} kg. One dumbbell: {loadOptions(eq, 'single').map(fmtKg).join(', ') || 'none'} kg.
      </div>
      <button
        type="button"
        className="btn lg block"
        onClick={async () => {
          await patchSettings((s) => ({ equipment: { ...s.equipment, plates: plates.filter((p) => p.kg > 0 && p.count > 0), fixed: parseList(fixed) } }));
          onClose();
        }}
      >
        Save
      </button>
    </Sheet>
  );
}

function parseList(s: string): number[] {
  return s
    .split(/[,\s]+/)
    .map((x) => parseFloat(x))
    .filter((x) => Number.isFinite(x) && x > 0);
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
