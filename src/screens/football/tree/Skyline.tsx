// The Kaai quarter as one riverside skyline (spec §16 "The club quarter"; the approved Kaai quarter drawing).
// Every building on one stretch of river, drawn in the stadium's light outlines and built up stage by stage:
// built is solid light, building is a moving gold line, next is dashed. Sealed stages aren't drawn.
// Projects and the Club page's Ground both scroll along this one view. Each label says its state in words, so the
// line style is never the only signal.
import { useEffect, useRef } from 'react';
import type { Place } from '../../../football/ground';
import type { PlaceLook, StageLook } from '../../../football/tree/projects';

/** Each stage's outline, by project id, on a 1420 × 414 riverside (quay at y 290). */
const SHAPES: Record<string, string[]> = {
  // the ferry stop
  'ferry-1': ['M60 290 V246', 'M60 250 H92 L86 258 L92 266 H60'],
  'ferry-2': ['M100 290 H170', 'M120 290 V318 M160 290 V318'],
  'ferry-3': ['M112 336 Q150 346 196 336 L188 326 H128 Z', 'M146 326 V312 H172 V326', 'M104 290 V270 M176 290 V270 M104 272 Q140 262 176 272'],
  // the café
  'cafe-1': ['M206 290 V268 H246 V290', 'M214 268 V258 H238 V268'],
  'cafe-tea': ['M256 290 V272 H284 V290', 'M276 272 V262 H282 V272'],
  'cafe-2': ['M200 290 V236 H296 V290', 'M194 238 H302', 'M212 252 H236 V272 H212 Z M260 252 H284 V272 H260 Z'],
  'cafe-3': ['M200 236 L210 226 L220 236 L230 226 L240 236 L250 226 L260 236 L270 226 L280 236 L290 226 L300 236'],
  // the club shop
  'shop-1': ['M318 290 V264 H346 V290', 'M324 272 H340'],
  'shop-2': ['M316 290 V222 H408 V290', 'M316 222 L362 200 L408 222'],
  'shop-3': ['M328 240 H396 V272 H328 Z', 'M398 200 V170', 'M398 172 H424 L418 182 L424 192 H398'],
  'shop-4': ['M408 290 V238 H432 V290', 'M414 248 V280 M426 248 V280'],
  // Kaai 42
  plot: ['M440 290 V276 M480 290 V276 M520 290 V276 M560 290 V276 M440 280 H560'],
  'kaai-stand': ['M540 290 V204 L760 194 V290', 'M550 226 L750 218 M550 246 L750 239 M550 266 L750 260'],
  'river-end': ['M450 290 V244 H540 V290', 'M458 258 H532 M458 272 H532'],
  'crane-stand': ['M760 290 V226 H860 V290', 'M768 246 H852 M768 266 H852'],
  'dock-end': ['M860 290 V246 H904 V290', 'M866 262 H898 M866 276 H898'],
  floodlights: ['M470 244 V150 M458 142 H482 V151 H458 Z', 'M590 202 V118 M578 110 H602 V119 H578 Z', 'M712 196 V112 M700 104 H724 V113 H700 Z', 'M842 226 V150 M830 142 H854 V151 H830 Z'],
  scoreboard: ['M466 236 H526 V222 H466 Z'],
  physio: ['M910 290 V266 H940 V290', 'M920 274 H930 M925 269 V279'],
  roof: ['M540 204 Q650 168 760 194'],
  'kaai-pressbox': ['M610 214 H690 V202 H610 Z'],
  'river-upper': ['M450 244 V214 H540 V244', 'M458 228 H532'],
  'crane-upper': ['M760 226 V196 H860 V226', 'M768 210 H852'],
  'kaai-corners': ['M440 290 V256 L450 246', 'M904 290 V258 L912 266'],
  // the academy
  'academy-1': ['M960 290 V264 H1010 V290', 'M970 272 H984 V284 H970 Z'],
  'academy-2': ['M960 264 V246 H1060 V290 H1010', 'M1024 258 H1042 V272 H1024 Z'],
  'academy-wing': ['M1060 290 V256 H1084 V290', 'M1066 266 H1078'],
  'academy-3': ['M960 246 V210 H1060 V246', 'M972 222 H990 V236 H972 Z M1004 222 H1022 V236 H1004 Z M1036 222 H1050 V236 H1036 Z'],
  // the training ground
  'training-1': ['M1100 290 L1116 266 H1220 L1236 290 Z'],
  'training-2': ['M1168 266 V290 M1108 278 H1228', 'M1240 290 V258 H1262 V290'],
  'training-video': ['M1266 290 V240 H1296 V290', 'M1272 250 H1290 V264 H1272 Z'],
  'training-pool': ['M1104 266 V254 H1146 V266', 'M1110 260 Q1118 256 1126 260 T1142 260'],
  'training-3': ['M1180 266 V230 H1236 V266', 'M1188 240 H1228 M1188 252 H1228'],
  // the museum
  'museum-1': ['M1316 290 V266 H1344 V290', 'M1322 274 H1338'],
  'museum-2': ['M1306 290 V226 H1396 V290', 'M1306 226 L1351 206 L1396 226'],
  'museum-hall': ['M1396 290 V244 H1416 V290'],
};
/** Where each building's label sits. */
const LABEL_X: Record<Place, number> = { ferry: 40, cafe: 196, shop: 330, kaai: 470, academy: 960, training: 1104, museum: 1300 };
/** Short names, so neighbouring labels never collide. */
const SHORT: Record<Place, string> = { ferry: 'Ferry stop', cafe: 'Café', shop: 'Club shop', kaai: 'Kaai 42', academy: 'Academy', training: 'Training ground', museum: 'Museum' };
const LOOK_CLASS: Record<StageLook, string | null> = { built: 'st', building: 'grow', next: 'todo', sealed: null };

