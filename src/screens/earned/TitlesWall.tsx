import { patchSettings } from '../../db/actions';
import { logMoment } from '../../db/moments';
import { TITLE_DEFS, type TitleStats } from '../../domain/titles';
import type { Settings } from '../../domain/types';
import { Action, Panel } from '../../ui/kit/Kit';
import { useToast, type ToastInput } from '../../ui/Toasts';

const GOLD = '#f2c46d';

const seenWith = (settings: Settings, id: string) => [...new Set([...(settings.titlesSeen ?? []), id])];
// Finding 34 (O42): wearing a title says so, in a gold toast, and keeps a moment on the shelf.
export const wear = (settings: Settings, id: string, name: string, toast: (t: ToastInput) => void) => {
  if (settings.title === id) return;
  void patchSettings({ title: id, titlesSeen: seenWith(settings, id) });
  void logMoment('title', `Wore the title ${name}`);
  toast({ kicker: 'Title', text: `Now wearing ${name}`, sub: 'It shows on You, under your name.', tone: 'gold' });
};

/** A new title, offered once (board three): a gold panel with the page's one glowing action, Wear it. */
export function NewTitle({ settings, stats }: { settings: Settings; stats: TitleStats }) {
  const toast = useToast();
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
          <span className="k-gold"><Action sm onClick={() => wear(settings, offer.id, offer.name, toast)}>Wear it</Action></span>
          <button type="button" className="k-more" style={{ alignSelf: 'center' }} onClick={() => void patchSettings({ titlesSeen: seenWith(settings, offer.id) })}>Not now</button>
        </span>
      </div>
    </Panel>
  );
}
