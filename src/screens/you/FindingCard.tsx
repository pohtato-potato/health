import { useState } from 'react';
import type { Finding } from '../../domain/dailyFinding';
import { Panel } from '../../ui/kit/Kit';
import { Icon } from '../../ui/Icon';

/** One finding today (look pass): a filled blue panel, the working one tap away. */
export function FindingCard({ finding }: { finding: Finding | undefined }) {
  const [open, setOpen] = useState(false);
  if (!finding) return null;
  return (
    <Panel ink="#93c3dc">
      <span className="k-lb">One finding today</span>
      <span>{finding.text}</span>
      {open && <span className="k-q">{finding.working}</span>}
      <button type="button" className="k-more" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{open ? 'Hide the working' : 'Why did this change?'}</span>
        <Icon name={open ? 'up' : 'down'} size={16} stroke={2.2} />
      </button>
    </Panel>
  );
}
