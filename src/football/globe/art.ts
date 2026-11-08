// Loan drawings (spec §16): a signature pose, kit colours and a shirt number. The face is line-art shading only: a
// head outline with a few hatching strokes, never features, never a portrait. No logos, crests or sponsor marks.
// Eight poses cover the sixty briefs; the pose is read from the brief's words.
import type { LoanDef } from '../content/types';

export type Pose = 'dribble' | 'shoot' | 'dive' | 'throw' | 'tackle' | 'header' | 'pass' | 'point';
export function poseOf(brief: string): Pose {
  const s = brief.toLowerCase();
  if (/dive|diving|save|full-stretch|fingertip/.test(s)) return 'dive';
  if (/throw/.test(s)) return 'throw';
  if (/tackle|sliding|long leg|intercept|win the ball/.test(s)) return 'tackle';
  if (/head it|header|mid-air/.test(s)) return 'header';
  if (/pointing|shouting|arm raised|one arm out, jogging/.test(s)) return 'point';
  if (/pass|cross|scan|whipping/.test(s)) return 'pass';
  if (/shot|strik|curl|thump|penalty|side-foot|chipping|free kick|volley|drive|step-over|near post|meeting|turning/.test(s)) return 'shoot';
  return 'dribble';
}

const COLOURS: [RegExp, string][] = [
  [/sky blue/, '#8fd0f5'], [/navy/, '#24366e'], [/yellow/, '#f5d33a'], [/orange/, '#ff8a2a'], [/white/, '#f3eee6'], [/red/, '#e0323c'],
  [/black/, '#1a1a1a'], [/green/, '#2fa35a'], [/grey|gray/, '#9aa0a6'], [/blue/, '#2f6fd8'],
];
/** Colour words in the order they appear ("sky blue" before "blue"). */
function coloursIn(s: string): { at: number; hex: string }[] {
  const out: { at: number; hex: string }[] = [];
  let rest = s.toLowerCase();
  for (const [re, hex] of COLOURS) {
    const g = new RegExp(re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = g.exec(rest))) { out.push({ at: m.index, hex }); rest = rest.slice(0, m.index) + '#'.repeat(m[0].length) + rest.slice(m.index + m[0].length); }
  }
  return out.sort((a, b) => a.at - b.at);
}
export interface Kit { shirt: string; second?: string; pattern: 'plain' | 'stripes' | 'checks' | 'sleeves' | 'trim'; shorts: string }
export function kitOf(text: string): Kit {
  const s = text.toLowerCase();
  const cs = coloursIn(s);
  const shirt = cs[0]?.hex ?? '#f3eee6';
  const second = cs[1]?.hex;
  const shortsAt = s.indexOf('shorts');
  const shorts = shortsAt >= 0 ? [...cs].reverse().find((c) => c.at < shortsAt)?.hex ?? shirt : /all /.test(s) ? shirt : second && /stripes|checks/.test(s) ? '#1a1a1a' : shirt;
  const pattern: Kit['pattern'] = /stripes/.test(s) ? 'stripes' : /checks/.test(s) ? 'checks' : /sleeves/.test(s) ? 'sleeves' : /stripe|trim/.test(s) ? 'trim' : 'plain';
  return { shirt, second: pattern === 'plain' ? undefined : second, pattern, shorts: shortsAt >= 0 ? shorts : /stripes|checks/.test(s) ? '#1a1a1a' : shorts };
}
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

interface Figure { head: [number, number]; torso: [number, number, number, number]; arms: string[]; legs: string[]; ball?: [number, number]; gloves?: boolean }
const F: Record<Pose, Figure> = {
  dribble: { head: [60, 26], torso: [60, 42, 56, 90], arms: ['M58 52 L36 64 L28 76', 'M58 52 L80 48 L94 40'], legs: ['M56 90 L40 120 L30 146', 'M56 90 L76 118 L90 136'], ball: [100, 146] },
  shoot: { head: [50, 24], torso: [52, 40, 60, 88], arms: ['M54 50 L30 42 L18 48', 'M54 50 L80 62 L92 74'], legs: ['M60 88 L52 120 L46 150', 'M60 88 L88 104 L108 98'], ball: [114, 92] },
  dive: { head: [22, 74], torso: [32, 80, 82, 96], arms: ['M30 74 L16 56 L8 44', 'M32 78 L20 64 L18 52'], legs: ['M82 96 L104 100 L116 96', 'M82 96 L100 110 L112 120'], ball: [8, 34], gloves: true },
  throw: { head: [62, 26], torso: [62, 42, 60, 90], arms: ['M62 52 L86 44 L96 20', 'M62 52 L40 62 L32 76'], legs: ['M60 90 L52 120 L46 150', 'M60 90 L72 120 L78 150'], ball: [98, 12], gloves: true },
  tackle: { head: [28, 94], torso: [36, 102, 70, 124], arms: ['M38 106 L22 128 L14 140', 'M38 104 L50 88 L60 80'], legs: ['M70 124 L96 132 L114 136', 'M70 124 L88 142 L102 150'], ball: [114, 124] },
  header: { head: [60, 26], torso: [60, 42, 60, 88], arms: ['M60 50 L36 42 L22 50', 'M60 50 L84 42 L98 50'], legs: ['M60 88 L46 116 L50 142', 'M60 88 L76 112 L70 136'], ball: [60, 8] },
  pass: { head: [56, 24], torso: [56, 40, 56, 88], arms: ['M56 50 L32 60 L22 72', 'M56 50 L80 58 L92 68'], legs: ['M56 88 L50 120 L46 150', 'M56 88 L80 120 L98 128'], ball: [106, 130] },
  point: { head: [60, 26], torso: [60, 42, 60, 90], arms: ['M60 52 L80 30 L94 12', 'M60 52 L40 66 L34 82'], legs: ['M60 90 L50 122 L46 150', 'M60 90 L70 122 L74 150'], ball: [92, 148] },
};

