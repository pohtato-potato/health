// Matchday depth (spec 2026-11-12 §2.1, §4): last night's league match, waiting. Watch or Skip, and no score until
// one of them. Fork B's morning parcel shows its own result tile and calls the same two actions.
import { useState } from 'react';
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { finishWithAssistant } from '../../../football/store/play';
import type { FbSave } from '../../../football/store/tables';
import { go } from '../../../router';
import { Art } from '../Tonight';

/** Opens the waiting match to watch live (before kick-off first). */
export const watchWaiting = () => go('/football/match', { live: '1' });

export function WaitingMatch({ save }: { save: FbSave }) {
  const [busy, setBusy] = useState(false);
  const p = save.paused;
  if (!p) return null;
  const opp = clubById(p.prep.oppId);
  const own = <Art svg={crestSvg(save.crest.step, save.crest.opt, 40)} />, them = <Art svg={clubCrest(opp, 40)} />;
  const [l, r] = p.prep.braboHome ? [['Brabo', own], [opp.short || opp.name, them]] as const : [[opp.short || opp.name, them], ['Brabo', own]] as const;
  const skip = async () => {
    setBusy(true);
    const m = await finishWithAssistant();
    if (m) go('/football/match', { id: m.id, ft: '1' });
    else setBusy(false);
  };
  return (
    <article className="fb-card hot md-wait" aria-label="Last night's match is waiting">
      <span className="fb-lb">Last night</span>
      <div className="md-wduel">{l[1]}<b>{l[0]}</b><span className="fb-s">v</span><b>{r[0]}</b>{r[1]}</div>
      <p className="fb-s fb-ctr">Watch it with your calls, or skip to the result. Left alone, your assistant finishes it at 4 am.</p>
      <div className="fb-btns">
        <button type="button" className="fb-btn pri" onClick={watchWaiting} disabled={busy}>Watch</button>
        <button type="button" className="fb-btn" onClick={() => void skip()} disabled={busy}>Skip</button>
      </div>
    </article>
  );
}
