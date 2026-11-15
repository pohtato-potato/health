import { useState, type CSSProperties } from 'react';
import { patchSettings } from '../../db/actions';
import { logMoment } from '../../db/moments';
import { TITLES } from '../../domain/rewards';
import { TITLE_DEFS, wornTitle, type TitleStats } from '../../domain/titles';
import type { Settings } from '../../domain/types';
import { Action, Panel } from '../../ui/kit/Kit';

const FAMILIES = [...new Set(TITLE_DEFS.map((t) => t.family))];
const ALONG = 'Along the way';
const GOLD = '#f2c46d';

interface Row { id: string; name: string; how: string; has: boolean }

const seenWith = (settings: Settings, id: string) => [...new Set([...(settings.titlesSeen ?? []), id])];
const wear = (settings: Settings, id: string, name: string) => {
  void patchSettings({ title: id, titlesSeen: seenWith(settings, id) });
  void logMoment('title', `Wore the title ${name}`);
};

/** A new title, offered once (board three): a gold panel with the page's one glowing action, Wear it. */
export function NewTitle({ settings, stats }: { settings: Settings; stats: TitleStats }) {
  const offer = TITLE_DEFS.filter((t) => t.rule(stats)).find((t) => !(settings.titlesSeen ?? []).includes(t.id));
  if (!offer) return null;
  return (
    <Panel ink={GOLD} className="k-in" key={offer.id}>
      <div className="k-row k-offer">
        <span className="k-col" style={{ flex: '1 1 160px' }}>
          <span className="k-q">A new title</span>
          <b className="k-title" style={{ color: GOLD }}>{offer.name}</b>
          <span className="k-q">{offer.how}</span>
        </span>
        <span className="k-col" style={{ gap: 4, alignItems: 'center' }}>
          <span className="k-gold"><Action sm onClick={() => wear(settings, offer.id, offer.name)}>Wear it</Action></span>
          <button type="button" className="k-more" style={{ alignSelf: 'center' }} onClick={() => void patchSettings({ titlesSeen: seenWith(settings, offer.id) })}>Not now</button>
        </span>
      </div>
    </Panel>
  );
}

/** Every title by family: earned ones in gold, tap one to wear it. */
export function TitlesWall({ settings, stats, unlocked, level }: { settings: Settings; stats: TitleStats; unlocked: Set<string>; level: number }) {
  const [fam, setFam] = useState<string>(FAMILIES[0]);
  const worn = wornTitle(settings, unlocked, level);
  const rows: Row[] = fam === ALONG
    ? TITLES.map((t) => ({ id: t.id, name: t.name, how: t.how, has: t.unlocked(unlocked, level) }))
    : TITLE_DEFS.filter((t) => t.family === fam).map((t) => ({ id: t.id, name: t.name, how: t.how, has: t.rule(stats) }));
  return (
    <>
      <NewTitle settings={settings} stats={stats} />
      <p className="k-line">{worn ? <>Wearing <b style={{ color: GOLD }}>{worn}</b>.</> : 'Wearing nothing yet.'} <span className="k-q">Tap one you have earned to wear it.</span></p>
      <div className="k-pills" role="group" aria-label="Families">
        {[...FAMILIES, ALONG].map((f) => <button key={f} type="button" className="k-pill sm" aria-pressed={f === fam} onClick={() => setFam(f)}>{f}</button>)}
      </div>
      <div className="k-col" style={{ gap: 8 }} key={fam}>
        {rows.map((t) => {
          const on = settings.title === t.id;
          return (
            <button key={t.id} type="button" disabled={!t.has} className={`k-panel k-title-row${t.has ? ' k-tap' : ' off'}${on ? ' worn' : ''}`} style={{ '--ink': t.has ? GOLD : '#ede6da' } as CSSProperties} onClick={() => wear(settings, t.id, t.name)} aria-pressed={on}>
              <b className="k-lb">{t.name}{on ? ' · wearing' : ''}</b>
              <span className="k-q">{t.how}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
