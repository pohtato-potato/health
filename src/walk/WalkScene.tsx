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
 * On the Walk tab it is full-bleed with the title over the sky, your trail in sage and a marker
 * for where you are.
 */
export function WalkScene({ km, caption = true, hero, dayN, festive }: { festive?: Festive; km: number; caption?: boolean; hero?: boolean; dayN?: number }) {
  const pos = positionAt(km);
  const ahead = pos.to ?? pos.from;
  const toNext = pos.to ? Math.max(0, pos.to.km - km) : undefined;
  const lm = landmarkFor(ahead.name);
  const W = 390;
  const H = 250;
  const you = { x: W * 0.62, y: H * 0.905 };
  const overlay = hero ? (
    <g>
      <path d={`M-10 ${H * 0.96} C ${W * 0.2} ${H * 0.93}, ${W * 0.4} ${H * 0.94}, ${you.x} ${you.y}`} fill="none" stroke="#8FC9B0" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.9" />
      <path d={`M${you.x} ${you.y} C ${W * 0.75} ${H * 0.89}, ${W * 0.88} ${H * 0.88}, ${W + 10} ${H * 0.87}`} fill="none" stroke="#EDE6DA" strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray="4 5" strokeLinecap="round" />
      <g transform={`translate(${you.x + 22} ${H * 0.9})`}>
        <circle cx="0" cy="-2" r="16" fill="#F2C46D" opacity="0.1" />
        <path d="M-9 4 L0 -10 L9 4 Z" fill="#2a2440" stroke="#EDE6DA" strokeOpacity="0.55" strokeWidth="1" strokeLinejoin="round" />
        <path d="M0 -10 V4 M-2.5 4 L0 -2 L2.5 4" fill="none" stroke="#F2C46D" strokeOpacity="0.8" strokeWidth="0.9" />
        <path d="M12 5 c1-3 3-3 2-6 2 2 2 4 1 6Z" fill="#F2C46D" opacity="0.85" />
      </g>
      <circle cx={you.x} cy={you.y} r="9" fill="#EDE6DA" opacity="0.18" />
      <circle cx={you.x} cy={you.y} r="4.2" fill="#EDE6DA" stroke="#0e1020" strokeWidth="1.2" />
      {toNext !== undefined && (
        <text x={you.x - 10} y={you.y - 13} textAnchor="middle" fontFamily="var(--sans)" fontSize="10" fontWeight="600" fill="#EDE6DA" style={{ paintOrder: 'stroke', stroke: 'rgba(8,10,23,0.55)', strokeWidth: 3 }}>
          You · {fmtInt(Math.round(toNext))} km to {lm?.label ?? ahead.name}
        </text>
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
