import { partOfDay } from '../domain/dates';
import { fmtInt } from '../domain/format';
import { positionAt } from '../domain/walk';
import { Scene } from './art/scene';
import { landmarkFor } from './art/landmarks';
import { regionAt } from './regions';
import type { Festive } from './art/festive';

/** The landmark ahead grows as you near it: small from 60 km out, full size on arrival. */
export function approachScale(kmToNext: number | undefined): number {
  if (kmToNext === undefined) return 1;
  return 0.55 + 0.45 * (1 - Math.min(1, kmToNext / 60));
}

/**
 * The scene for where the walk is: the region's land lit for the hour, the next landmark ahead.
 * On the Walk tab (s11) it is full-bleed with the title over the sky, your trail in sage with
 * today's carry steps in gold, a marker for where you are, and what you built last.
 */
/** Where last month's walker stands on the drawn trail: behind you by the distance since, within the frame. */
export function ghostX(youX: number, km: number, ghostKm: number): number {
  return youX - Math.max(36, Math.min(youX - 24, 36 + (km - ghostKm) * 0.5));
}

export function WalkScene({ km, ghostKm, caption = true, hero, carryFrac = 0, built, dayN, lanterns = 0, festive }: { festive?: Festive; km: number; ghostKm?: number; caption?: boolean; hero?: boolean; carryFrac?: number; built?: string; dayN?: number; lanterns?: number }) {
  const pos = positionAt(km);
  const ahead = pos.to ?? pos.from;
  const toNext = pos.to ? Math.max(0, pos.to.km - km) : undefined;
  const lm = landmarkFor(ahead.name);
  const W = 390;
  const H = 250;
  const you = { x: W * 0.62, y: H * 0.905 };
  const goldFrom = { x: you.x - Math.min(0.3, Math.max(0, carryFrac)) * 200, y: H * 0.915 };
  const overlay = hero ? (
    <g>
      <path d={`M-10 ${H * 0.96} C ${W * 0.2} ${H * 0.93}, ${W * 0.4} ${H * 0.94}, ${you.x} ${you.y}`} fill="none" stroke="#8FC9B0" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
      {carryFrac > 0 && <path d={`M${goldFrom.x} ${goldFrom.y} L ${you.x} ${you.y}`} fill="none" stroke="#F2C46D" strokeWidth="3.4" strokeLinecap="round" />}
      <path d={`M${you.x} ${you.y} C ${W * 0.75} ${H * 0.89}, ${W * 0.88} ${H * 0.88}, ${W + 10} ${H * 0.87}`} fill="none" stroke="#EDE6DA" strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray="4 5" strokeLinecap="round" />
      {ghostKm !== undefined && ghostKm < km && (
        <g transform={`translate(${ghostX(you.x, km, ghostKm)} ${H * 0.925})`} opacity="0.42">
          <circle cx="0" cy="-15" r="2.6" fill="none" stroke="#EDE6DA" strokeWidth="1.2" />
          <path d="M0 -12 V-4 M0 -4 L-3 1 M0 -4 L3 1 M-3 -9 L3 -9" fill="none" stroke="#EDE6DA" strokeWidth="1.2" strokeLinecap="round" />
          <text x="0" y="-21" textAnchor="middle" fontFamily="var(--sans)" fontSize="9" fill="#EDE6DA">a month ago</text>
        </g>
      )}
      <g transform={`translate(${you.x + 22} ${H * 0.9})`}>
        <circle cx="0" cy="-2" r="16" fill="#F2C46D" opacity="0.1" />
        <path d="M-9 4 L0 -10 L9 4 Z" fill="#2a2440" stroke="#EDE6DA" strokeOpacity="0.55" strokeWidth="1" strokeLinejoin="round" />
        <path d="M0 -10 V4 M-2.5 4 L0 -2 L2.5 4" fill="none" stroke="#F2C46D" strokeOpacity="0.8" strokeWidth="0.9" />
        <path d="M12 5 c1-3 3-3 2-6 2 2 2 4 1 6Z" fill="#F2C46D" opacity="0.85" />
        {lanterns > 0 && (
          <g>
            <path d={`M-12 4 V-16 H${-12 + 7 * Math.min(lanterns, 4)}`} fill="none" stroke="#EDE6DA" strokeOpacity="0.5" strokeWidth="0.9" />
            {Array.from({ length: Math.min(lanterns, 4) }, (_, i) => (
              <g key={i} transform={`translate(${-8 + i * 7} -12)`}>
                <circle r="5" fill="#F2C46D" opacity="0.18" />
                <rect x="-1.8" y="-2.4" width="3.6" height="4.8" rx="1.2" fill="#F2C46D" />
              </g>
            ))}
          </g>
        )}
      </g>
      <circle cx={you.x} cy={you.y} r="9" fill="#EDE6DA" opacity="0.18" />
      <circle cx={you.x} cy={you.y} r="4.2" fill="#EDE6DA" stroke="#0e1020" strokeWidth="1.2" />
      {toNext !== undefined && (
        <text x={you.x - 10} y={you.y - 13} textAnchor="middle" fontFamily="var(--sans)" fontSize="10" fontWeight="600" fill="#EDE6DA" style={{ paintOrder: 'stroke', stroke: 'rgba(8,10,23,0.55)', strokeWidth: 3 }}>
          You · {fmtInt(Math.round(toNext))} km to {lm?.label ?? ahead.name}
        </text>
      )}
      {built && (
        <g transform={`translate(${W * 0.3} ${H * 0.9})`}>
          <path d="M-7 4 L0 -3 L7 4 V10 H-7 Z" fill="#F2C46D" />
          <circle cx="0" cy="3" r="14" fill="#F2C46D" opacity="0.12" />
          <text x="0" y="-9" textAnchor="middle" fontFamily="var(--sans)" fontSize="10" fontWeight="600" fill="#F2C46D" style={{ paintOrder: 'stroke', stroke: 'rgba(8,10,23,0.55)', strokeWidth: 3 }}>
            {built.charAt(0).toUpperCase() + built.slice(1)}
          </text>
        </g>
      )}
    </g>
  ) : undefined;
  return (
    <Scene
      city={ahead.name}
      region={regionAt(km)}
      part={partOfDay(new Date())}
      people={!hero}
      festive={festive}
      landmarkScale={approachScale(toNext)}
      className={hero ? 'walk-hero' : undefined}
      overlay={overlay}
      caption={
        caption ? (
          <>
            <span className="band-place">Near {pos.from.name}</span>
            {toNext !== undefined && (
              <span className="band-next t13">
                {dayN ? `Day ${fmtInt(dayN)} · ` : ''}
                <span className="num tn">{fmtInt(Math.round(toNext))}</span> km to {lm?.label ?? ahead.name}
              </span>
            )}
          </>
        ) : undefined
      }
    />
  );
}