const RIVER = (
  <g aria-hidden="true">
    <line className="quay" x1="0" y1="290" x2="1420" y2="290" />
    <path className="riv" d="M0 312 Q175 304 350 314 T700 310 T1050 314 T1420 308" />
    <path className="riv b" d="M0 330 Q175 322 350 332 T700 328 T1050 332 T1420 326" />
    <path className="riv b" d="M0 346 Q175 340 350 348 T700 344 T1050 348 T1420 342" />
  </g>
);
const STARS = [[90, 40], [260, 70], [420, 30], [980, 50], [1180, 34], [1330, 80]].map(([x, y], i) => <circle key={i} className="star" cx={x} cy={y} r={1.4} style={{ animationDelay: `${(i * 0.7) % 2}s` }} />);

/** A place's state in words: "built", "stage 2 of 3", "building · 18 of 25", "next", "not started". */
export function placeWords(p: PlaceLook, progress: (id: string) => string): string {
  if (p.now) return `building · ${progress(p.now.id)}`;
  if (p.built === p.of) return 'built';
  if (p.built) return `stage ${p.built} of ${p.of}`;
  return 'not started';
}

/** Each label's column: from its x to the next label's x (the last runs to the river's end), less a gap. */
const ORDER = (Object.keys(LABEL_X) as Place[]).sort((x, y) => LABEL_X[x] - LABEL_X[y]);
const COLUMN: Record<Place, number> = Object.fromEntries(ORDER.map((p, i) => [p, (i + 1 < ORDER.length ? LABEL_X[ORDER[i + 1]] : 1420) - LABEL_X[p] - 14])) as Record<Place, number>;
/** A generous width for one 16-unit character, so a wrapped line never runs into the next label. */
const SUB_CH = 9.4;
const SUB_GAP = 22;
const SUB_Y = 398;

/** Words wrapped to fit `width` (in viewBox units); a single long word stays whole on its own line. */
export function wrapWords(text: string, width: number, ch = SUB_CH): string[] {
  const max = Math.max(1, Math.floor(width / ch));
  const out: string[] = [];
  for (const w of text.split(' ')) {
    const last = out[out.length - 1];
    if (last !== undefined && (last + ' ' + w).length <= max) out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  return out;
}
/** A place's state under its name, one short line at a time: "building", then "18 of 25" wrapped to its column. */
export function placeLines(p: PlaceLook, progress: (id: string) => string): string[] {
  const width = COLUMN[p.place];
  if (p.now) return ['building', ...wrapWords(progress(p.now.id), width)];
  return wrapWords(placeWords(p, progress), width);
}

export function Skyline({ places, progress, focus }: { places: PlaceLook[]; progress: (id: string) => string; focus?: Place }) {
  const box = useRef<HTMLDivElement>(null);
  const target = focus ?? places.find((p) => p.now)?.place;
  useEffect(() => {
    const el = box.current;
    if (!el || !target) return;
    el.scrollLeft = Math.max(0, LABEL_X[target] - 40);
  }, [target]);
  const label = places.map((p) => `${p.name}: ${placeWords(p, progress)}`).join('. ');
  const lines = places.map((p) => placeLines(p, progress));
  const height = SUB_Y + (Math.max(1, ...lines.map((l) => l.length)) - 1) * SUB_GAP + 16;
  return (
    <figure className="fbt-sky">
      <div className="fbt-scene" ref={box} role="img" aria-label={`The Kaai quarter, one riverside skyline. ${label}.`} tabIndex={0}>
        <svg viewBox={`0 0 1420 ${height}`} aria-hidden="true">
          {STARS}
          {places.flatMap((p) => p.stages.map(({ p: s, look }) => {
            const cls = LOOK_CLASS[look];
            if (!cls) return [];
            const ds = SHAPES[s.id] ?? [];
            // A stage being built glows: a soft pulsing halo under a solid gold line.
            return cls === 'grow'
              ? ds.flatMap((d, k) => [<path key={`${s.id}:h${k}`} className="halo" d={d} />, <path key={`${s.id}:${k}`} className="grow" d={d} />])
              : ds.map((d, k) => <path key={`${s.id}:${k}`} className={cls} d={d} />);
          }))}
          {RIVER}
          {places.map((p, i) => (
            <g key={p.place}>
              <text className={`lbl${p.now ? ' g' : ''}`} x={LABEL_X[p.place]} y={376}>{SHORT[p.place]}</text>
              {lines[i].map((l, k) => <text key={k} className="sub" x={LABEL_X[p.place]} y={SUB_Y + k * SUB_GAP}>{l}</text>)}
            </g>
          ))}
        </svg>
      </div>
      <p className="fbt-line">Scroll sideways along the river.</p>
      <figcaption className="fbt-key">
        <span><svg viewBox="0 0 34 10" aria-hidden="true"><line className="st" x1="2" y1="5" x2="32" y2="5" /></svg>Built</span>
        <span><svg viewBox="0 0 34 10" aria-hidden="true"><line className="grow" x1="2" y1="5" x2="32" y2="5" /></svg>Building</span>
        <span><svg viewBox="0 0 34 10" aria-hidden="true"><line className="todo" x1="2" y1="5" x2="32" y2="5" /></svg>Next</span>
      </figcaption>
    </figure>
  );
}
