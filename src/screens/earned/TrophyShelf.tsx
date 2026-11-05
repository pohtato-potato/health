import { useState, type CSSProperties } from 'react';
import { patchSettings } from '../../db/actions';
import { pickedTrophies, type Trophy } from '../../domain/trophies';
import { Reveal } from '../../ui/you/Reveal';

const MAX = 6;

export function TrophyShelf({ all, picks }: { all: Trophy[]; picks: string[] | undefined }) {
  const [choosing, setChoosing] = useState(false);
  if (!all.length) return null;
  const shown = pickedTrophies(all, picks, MAX);
  const toggle = (id: string) => {
    const now = shown.map((t) => t.id);
    const next = now.includes(id) ? now.filter((x) => x !== id) : [...now, id].slice(-MAX);
    void patchSettings({ trophyPicks: next });
  };
  return (
    <section className="yu-sec">
      <h2>Trophy case</h2>
      <Reveal className="yu-trophy">
        {shown.map((t, i) => <div key={t.id} style={{ '--i': i } as CSSProperties}><b>{t.value}</b><span>{t.label}</span></div>)}
      </Reveal>
      <button type="button" className="yu-link" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>{choosing ? 'Done choosing' : picks?.length ? 'Change what sits here' : 'Choose what sits here'}</button>
      {choosing && (
        <div className="yu-pick">
          {all.map((t) => {
            const on = shown.some((x) => x.id === t.id);
            return <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)}><span>{t.label}</span><b>{on ? 'In the case' : 'Add'}</b></button>;
          })}
        </div>
      )}
    </section>
  );
}
