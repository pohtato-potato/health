import { useState } from 'react';
import { saveBackup } from '../../db/backup';
import type { DueItem } from '../../domain/dueLines';
import { lastFullWeek } from '../../domain/weekly';
import { go } from '../../router';

export const STORY_SEEN_KEY = 'you-story-seen';

export function readStorySeen(): string | undefined {
  try {
    return localStorage.getItem(STORY_SEEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function DueLines({ items, today }: { items: DueItem[]; today: string }) {
  const [failed, setFailed] = useState(false);
  if (!items.length && !failed) return null;
  const act = async (d: DueItem) => {
    if (d.id === 'backup') {
      setFailed(false);
      try {
        await saveBackup();
      } catch {
        setFailed(true);
      }
      return;
    }
    if (d.id === 'story') {
      try {
        localStorage.setItem(STORY_SEEN_KEY, lastFullWeek(today));
      } catch {
        // Then it stays on the list. Nothing is lost.
      }
    }
    go(d.path);
  };
  return (
    <div className="yu-due">
      {items.map((d) => <button key={d.id} type="button" onClick={() => void act(d)}><span>{d.text}</span><u>{d.action}</u></button>)}
      {failed && <span className="yu-q" role="alert">That backup didn't save. Nothing has changed; try again, or use Settings.</span>}
    </div>
  );
}
