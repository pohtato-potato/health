// Kits: launch day, the kit wall by season, and the crest history.
import { useState } from 'react';
import { kitSvg } from '../../../football/art/kit';
import { crestSvg, type CrestOptKey, type CrestStep } from '../../../football/art/crest';
import { CREST_LINES, KIT_MAN_TECH, launchOptions, slotsOpen, SPONSOR_STYLES, type KitSlot } from '../../../football/kits';
import type { Club } from '../../../football/store/club';
import { kitFor, kitWall, type WallKit } from '../../../football/store/kitWall';
import { Art } from '../Tonight';
import { perkValue } from '../../../football/cast/bonds';
import { perksOfSave } from '../../../football/store/cast';
import { Hero, Panel, Sect } from '../../../ui/kit/Kit';
import { BLUE, GOLD, LAV, PanelTop } from './Bits';

const SLOT: Record<KitSlot, string> = { home: 'Home', away: 'Away', third: 'Third' };

export interface KitActions { pick?: (season: number, slot: KitSlot, id: string) => void; style?: (sp: 'A' | 'B' | 'C' | 'R') => void }

export function KitsView({ c, act = {} }: { c: Club; act?: KitActions }) {
  const s = c.save;
  const wall = kitWall(s, c.matches);
  // Launch day is between seasons; a season started with no kit picked (a club just placed in the new league, O40)
  // opens the kit maker for the season under way.
  const unpicked = s.phase === 'season' && !(s.kits ?? []).some((k) => k.season === s.season);
  const launch = s.phase === 'event' || unpicked;
  const next = unpicked ? s.season : s.season + 1;
  const kitMan = (s.treeUser?.researched ?? []).some((r) => r.id === KIT_MAN_TECH);
  const open = slotsOpen(c.stage ?? c.tier, kitMan);
  const sp = s.sponsorStyle ?? 'A';
  // Finding 9: a shirt wears the crest the club had that season (it was always the step-two crest).
  const crestAt = (season: number): [CrestStep, CrestOptKey] => {
    const h = [...(s.crestHistory ?? [])].reverse().find((x) => x.season <= season);
    return season >= s.season || !h || h.opt === 'keep' ? [s.crest.step, s.crest.opt] : [h.step, h.opt];
  };
  const sponsor = s.sponsors?.find((x) => x.slot === 'shirt')?.brand ?? (s.ownSponsor?.slot === 'shirt' ? s.ownSponsor.name : undefined);
  return (
    <div className="k-page">
      <div className="kb-lead">
        <Hero value={wall.length} ink={BLUE} label={wall.length === 1 ? 'kit on the wall' : 'kits on the wall'} />
        <span className="k-r k-q">season {s.season}</span>
      </div>
      {launch && (
        <Panel ink={GOLD}>
          <PanelTop name={unpicked ? `The kit maker · season ${next}` : `Launch day · season ${next}`} c={GOLD} />
          <span>The kit maker has designs for each slot. Pick one; the rest go back in the drawer.</span>
          {open.map((slot) => {
            const picked = s.kits?.find((k) => k.season === next && k.slot === slot)?.id;
            return (
              <fieldset key={slot} className="k-col" style={{ border: 0, padding: 0, margin: 0, gap: 6 }}>
                <legend className="k-q" style={{ padding: 0, marginBottom: 6 }}>{SLOT[slot]}</legend>
                <div className="kn-kits">
                  {launchOptions(slot, next, perkValue(perksOfSave(s), 'kit-pick')).map((id) => {
                    const k = kitFor(id, next, c.matches);
                    if (!k) return null;
                    return (
                      <button key={id} type="button" className="kn-kitopt kn-kit" aria-pressed={picked === id} onClick={() => act.pick?.(next, slot, id)}>
                        <Art svg={kitSvg({ ...k.kit, sp, crest: crestAt(next) }, 'front', 84, { sponsor })} />
                        <span>{k.name}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          {!open.includes('third') && <span className="k-q">The third kit opens with the kit man, in the tree, or at a bigger stage.</span>}
        </Panel>
      )}
      <Panel ink={LAV}>
        <PanelTop name="Sponsor on the shirt" c={LAV} />
        <div className="kb-chiprow">
          {SPONSOR_STYLES.map((x) => <button key={x.id} type="button" className="kb-chipbtn" style={{ ['--ink' as string]: LAV }} aria-pressed={sp === x.id} onClick={() => act.style?.(x.id)}>{x.name}</button>)}
        </div>
      </Panel>
      <KitWall wall={wall} sp={sp} crestAt={crestAt} />
      <CrestHistory c={c} />
    </div>
  );
}

function KitWall({ wall, sp, crestAt }: { wall: WallKit[]; sp: 'A' | 'B' | 'C' | 'R'; crestAt: (season: number) => [CrestStep, CrestOptKey] }) {
  const [open, setOpen] = useState<string | null>(null);
  const seasons = [...new Set(wall.map((k) => k.season))].sort((a, b) => b - a);
  return (
    <>
      <Sect>The kit wall</Sect>
      {seasons.map((season) => (
        <Panel key={season} ink={BLUE}>
          <PanelTop name={`Season ${season}`} c={BLUE} right="tap a kit" />
          <div className="kn-kits">
            {wall.filter((k) => k.season === season).map((k) => {
              const key = `${k.season}-${k.slot}`;
              return (
                <button key={key} type="button" className="kn-kitopt kn-kit" aria-pressed={open === key} aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                  <Art svg={kitSvg({ ...k.kit, sp, crest: crestAt(k.season) }, 'front', 84, { patch: k.patches[0] })} />
                  <span>{SLOT[k.slot]}</span>
                </button>
              );
            })}
          </div>
          {wall.filter((k) => `${k.season}-${k.slot}` === open).map((k) => (
            <div key="d" className="k-col" style={{ gap: 6 }}>
              <b>{k.name}</b>
              <span className="k-q">Worn {k.record.W + k.record.D + k.record.L} {k.record.W + k.record.D + k.record.L === 1 ? 'time' : 'times'}: {k.record.W} won, {k.record.D} drawn, {k.record.L} lost.</span>
              <div className="kb-mrow">
                <Art svg={kitSvg({ ...k.kit, sp }, 'back', 84, { name: k.collar, label: `${k.name}, back` })} />
                <span className="k-q">Throwback: season {k.season}'s {SLOT[k.slot].toLowerCase()} shirt.{k.collar ? ` The collar reads ${k.collar}.` : ''}</span>
              </div>
              {k.patches.length > 0 && <span className="k-q">Patch nights: {k.patches.map((p) => `${p.round ?? 'Derby'} (${p.text})`).join(', ')}</span>}
            </div>
          ))}
        </Panel>
      ))}
    </>
  );
}

function CrestHistory({ c }: { c: Club }) {
  const h = c.save.crestHistory ?? [];
  const steps: CrestStep[] = [1, 2, 3, 4, 5];
  return (
    <Panel ink={GOLD}>
      <PanelTop name="Crests" c={GOLD} right={`${c.save.crest.step} of ${steps.length}`} />
      {steps.map((st) => {
        const got = st <= c.save.crest.step;
        const pick = h.find((x) => x.step === st)?.opt ?? (st === c.save.crest.step ? c.save.crest.opt : undefined);
        const opt = pick && pick !== 'keep' ? pick : 'a';
        return (
          <div key={st} className="kb-mrow" style={{ opacity: got ? 1 : 0.6, minHeight: 56 }}>
            {got ? <Art svg={crestSvg(st, opt, 52)} /> : <span className="kq-ring" style={{ ['--v' as string]: '#a9a7b8', width: 52, height: 52 }} aria-hidden="true"><b>?</b></span>}
            <span className="k-col" style={{ gap: 0 }}><b>{got ? CREST_LINES[st] : 'Still sealed'}</b><span className="k-q">Step {st}{got && pick === 'keep' ? ' · kept the old crest' : ''}</span></span>
          </div>
        );
      })}
    </Panel>
  );
}
