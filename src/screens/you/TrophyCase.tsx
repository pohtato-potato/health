import type { CSSProperties } from 'react';
import type { Trophy } from '../../domain/trophies';
import { Reveal } from '../../ui/you/Reveal';

export function TrophyCase({ trophies }: { trophies: Trophy[] }) {
  if (!trophies.length) return null;
  return (
    <section className="yu-sec">
      <h2>Trophy case</h2>
      <Reveal className="yu-trophy">
        {trophies.map((t, i) => <div key={t.id} style={{ '--i': i } as CSSProperties}><b>{t.value}</b><span>{t.label}</span></div>)}
      </Reveal>
    </section>
  );
}
