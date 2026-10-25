import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { addDays, dayKey, weekStart } from '../domain/dates';
import { fmt1, fmtDayMonth, fmtDuration, fmtInt } from '../domain/format';
import { fmtKg } from '../domain/loads';
import { changeLine, headline, lastFullWeek, receiptLines, suggestOneThing, weekNumber, weekStats, type ReceiptLine, type WeekStats } from '../domain/weekly';
import { weekday } from '../domain/dates';
import { saveBackup, shareFile } from '../db/backup';
import { db } from '../db/db';
import { useAllDays, useAllEntries, useAllSets, useFoods, useSessions, useSettings, useToday } from '../db/hooks';
import { back, go, useRoute } from '../router';
import { Icon } from '../ui/Icon';
import { useToast } from '../ui/Toasts';
import { targetsFor, weeksFor } from '../state/derived';
import { usualWake } from '../domain/wake';
import { basisLabel } from '../domain/logged';
import { stepsByDay } from '../walk/runs';
import { weekWalk } from '../walk/week';
import { WeekRoadCard } from './walk/WeekRoadCard';

function useWeekData() {
  const { params } = useRoute();
  const today = useToday();
  const settings = useSettings();
  const days = useAllDays();
  const entries = useAllEntries();
  const sessions = useSessions();
  const sets = useAllSets();
  const foods = useFoods();
  const from = params.get('w') ?? lastFullWeek(today);
  if (!settings || !days || !entries || !sessions || !sets || !foods) return undefined;
  const w = weekStats(settings, from, days, entries, sessions, sets);
  const prev = weekStats(settings, addDays(from, -7), days, entries, sessions, sets);
  const first = [...days].sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
  const all: WeekStats[] = [];
  if (first) for (let k = weekStart(first); k <= from; k = addDays(k, 7)) all.push(k === from ? w : weekStats(settings, k, days, entries, sessions, sets));
  return { today, settings, days, foods, w, prev: prev.days ? prev : undefined, all, from, sessions };
}

