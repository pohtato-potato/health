// Kits: launch day, the kit wall by season, and the crest history.
import { useState } from 'react';
import { kitSvg } from '../../../football/art/kit';
import { crestSvg, type CrestStep } from '../../../football/art/crest';
import { CREST_LINES, launchOptions, slotsOpen, SPONSOR_STYLES, type KitSlot } from '../../../football/kits';
import type { Club } from '../../../football/store/club';
import { kitFor, kitWall, type WallKit } from '../../../football/store/kitWall';
import { Art } from '../Tonight';

const SLOT: Record<KitSlot, string> = { home: 'Home', away: 'Away', third: 'Third' };

export interface KitActions { pick?: (season: number, slot: KitSlot, id: string) => void; style?: (sp: 'A' | 'B' | 'C' | 'R') => void }

export function KitsView({ c, act = {} }: { c: Club; act?: KitActions }) {
  const s = c.save;
  const wall = kitWall(s, c.matches);
  const launch = s.phase === 'event';
  const next = s.season + 1;
  const sp = s.sponsorStyle ?? 'A';
  const sponsor = s.sponsors?.find((x) => x.slot === 'shirt')?.brand ?? (s.ownSponsor?.slot === 'shirt' ? s.ownSponsor.name : undefined);
  return (
    <>
      {launch && (
        <section className="fb-card hot" aria-label="Launch day">
          <span className="fb-lb">Launch day · season {next}</span>
          <p className="fb-s">The kit maker has designs for each slot. Pick one; the rest go back in the drawer.</p>
          {slotsOpen(c.tier).map((slot) => {
            const picked = s.kits?.find((k) => k.season === next && k.slot === slot)?.id;
            return (
              <fieldset key={slot} className="fb-kitpick">
                <legend className="fb-lb">{SLOT[slot]}</legend>
                <div className="fb-kitgrid">
                  {launchOptions(slot, next).map((id) => {
                    const k = kitFor(id, next, c.matches);
                    if (!k) return null;
                    return (
                      <button key={id} type="button" className={`fb-kitopt${picked === id ? ' on' : ''}`} aria-pressed={picked === id} onClick={() => act.pick?.(next, slot, id)}>
                        <Art svg={kitSvg({ ...k.kit, sp }, 'front', 84, { sponsor })} />
                        <span className="fb-s">{k.name}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          {c.tier > 4 && <p className="fb-s">The third kit opens in Division Four.</p>}
        </section>
      )}
      <section className="fb-card" aria-label="Sponsor style">
        <span className="fb-lb">Sponsor on the shirt</span>
        <div className="fb-chips">
          {SPONSOR_STYLES.map((x) => <button key={x.id} type="button" className={`fb-chip${sp === x.id ? ' on' : ''}`} aria-pressed={sp === x.id} onClick={() => act.style?.(x.id)}>{x.name}</button>)}
        </div>
      </section>
      <KitWall wall={wall} sp={sp} />
      <CrestHistory c={c} />
    </>
  );
}

function KitWall({ wall, sp }: { wall: WallKit[]; sp: 'A' | 'B' | 'C' | 'R' }) {
  const [open, setOpen] = useState<string | null>(null);
  const seasons = [...new Set(wall.map((k) => k.season))].sort((a, b) => b - a);
  return (
    <>
      <div className="fb-row"><h2 className="fb-t">The kit wall</h2><span className="fb-s">tap a kit</span></div>
      {seasons.map((season) => (
        <section key={season} className="fb-card" aria-label={`Season ${season}`}>
          <span className="fb-lb">Season {season}</span>
          <div className="fb-kitgrid">
            {wall.filter((k) => k.season === season).map((k) => {
              const key = `${k.season}-${k.slot}`;
              return (
                <button key={key} type="button" className={`fb-kitopt${open === key ? ' on' : ''}`} aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                  <Art svg={kitSvg({ ...k.kit, sp }, 'front', 84, { patch: k.patches[0] })} />
                  <span className="fb-s">{SLOT[k.slot]}</span>
                </button>
              );
            })}
          </div>
          {wall.filter((k) => `${k.season}-${k.slot}` === open).map((k) => (
            <div key="d" className="fb-kitinfo">
              <b>{k.name}</b>
              <span className="fb-s">Worn {k.record.W + k.record.D + k.record.L} {k.record.W + k.record.D + k.record.L === 1 ? 'time' : 'times'}: {k.record.W} won, {k.record.D} drawn, {k.record.L} lost.</span>
              <div className="fb-kitpair">
                <Art svg={kitSvg({ ...k.kit, sp }, 'back', 84, { name: k.collar, label: `${k.name}, back` })} />
                <span className="fb-s">Throwback: season {k.season}'s {SLOT[k.slot].toLowerCase()} shirt.{k.collar ? ` The collar reads ${k.collar}.` : ''}</span>
              </div>
              {k.patches.length > 0 && <span className="fb-s">Patch nights: {k.patches.map((p) => `${p.round ?? 'Derby'} (${p.text})`).join(', ')}</span>}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

function CrestHistory({ c }: { c: Club }) {
  const h = c.save.crestHistory ?? [];
  const steps: CrestStep[] = [1, 2, 3, 4, 5];
  return (
    <section className="fb-card" aria-label="Crests">
      <div className="fb-row"><span className="fb-lb">Crests</span><span className="fb-s">{c.save.crest.step} of 5</span></div>
      {steps.map((st) => {
        const got = st <= c.save.crest.step;
        const pick = h.find((x) => x.step === st)?.opt ?? (st === c.save.crest.step ? c.save.crest.opt : undefined);
        const opt = pick && pick !== 'keep' ? pick : 'a';
        return (
          <div key={st} className={`fb-crestrow${got ? '' : ' sealed'}`}>
            {got ? <Art svg={crestSvg(st, opt, 52)} /> : <span className="fb-seal" aria-hidden="true">?</span>}
            <span className="fb-col"><b>{got ? CREST_LINES[st] : 'Still sealed'}</b><span className="fb-s">Step {st}{got && pick === 'keep' ? ' · kept the old crest' : ''}</span></span>
          </div>
        );
      })}
    </section>
  );
}
