import type { CSSProperties } from 'react';
import { go } from '../../router';
import { Reveal } from '../../ui/you/Reveal';
import { DOORS } from './doorList';

export function Doors({ subs }: { subs: Record<(typeof DOORS)[number]['label'], string> }) {
  return (
    <Reveal className="yu-doors">
      {DOORS.map((d, i) => (
        <button key={d.label} type="button" onClick={() => go(d.path)} style={{ '--c': d.hue, '--i': i } as CSSProperties}>
          <b>{d.label}</b><span>{subs[d.label]}</span>
        </button>
      ))}
    </Reveal>
  );
}
