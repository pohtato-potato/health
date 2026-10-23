import { useState } from 'react';
import { along } from './walkArt';
import { MAIN_CITIES, REGIONS } from './walkRoutes';

/**
 * Design prototype: the whole of India, the way the map opens one step out from the stretch. Night ground with
 * the survey's graticule; every state and union territory drawn; the ones you've walked into filled in their
 * region's ink with their names written; chapter 1's road through its cities; your trail and where you are.
 */

/** The projection make_geo.py used for India, so graticule lines land where the land is. */
const LON0 = 66;
const LAT1 = 37.5;
const K = 300 / ((98.5 - 66) * Math.cos(((6 + 37.5) / 2) * (Math.PI / 180)));
const C = Math.cos(((6 + 37.5) / 2) * (Math.PI / 180));
const px = (lon: number) => (lon - LON0) * C * K;
const py = (lat: number) => (LAT1 - lat) * K;

/** Each state's region, for its ink once reached (the walk scene's own region inks). */
const REGION_OF: Record<string, string> = {
  Delhi: 'plains', Haryana: 'plains', 'Uttar Pradesh': 'plains', Punjab: 'plains', Bihar: 'plains', Chandigarh: 'plains',
  Rajasthan: 'desert', Gujarat: 'desert', 'Madhya Pradesh': 'ravines',
  Maharashtra: 'deccan', Telangana: 'deccan', Karnataka: 'deccan', 'Andhra Pradesh': 'deccan',
  Kerala: 'ghats', Goa: 'ghats', 'Tamil Nadu': 'coast', Puducherry: 'coast',
};
const INK: Record<string, string> = { plains: '#a9a37a', desert: '#d9b07a', ravines: '#b77a5c', deccan: '#a88a6a', ghats: '#7fa77a', coast: '#86b3b8' };

/** Where each reached state's name sits (its rough middle), in map units. */
const NAMES: Record<string, [number, number]> = { Haryana: [80, 68], 'Uttar Pradesh': [166, 96] };
const REACHED = ['Delhi', 'Haryana', 'Uttar Pradesh'];

const CHAPTER_1 = ['Delhi', 'Agra', 'Gwalior', 'Bhopal', 'Nagpur', 'Hyderabad', 'Bengaluru', 'Madurai', 'Kanyakumari'];

export function IndiaMap() {
  const india = REGIONS.india;
  const [picked, setPicked] = useState<string | null>(null);
  const road = CHAPTER_1.map((c) => MAIN_CITIES[c]);
  const walkedTo = along([MAIN_CITIES.Agra, MAIN_CITIES.Gwalior], 8 / 120);
  const trail = [MAIN_CITIES.Delhi, MAIN_CITIES.Agra, walkedTo];
  return (
    <div className="wp-india">
      <svg viewBox={india.box.join(' ')} role="img" aria-label="India with its states. You have walked from Delhi to just past Agra; Delhi, Haryana and Uttar Pradesh are filled in. Chapter 1's road runs on to Kanyakumari.">
        <g className="wp-in-grat" aria-hidden="true">
          {[70, 75, 80, 85, 90, 95].map((lon) => (
            <g key={lon}>
              <line x1={px(lon)} y1="0" x2={px(lon)} y2={india.box[3]} />
              <text x={px(lon) + 2} y={india.box[3] - 4}>
                {lon}°E
              </text>
            </g>
          ))}
          {[10, 15, 20, 25, 30, 35].map((lat) => (
            <g key={lat}>
              <line x1="0" y1={py(lat)} x2="300" y2={py(lat)} />
              <text x="3" y={py(lat) - 2}>
                {lat}°N
              </text>
            </g>
          ))}
        </g>
        <path d={india.outline} className="wp-in-land" vectorEffect="non-scaling-stroke" />
        {india.states?.map(([name, d]) => {
          const reached = REACHED.includes(name);
          return (
            <path
              key={name}
              d={d}
              className={`wp-in-state ${reached ? 'on' : ''} ${picked === name ? 'picked' : ''}`}
              style={reached ? { fill: `color-mix(in srgb, ${INK[REGION_OF[name] ?? 'plains']} 55%, transparent)` } : undefined}
              vectorEffect="non-scaling-stroke"
              onClick={() => setPicked(name === picked ? null : name)}
            />
          );
        })}
        <path d={'M' + road.map((p) => p.join(' ')).join(' L')} className="wp-in-road" vectorEffect="non-scaling-stroke" />
        <path d={'M' + trail.map((p) => p.join(' ')).join(' L')} className="wp-in-trail" pathLength={1} style={{ ['--f' as string]: 1 }} vectorEffect="non-scaling-stroke" />
        {CHAPTER_1.map((c, i) => {
          const [x, y] = MAIN_CITIES[c];
          const reached = i < 2;
          const left = ['Delhi', 'Agra', 'Bhopal', 'Bengaluru', 'Kanyakumari'].includes(c);
          return (
            <g key={c}>
              <circle cx={x} cy={y} r={reached ? 2.6 : 2.2} className={reached ? 'wp-in-city on' : 'wp-in-city'} />
              <text className="wp-in-name" x={left ? x - 4.5 : x + 4.5} y={y + 4} textAnchor={left ? 'end' : 'start'}>
                {c}
              </text>
            </g>
          );
        })}
        {Object.entries(NAMES).map(([s, [x, y]]) => (
          <text key={s} className="wp-in-statename" x={x} y={y} textAnchor="middle">
            {s}
          </text>
        ))}
        <circle className="wp-ra-halo" cx={walkedTo[0]} cy={walkedTo[1]} r="5.5" style={{ fill: 'var(--sage)' }} />
        <circle cx={walkedTo[0]} cy={walkedTo[1]} r="3.2" className="wp-in-you" />
      </svg>
      <div className="wp-in-key">
        <span>
          <i className="trail" /> Walked
        </span>
        <span>
          <i className="road" /> Chapter 1 ahead
        </span>
        <span>
          <i className="state" /> States reached, in their land's colour
        </span>
      </div>
      <p className="wp-in-pick" aria-live="polite">
        {picked ? (REACHED.includes(picked) ? `${picked}: walked into.` : `${picked}: not yet.`) : 'Tap a state for its name.'}
      </p>
    </div>
  );
}
