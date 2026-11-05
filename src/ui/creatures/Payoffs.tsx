import type { ReactNode } from 'react';
import { calledAt, creatureById, nameAt, type Creature } from '../../domain/creatureRoster';
import { stageFor, visitsOf, type Sighting } from '../../domain/creatures';
import { CreatureSvg } from './Figure';

/** The creature's stage as of now, from every sighting. */
export const stageNow = (c: Creature, sightings: Pick<Sighting, 'creatureId'>[]) => stageFor(c.tier, visitsOf(sightings, c.id));
/** How a sentence calls it: "the nilgai", or "something not yet named" before a medium-rare's sighting. */
export const called = (id: string | undefined, sightings: Pick<Sighting, 'creatureId'>[]): string | undefined => {
  const c = creatureById(id);
  return c && calledAt(c, stageNow(c, sightings));
};

/** "Met this week" or "Met this month": each creature's drawing with its name. */
export function MetCard({ title, ids, sightings }: { title: string; ids: string[]; sightings: Pick<Sighting, 'creatureId'>[] }) {
  if (!ids.length) return null;
  return (
    <div className="card cr-met">
      <div className="lbl">{title}</div>
      <div className="cr-met-row">
        {ids.map((id) => {
          const c = creatureById(id);
          if (!c) return null;
          const stage = stageNow(c, sightings);
          return (
            <span key={id} className="cr-met-one">
              <span className="cr-met-fig"><CreatureSvg c={c} stage={stage} /></span>
              <span className="t14">{nameAt(c, stage)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A rare guest's frame around the record of the night before: a chain of stars along the card's edge and the guest's
 * motif at a corner. The padding keeps the chain and the motif 34 px clear of the words, which name the guest too.
 */
export function RecordFrame({ guest, stage, children }: { guest: Creature; stage: number; children: ReactNode }) {
  return (
    <div className="cr-frame" style={{ ['--cr-star' as string]: guest.star, ['--cr-main' as string]: guest.main }}>
      <span className="cr-frame-motif"><CreatureSvg c={guest} stage={stage} /></span>
      {children}
      <span className="t14 cr-frame-by">Framed by {nameAt(guest, stage).toLowerCase().startsWith('the ') ? nameAt(guest, stage).toLowerCase() : `the ${guest.short}`}, who came the morning after.</span>
    </div>
  );
}

/** A creature's theme on the sky: a few of its stars over the region's ground. The page keeps the land's colour. */
export function SkyTouch({ c }: { c: Creature }) {
  const spots = [[12, 9], [31, 21], [52, 7], [71, 17], [88, 11], [22, 36], [78, 33]];
  return (
    <div className="cr-touch" aria-hidden="true">
      {spots.map(([x, y], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}%`, background: i % 2 ? c.acc : c.star, boxShadow: `0 0 10px ${c.main}`, animationDelay: `${i * 0.4}s` }} />
      ))}
    </div>
  );
}
