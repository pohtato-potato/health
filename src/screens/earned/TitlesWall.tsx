import { useState, type CSSProperties } from 'react';
import { patchSettings } from '../../db/actions';
import { logMoment } from '../../db/moments';
import { TITLES } from '../../domain/rewards';
import { TITLE_DEFS, wornTitle, type TitleStats } from '../../domain/titles';
import type { Settings } from '../../domain/types';
import { GOLD } from '../../ui/you/palette';

const FAMILIES = [...new Set(TITLE_DEFS.map((t) => t.family))];
const ALONG = 'Along the way';

interface Row { id: string; name: string; how: string; has: boolean }

export function TitlesWall({ settings, stats, unlocked, level }: { settings: Settings; stats: TitleStats; unlocked: Set<string>; level: number }) {
  const [fam, setFam] = useState<string>(FAMILIES[0]);
  const worn = wornTitle(settings, unlocked, level);
  const fresh = TITLE_DEFS.filter((t) => t.rule(stats));
  const offer = fresh.find((t) => !(settings.titlesSeen ?? []).includes(t.id));
  const rows: Row[] = fam === ALONG
    ? TITLES.map((t) => ({ id: t.id, name: t.name, how: t.how, has: t.unlocked(unlocked, level) }))
    : TITLE_DEFS.filter((t) => t.family === fam).map((t) => ({ id: t.id, name: t.name, how: t.how, has: t.rule(stats) }));
  const seen = (id: string) => [...new Set([...(settings.titlesSeen ?? []), id])];
  const wear = (id: string, name: string) => {
    void patchSettings({ title: id, titlesSeen: seen(id) });
    void logMoment('title', `Wore the title ${name}`);
  };
  return (
    <section className="yu-sec">
      <h2>Titles</h2>
      {offer && (
        <div className="yu-offer yu-card-in" key={offer.id}>
          <span className="yu-q">A new title. You choose.</span>
          <b>{offer.name}</b>
          <span className="yu-q">{offer.how}</span>
          <div className="yu-offer-do">
            <button type="button" onClick={() => wear(offer.id, offer.name)}>Wear it</button>
            <button type="button" onClick={() => void patchSettings({ titlesSeen: seen(offer.id) })}>Not now</button>
          </div>
        </div>
      )}
      <span className="yu-q">{worn ? <>Wearing: <b style={{ color: GOLD }}>{worn}</b>.</> : 'Wearing nothing yet.'} Tap one you have earned to wear it.</span>
      <div className="yu-views yu-fams">
        {[...FAMILIES, ALONG].map((f) => <button key={f} type="button" className={f === fam ? 'on' : undefined} aria-pressed={f === fam} onClick={() => setFam(f)}>{f}</button>)}
      </div>
      <div className="yu-titles" key={fam}>
        {rows.map((t, i) => (
          <button key={t.id} type="button" disabled={!t.has} className={settings.title === t.id ? 'worn' : t.has ? 'has' : undefined} onClick={() => wear(t.id, t.name)} style={{ '--i': i } as CSSProperties}>
            <b>{t.name}</b><span>{t.how}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
