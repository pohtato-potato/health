import { useState } from 'react';
import { saveBackup } from '../../db/backup';
import type { DueItem } from '../../domain/dueLines';
import { lastFullWeek } from '../../domain/weekly';
import { go } from '../../router';
import { Action, Panel } from '../../ui/kit/Kit';

export const STORY_SEEN_KEY = 'you-story-seen';

export function readStorySeen(): string | undefined {
  try {
    return localStorage.getItem(STORY_SEEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Each due thing in its own ink: the story lavender like Reports, the year and backups gold, slips coral. */
const INK: Record<string, string> = { story: '#c2b2ff', year: '#f2c46d', backup: '#f2c46d', checkup: '#ff9a76', checkin: '#f4aedb' };

/**
 * What is due (look pass): the first is the page's one glowing action, inside its filled panel; any others are
 * quiet tappable panels under it.
 */
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
  const [first, ...rest] = items;
  return (
    <div className="k-col" style={{ gap: 8 }}>
      {first && (
        <Panel ink={INK[first.id] ?? '#ede6da'} className="k-due">
          <span className="k-row">
            <b>{first.text}</b>
            <Action sm onClick={() => void act(first)}>{first.action}</Action>
          </span>
        </Panel>
      )}
      {rest.map((d) => (
        <Panel key={d.id} ink={INK[d.id] ?? '#ede6da'} onClick={() => void act(d)} label={`${d.text}: ${d.action}`}>
          <b>{d.text}</b>
          <span className="k-lb">{d.action}</span>
        </Panel>
      ))}
      {failed && <span className="k-q" role="alert">That backup didn't save. Nothing has changed; try again, or use Settings.</span>}
    </div>
  );
}
