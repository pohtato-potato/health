// Matchday depth (spec 2026-11-12 §2.1, §4): last night's league match, waiting. Watch or Skip, and no score until
// one of them. Fork B's morning parcel shows its own result tile and calls the same two actions.
import { useState } from 'react';
import { clubCrest, crestSvg } from '../../../football/art/crest';
import { clubById } from '../../../football/data/load';
import { finishWithAssistant } from '../../../football/store/play';
import type { FbSave } from '../../../football/store/tables';
import { go } from '../../../router';
import { Art } from '../Tonight';
import { Action, Panel } from '../../../ui/kit/Kit';

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
    <Panel ink="#ff7a1a" className="md-wait">
      <b className="k-lb">Last night’s match is waiting</b>
      <div className="md-wduel">{l[1]}<b>{l[0]}</b><span className="k-q">v</span><b>{r[0]}</b>{r[1]}</div>
      <span className="k-q">Watch it with your calls, or skip to the result. Left alone, your assistant finishes it at 4 am.</span>
      <div className="lt-two">
        <Action quiet sm onClick={watchWaiting} disabled={busy}>Watch</Action>
        <Action quiet sm onClick={() => void skip()} disabled={busy}>Skip</Action>
      </div>
    </Panel>
  );
}
