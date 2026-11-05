import { useState } from 'react';
import type { Finding } from '../../domain/dailyFinding';
import { Reveal } from '../../ui/you/Reveal';

export function FindingCard({ finding }: { finding: Finding | undefined }) {
  const [open, setOpen] = useState(false);
  if (!finding) return null;
  return (
    <Reveal className="yu-card yu-find">
      <b>One finding today</b>
      <span>{finding.text}</span>
      {open && <span className="yu-q yu-card-in">{finding.working}</span>}
      <button type="button" className="yu-why" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide the working' : 'Why did this change?'}</button>
    </Reveal>
  );
}