/** The loan's drawing: pose, kit and number, glowing line art in the club's look. */
export function loanSvg(l: Pick<LoanDef, 'id' | 'drawing'>, size = 120): string {
  const pose = poseOf(l.drawing.pose);
  const f = F[pose];
  const kit = kitOf(l.drawing.kit);
  const id = `lk-${l.id}`;
  const [x1, y1, x2, y2] = f.torso;
  const glow = (d: string, w: number) => `<path d="${d}" stroke="#f3eee6" stroke-opacity=".55" stroke-width="${w + 4}"/>`;
  const limb = (d: string, c: string, w: number) => `${glow(d, w)}<path d="${d}" stroke="${c}" stroke-width="${w}"/>`;
  // Shirt pattern: stripes and checks as a pattern on the torso; sleeves and trim colour the arms or the edge.
  const pat = kit.pattern === 'stripes' && kit.second
    ? `<pattern id="${id}-p" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${kit.shirt}"/><rect width="4" height="8" fill="${kit.second}"/></pattern>`
    : kit.pattern === 'checks' && kit.second
      ? `<pattern id="${id}-p" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${kit.shirt}"/><rect width="5" height="5" fill="${kit.second}"/><rect x="5" y="5" width="5" height="5" fill="${kit.second}"/></pattern>`
      : '';
  const torsoPaint = pat ? `url(#${id}-p)` : kit.shirt;
  const sleeve = kit.pattern === 'sleeves' && kit.second ? kit.second : kit.shirt;
  const len = Math.hypot(x2 - x1, y2 - y1), ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI - 90;
  const torso = `<g transform="translate(${x1} ${y1}) rotate(${ang.toFixed(1)})"><rect x="-13" y="-2" width="26" height="${(len * 0.72).toFixed(0)}" rx="8" fill="#f3eee6" fill-opacity=".55"/><rect x="-11" y="0" width="22" height="${(len * 0.7).toFixed(0)}" rx="7" fill="${torsoPaint}"/>`
    + (kit.pattern === 'trim' && kit.second ? `<path d="M-11 6 H11" stroke="${kit.second}" stroke-width="3"/>` : '')
    + `<rect x="-11" y="${(len * 0.66).toFixed(0)}" width="22" height="${(len * 0.36).toFixed(0)}" rx="6" fill="${kit.shorts}" stroke="#f3eee6" stroke-opacity=".55" stroke-width="2"/>`
    + `<text x="0" y="${(len * 0.42).toFixed(0)}" text-anchor="middle" font-family="Fraunces, serif" font-weight="700" font-size="15" fill="${lum(kit.shirt) > 0.55 ? '#16120a' : '#fff8e6'}" stroke="${lum(kit.shirt) > 0.55 ? '#fff8e6' : '#16120a'}" stroke-width=".6" paint-order="stroke">${l.drawing.number}</text></g>`;
  const [hx, hy] = f.head;
  // The face: an outline and three hatching strokes for shadow. Nothing else.
  const head = `<circle cx="${hx}" cy="${hy}" r="11" fill="#1d1730" stroke="#f3eee6" stroke-width="2.5"/><path d="M${hx + 2} ${hy - 6} l5 5 M${hx + 1} ${hy - 1} l6 6 M${hx - 1} ${hy + 4} l5 5" stroke="#f3eee6" stroke-opacity=".7" stroke-width="1.4"/>`;
  const ball = f.ball ? `<circle cx="${f.ball[0]}" cy="${f.ball[1]}" r="7" fill="#f3eee6" stroke="#16120a" stroke-width="1"/><path d="M${f.ball[0] - 3} ${f.ball[1] - 2} l3 -2 l3 2 l-1 3 h-4 z" fill="#16120a"/>` : '';
  const gloves = f.gloves ? f.arms.map((a) => { const m = a.match(/(\d+) (\d+)$/); return m ? `<circle cx="${m[1]}" cy="${m[2]}" r="5" fill="${kit.second ?? '#ffe27a'}" stroke="#f3eee6" stroke-width="1.5"/>` : ''; }).join('') : '';
  return `<svg viewBox="0 0 120 160" width="${size}" height="${(size * 4) / 3}" class="lnart" role="img" aria-label="Drawing: ${pose} pose, ${l.drawing.kit.toLowerCase()}, number ${l.drawing.number}" fill="none" stroke-linecap="round" stroke-linejoin="round">`
    + `<defs>${pat}</defs><path d="M6 156 H114" stroke="#f3eee6" stroke-opacity=".4" stroke-width="1.5"/>`
    + f.legs.map((d) => limb(d, kit.shorts === kit.shirt && lum(kit.shirt) < 0.2 ? '#2a2a2a' : '#e8d5bc', 7)).join('')
    // Arms behind the torso, so the shirt number always shows.
    + f.arms.map((d) => limb(d, sleeve, 7)).join('') + gloves + torso + head + ball
    + '</svg>';
}