export function WeekRecap() {
  const data = useWeekData();
  const toast = useToast();
  const nextWeek = data ? addDays(data.from, 7) : '';
  const thisNote = useLiveQuery(() => (data ? db.weeks.get(data.from) : undefined), [data?.from]);
  const nextNote = useLiveQuery(() => (nextWeek ? db.weeks.get(nextWeek) : undefined), [nextWeek]);
  const [oneThing, setOneThing] = useState<string | null>(null);
  const runs = useLiveQuery(() => db.routes.toArray(), []);

  useEffect(() => {
    if (!data) return;
    void db.weeks.get(data.from).then((n) => db.weeks.put({ ...(n ?? { id: data.from }), recapSeenAt: Date.now() }));
  }, [data?.from]);

  if (!data) return <div className="page bare" />;
  const { w, prev, settings, all, foods } = data;
  const perWeek = targetsFor(settings, w.to).sessionsPerWeek;
  const weeks = weeksFor(settings, data.sessions, w.to);
  const suggestion = suggestOneThing(w, settings, foods, usualWake(data.days, w.to));
  const text = oneThing ?? nextNote?.oneThing ?? suggestion;
  const isSunday = weekday(data.today) === 6;
  const trendDiff = w.trendStart !== undefined && w.trendEnd !== undefined ? w.trendEnd - w.trendStart : undefined;

  const cells: [string, string, string, string][] = [
    ['Steps', fmtInt(w.stepsAvg), `a day · ${changeLine(w.stepsAvg, prev?.stepsAvg, '%')}`, 'var(--sage)'],
    ['Sleep', w.sleepAvg !== undefined ? fmtDuration(w.sleepAvg) : '—', changeLine(w.sleepAvg, prev?.sleepAvg, ' min', (n) => String(Math.round(n))), 'var(--blue)'],
    ['Calories', w.kcalAvg !== undefined ? fmtInt(w.kcalAvg) : 'Not logged', w.foodBasis === 'none' ? 'No food logged this week' : `${basisLabel(w.foodDays, w.foodBasis)} · ${w.inRange} in range`, 'var(--apricot)'],
    ['Protein', w.proteinAvg !== undefined ? `${w.proteinAvg} g` : 'Not logged', changeLine(w.proteinAvg, prev?.proteinAvg, ' g'), 'var(--lavender)'],
    ['Training', `${w.sessions} of ${perWeek}`, w.sessions >= perWeek && weeks.streak > 1 ? `${weeks.streak} full weeks in a row` : w.sessions >= perWeek ? 'a full week' : `${perWeek - w.sessions} short`, 'var(--text)'],
    ['Weight', trendDiff !== undefined ? `${trendDiff <= 0 ? '−' : '+'}${fmt1(Math.abs(trendDiff))} kg` : '—', w.weightAvg !== undefined ? `trend · ${fmt1(w.weightAvg)} average` : 'no weigh-ins', 'var(--pearl)'],
  ];

  const saveOneThing = async (done?: boolean) => {
    await db.weeks.put({ ...(nextNote ?? { id: nextWeek }), oneThing: text });
    if (done === undefined) toast({ text: 'Saved for next week', sub: 'Next week’s recap asks how it went.' });
  };

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/journey')}>
        <Icon name="left" size={20} stroke={1.8} />
        Journey
      </button>
      <div className="col gap6">
        <div className="lbl">
          Your week · {fmtDayMonth(w.from)}–{fmtDayMonth(w.to)}
        </div>
        <h1 className="h1" style={{ fontSize: 32 }}>
          {headline(w, prev, all, perWeek)}
        </h1>
      </div>

      <div className="grid2">
        {cells.map(([name, value, sub, color]) => (
          <div key={name} className="card sm" style={{ gap: 4 }}>
            <div className="lbl sm" style={{ color }}>
              {name}
            </div>
            <div className="num" style={{ fontSize: 24 }}>
              {value}
            </div>
            <div className="t12 q">{sub}</div>
          </div>
        ))}
      </div>

      {runs && <WeekRoadCard w={weekWalk(w.from, stepsByDay(data.days), runs)} />}

      {w.records.length > 0 && (
        <div className="card gold">
          <div className="lbl gold">
            {w.records.length} new record{w.records.length === 1 ? '' : 's'}
          </div>
          <div className="t14 lh gold-text">
            {[...new Map(w.records.map((r) => [r.exerciseId, r])).values()]
              .map((r) => `${r.exercise} ${r.loadKg !== null ? `${fmtKg(r.loadKg)} kg × ` : ''}${r.reps ?? r.seconds}${r.seconds !== undefined ? ' s' : ''}`)
              .join(' · ')}
          </div>
        </div>
      )}

      {thisNote?.oneThing && (
        <div className="card">
          <div className="lbl">Last week's one thing</div>
          <div className="t15 lh">{thisNote.oneThing}</div>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-start' }}>
            <span className="t14 q grow">Did it happen?</span>
            {[true, false].map((v) => (
              <button key={String(v)} type="button" className={`chip sm${thisNote.done === v ? ' on' : ''}`} onClick={() => db.weeks.put({ ...thisNote, done: v })}>
                {v ? 'Yes' : 'Not really'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="lbl">One thing for next week</div>
        <textarea className="field" rows={2} value={text} onChange={(e) => setOneThing(e.target.value)} />
        <div className="row" style={{ gap: 10 }}>
          {text !== suggestion && (
            <button type="button" className="btn ghost sm" onClick={() => setOneThing(suggestion)}>
              Use the suggestion
            </button>
          )}
          <button type="button" className="btn sm grow" onClick={() => saveOneThing()}>
            {nextNote?.oneThing === text ? 'Saved' : 'Keep this'}
          </button>
        </div>
      </div>

      <button type="button" className="card" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => go('/receipt', { w: w.from })}>
        <span className="t15">See this week's receipt</span>
        <Icon name="right" size={16} stroke={1.8} color="var(--dim)" />
      </button>

      {isSunday && (
        <div className="banner">
          <Icon name="save" size={20} color="var(--gold)" />
          <span className="grow">Sunday: time to back up.</span>
          <button
            type="button"
            className="btn sm"
            onClick={async () => {
              const r = await saveBackup();
              if (r !== 'cancelled') toast({ kicker: 'Backup', text: 'Done. See you next Sunday.', tone: 'sage' });
            }}
          >
            Back up now
          </button>
        </div>
      )}
      <button type="button" className="btn lg block" onClick={() => back('/journey')}>
        Done
      </button>
    </div>
  );
}

export function ReceiptPage() {
  const data = useWeekData();
  const toast = useToast();
  if (!data) return <div className="page bare" />;
  const { w, settings, days } = data;
  const home = settings.homes.find((h) => h.id === days.filter((d) => d.date >= w.from && d.date <= w.to && d.home).pop()?.home);
  const printed = new Date(`${w.to}T23:58:00`);
  const lines = receiptLines(w, home?.name, weekNumber(w.from), printed);
  const id = `HLT-W${weekNumber(w.from)}-${w.to.slice(5).replace('-', '')}`;

  const saveImage = async () => {
    const blob = await receiptPng(lines, id);
    const r = await shareFile(new File([blob], `health-receipt-${w.from}.png`, { type: 'image/png' }));
    if (r !== 'cancelled') toast({ text: r === 'shared' ? 'Receipt handed over.' : 'Receipt saved to Downloads.' });
  };

  return (
    <div className="page bare">
      <button type="button" className="backlink" onClick={() => back('/week')}>
        <Icon name="left" size={20} stroke={1.8} />
        Weekly recap
      </button>
      <div className="receipt">
        {lines.map((l, i) =>
          l.kind === 'rule' ? (
            <div key={i} className="receipt-rule" />
          ) : l.right === undefined ? (
            <div key={i} className={`receipt-c${l.kind === 'head' ? ' head' : ''}`}>
              {l.left}
            </div>
          ) : (
            <div key={i} className={`receipt-l${l.kind === 'sub' ? ' sub' : ''}${l.kind === 'total' ? ' total' : ''}`}>
              <span>{l.left}</span>
              <span>{l.right}</span>
            </div>
          ),
        )}
        <Barcode seed={id} />
        <div className="receipt-c">{id}</div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button type="button" className="btn ghost grow" onClick={() => go('/receipt', { w: addDays(w.from, -7) })}>
          Week before
        </button>
        <button type="button" className="btn grow" onClick={saveImage}>
          Save as image
        </button>
      </div>
      <div className="t12 d center lh">Printed every Sunday at midnight. Scroll back through old ones with “Week before”.</div>
      {w.from < lastFullWeek(dayKey()) && (
        <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => go('/receipt', { w: addDays(w.from, 7) })}>
          Week after
        </button>
      )}
    </div>
  );
}

function bars(seed: string): number[] {
  let h = 7;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Array.from({ length: 44 }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 1 + (h % 3);
  });
}

function Barcode({ seed }: { seed: string }) {
  let x = 0;
  const bs = bars(seed);
  return (
    <svg width="100%" height="46" viewBox="0 0 200 46" preserveAspectRatio="none" aria-hidden="true" style={{ margin: '10px 0 4px' }}>
      {bs.map((w, i) => {
        const r = <rect key={i} x={x} y="0" width={w} height="46" fill={i % 2 ? 'transparent' : 'var(--paper-ink)'} />;
        x += w + 1.5;
        return r;
      })}
    </svg>
  );
}

/** Draws the receipt onto a canvas, for saving as a picture. */
async function receiptPng(lines: ReceiptLine[], id: string): Promise<Blob> {
  const W = 420;
  const lh = 22;
  const pad = 26;
  const H = pad * 2 + lines.length * lh + 90;
  const c = document.createElement('canvas');
  const k = 2;
  c.width = W * k;
  c.height = H * k;
  const g = c.getContext('2d')!;
  g.scale(k, k);
  g.fillStyle = '#EEE8DC';
  g.fillRect(0, 0, W, H);
  g.fillStyle = '#2A2620';
  g.strokeStyle = '#9C9385';
  let y = pad + 12;
  for (const l of lines) {
    g.font = `${l.kind === 'head' ? 500 : 400} ${l.kind === 'head' ? 18 : 13}px "DM Mono", ui-monospace, monospace`;
    if (l.kind === 'rule') {
      g.setLineDash([5, 4]);
      g.beginPath();
      g.moveTo(pad, y - 6);
      g.lineTo(W - pad, y - 6);
      g.stroke();
    } else if (l.right === undefined) {
      g.textAlign = 'center';
      g.fillText(l.left, W / 2, y);
    } else {
      g.textAlign = 'left';
      g.fillStyle = l.kind === 'sub' ? '#6B6358' : '#2A2620';
      g.fillText(l.left, l.kind === 'sub' ? pad + 14 : pad, y);
      g.textAlign = 'right';
      g.fillText(l.right, W - pad, y);
      g.fillStyle = '#2A2620';
    }
    y += lh;
  }
  let x = pad + 40;
  for (const [i, w] of bars(id).entries()) {
    if (i % 2 === 0) g.fillRect(x, y, w * 1.6, 44);
    x += (w + 1.5) * 1.6;
  }
  g.textAlign = 'center';
  g.font = '12px "DM Mono", ui-monospace, monospace';
  g.fillText(id, W / 2, y + 64);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}
