import { useState } from 'react';
import { addDays, dayKey, daysBetween, type DayKey } from '../domain/dates';
import { fmtDayMonth } from '../domain/format';
import { monthName } from '../domain/period';
import type { Settings } from '../domain/types';
import { bump, patchSettings } from '../db/actions';
import { saveWorkbook } from '../export/saveWorkbook';
import { useSettings, useToday } from '../db/hooks';
import { Sheet } from '../ui/Sheet';
import { useToast } from '../ui/Toasts';

/** The prompt that goes with the workbook. Generic on purpose: the numbers live in the file. */
export function reviewPrompt(settings: Settings, today: DayKey): string {
  const month = addDays(`${today.slice(0, 7)}-01`, -1).slice(0, 7);
  return [
    `This is my Health app export (an .xlsx workbook: read the README sheet first). Please give me a review of ${monthName(month)} ${month.slice(0, 4)}:`,
    '1. What went well, with the numbers to show it.',
    '2. What slipped, plainly and without judgement.',
    `3. Weight trend, waist and maintenance calories: am I on track${settings.goalDate ? ` for ${fmtDayMonth(settings.goalDate)} ${settings.goalDate.slice(0, 4)}` : ''}?`,
    '4. Training: which lifts are climbing, which have stalled, and what my joint flags suggest.',
    '5. One or two specific, practical changes for next month.',
    'Never suggest eating below my calorie floor.',
  ].join('\n');
}

/** Due once a month, after three weeks of use. */
export function reviewDue(settings: Settings, today: DayKey): boolean {
  const since = settings.lastReview ? daysBetween(dayKey(new Date(settings.lastReview)), today) : Infinity;
  const age = (Date.now() - settings.createdAt) / 86_400_000;
  return age >= 21 && since >= 28;
}

export function ReviewSheet({ onClose }: { onClose: () => void }) {
  const settings = useSettings();
  const today = useToday();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!settings) return null;
  const prompt = reviewPrompt(settings, today);

  const start = async () => {
    setBusy(true);
    let copied = false;
    try {
      await navigator.clipboard.writeText(prompt);
      copied = true;
    } catch {
      /* the prompt is on screen to copy by hand */
    }
    try {
      const r = await saveWorkbook();
      if (r !== 'cancelled') {
        await patchSettings({ lastReview: Date.now() });
        void bump('review');
        toast({ kicker: 'Monthly review', text: copied ? 'Prompt copied, workbook handed over.' : 'Workbook handed over. Copy the prompt from the screen.', sub: 'In Claude: attach the workbook and paste the prompt.', tone: 'sage' });
        onClose();
      }
    } catch (e) {
      toast({ text: `Couldn't build the workbook: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Monthly review" sub="With Claude" onClose={onClose} tall>
      <div className="t14 q lh">One tap copies this prompt and hands over the workbook. In Claude, attach the file and paste the prompt. Nothing is sent anywhere until you do.</div>
      <pre className="card t13" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--mono)', lineHeight: 1.5, margin: 0, userSelect: 'text' }}>
        {prompt}
      </pre>
      <button type="button" className="btn lg block" disabled={busy} onClick={start}>
        Copy prompt and share workbook
      </button>
      {settings.lastReview && <div className="t12 q center">Last review: {fmtDayMonth(dayKey(new Date(settings.lastReview)))}</div>}
    </Sheet>
  );
}
