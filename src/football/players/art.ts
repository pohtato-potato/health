// The drawing on each card (spec §16: a drawing of the habit in its tier's frame, no text on the face).
// Glowing line art in the round-seven style: `l` thick line, `l2` thin line, `o` a body stroke, `d` a dot.
// Exercises are drawn by movement family, read from the id and name (the coach's `family` tag replaces this when plans carry it).

export function artForExercise(id: string, name: string): string {
  const s = `${id} ${name}`.toLowerCase();
  if (/wrist|grip|reverse-curl|reverse grip/.test(s)) return 'grip';
  if (/carry|farmer/.test(s)) return 'carry';
  if (/plank|bug|crunch|hollow|core|\bab/.test(s)) return 'core';
  if (/calf/.test(s)) return 'calves';
  if (/split|lunge|step-up|bulgarian/.test(s)) return 'lunge';
  if (/squat/.test(s)) return 'squat';
  if (/rdl|deadlift|bridge|hinge|thrust|good-morning/.test(s)) return 'hinge';
  if (/pullover|pull-?up|pulldown|chin/.test(s)) return 'pullv';
  if (/row/.test(s)) return 'pullh';
  if (/curl/.test(s)) return 'curl';
  if (/skull|ext|tricep|kickback|dip/.test(s)) return 'triceps';
  if (/lateral|delt|raise|face-pull/.test(s)) return 'shoulders';
  if (/ohp|overhead|shoulder-press|arnold/.test(s)) return 'pushv';
  if (/press|push|fly|bench/.test(s)) return 'pushh';
  return 'lift';
}
export function artForHabit(name: string): string {
  const s = name.toLowerCase();
  if (/brush|floss|teeth/.test(s)) return 'brush';
  if (/drop|eye/.test(s)) return 'drops';
  if (/creatine|powder|scoop|supplement|vitamin|tablet/.test(s)) return 'scoop';
  if (/water|drink/.test(s)) return 'water';
  if (/read|book/.test(s)) return 'book';
  if (/stretch|yoga|mobility/.test(s)) return 'stretch';
  if (/journal|write|note/.test(s)) return 'pen';
  return 'tick';
}

const svg = (body: string) => `<svg viewBox="0 0 200 170" aria-hidden="true">${body}</svg>`;
const STARS = '<circle class="d" cx="168" cy="30" r="2"/><circle class="d" cx="30" cy="26" r="1.5"/><circle class="d" cx="184" cy="64" r="1.2"/>';
const FLOOR = '<path class="l2" d="M10 160 H190"/>';
const DB = (x: number, y: number, r = 9) => `<path class="l" d="M${x - 16} ${y} H${x + 16}"/><circle class="l" cx="${x - 16}" cy="${y}" r="${r}"/><circle class="l" cx="${x + 16}" cy="${y}" r="${r}"/>`;
const HEAD = (x: number, y: number) => `<circle class="l" cx="${x}" cy="${y}" r="11"/>`;
const LIMB = (d: string, w = 12) => `<path class="o" d="${d}" stroke-width="${w}"/>`;

export const ART: Record<string, string> = {
  hinge: svg(`${FLOOR}${LIMB('M124 80 L72 60', 22)}${LIMB('M124 82 L118 120 L122 156', 13)}${LIMB('M76 64 L82 112', 11)}${HEAD(54, 56)}
<path class="l" d="M30 112 H150"/><circle class="l" cx="82" cy="112" r="22"/><circle class="l2" cx="82" cy="112" r="13"/><path class="l2" d="M148 74 Q162 92 150 112" stroke-dasharray="3 4"/>${STARS}`),
  squat: svg(`${FLOOR}${HEAD(100, 30)}${LIMB('M100 46 L96 92', 22)}${LIMB('M96 92 L132 104 L120 156', 13)}${LIMB('M96 92 L66 108 L80 156', 13)}${LIMB('M100 58 L118 76 L104 84', 10)}${LIMB('M100 58 L84 76 L98 84', 10)}
<rect class="l" x="88" y="74" width="24" height="22" rx="6"/><path class="l2" d="M150 60 V120 M144 112 L150 120 L156 112"/>${STARS}`),
  lunge: svg(`${FLOOR}${HEAD(96, 26)}${LIMB('M96 42 L98 92', 22)}${LIMB('M98 92 L138 112 L150 156', 13)}${LIMB('M98 92 L66 124 L36 128', 13)}<path class="l" d="M20 128 H52 V160"/>
${DB(84, 108, 7)}<path class="l2" d="M166 90 V130 M160 122 L166 130 L172 122"/>${STARS}`),
  pushh: svg(`${FLOOR}<path class="l" d="M20 140 H180"/>${HEAD(48, 124)}${LIMB('M62 132 L140 134', 20)}${LIMB('M140 134 L170 140', 12)}${LIMB('M80 128 L76 96', 10)}${LIMB('M112 128 L116 96', 10)}
${DB(78, 88)}${DB(118, 88)}<path class="l2" d="M96 40 V70 M90 62 L96 70 L102 62"/>${STARS}`),
  pushv: svg(`${FLOOR}${HEAD(100, 70)}${LIMB('M100 86 L100 130', 22)}${LIMB('M100 130 L80 156', 13)}${LIMB('M100 130 L120 156', 13)}${LIMB('M100 92 L72 70 L70 36', 10)}${LIMB('M100 92 L128 70 L130 36', 10)}
${DB(70, 30, 7)}${DB(130, 30, 7)}<path class="l2" d="M100 10 V40 M94 18 L100 10 L106 18"/>${STARS}`),
  pullh: svg(`${FLOOR}<rect class="l" x="20" y="104" width="70" height="14" rx="4"/><path class="l2" d="M30 118 V160 M80 118 V160"/>${HEAD(46, 70)}${LIMB('M58 78 L120 96', 20)}${LIMB('M120 96 L126 156', 13)}${LIMB('M64 90 L56 104', 10)}${LIMB('M96 92 L104 70 L118 74', 10)}
${DB(126, 74, 8)}<path class="l2" d="M150 120 Q160 96 140 80" stroke-dasharray="3 4"/>${STARS}`),
  pullv: svg(`${FLOOR}<rect class="l" x="40" y="118" width="120" height="14" rx="4"/>${HEAD(150, 108)}${LIMB('M136 112 L70 114', 20)}${LIMB('M70 114 L40 150', 13)}${LIMB('M136 106 L172 90 L178 60', 10)}
${DB(178, 50, 8)}<path class="l2" d="M120 40 Q160 20 182 44" stroke-dasharray="3 4"/>${STARS}`),
  curl: svg(`${FLOOR}${HEAD(84, 28)}${LIMB('M84 44 L86 104', 24)}${LIMB('M86 104 L78 156', 13)}${LIMB('M86 104 L98 156', 13)}${LIMB('M90 56 L110 92 L132 60', 11)}
${DB(132, 50, 8)}<path class="l2" d="M150 96 Q166 70 146 40" stroke-dasharray="3 4"/><path class="l2" d="M108 84 Q114 72 124 74"/>${STARS}`),
  triceps: svg(`${FLOOR}${HEAD(90, 70)}${LIMB('M90 86 L92 130', 22)}${LIMB('M92 130 L76 156', 13)}${LIMB('M92 130 L110 156', 13)}${LIMB('M96 88 L104 46 L128 30', 10)}
${DB(132, 22, 7)}<path class="l2" d="M120 64 Q150 52 146 20" stroke-dasharray="3 4"/>${STARS}`),
  shoulders: svg(`${FLOOR}${HEAD(100, 34)}${LIMB('M100 50 L100 106', 22)}${LIMB('M100 106 L88 156', 13)}${LIMB('M100 106 L112 156', 13)}${LIMB('M96 60 L52 66', 10)}${LIMB('M104 60 L148 66', 10)}
${DB(42, 66, 7)}${DB(158, 66, 7)}<path class="l2" d="M30 100 Q24 80 36 66 M170 100 Q176 80 164 66" stroke-dasharray="3 4"/>${STARS}`),
  calves: svg(`${FLOOR}<rect class="l" x="70" y="140" width="60" height="16" rx="3"/>${HEAD(100, 22)}${LIMB('M100 38 L100 92', 22)}${LIMB('M100 92 L96 128 L104 140', 13)}${LIMB('M100 92 L110 128 L116 140', 13)}${LIMB('M100 50 L76 84', 10)}
${DB(70, 92, 7)}<path class="l2" d="M146 150 V114 M140 122 L146 114 L152 122"/>${STARS}`),
  core: svg(`${FLOOR}${HEAD(40, 116)}${LIMB('M54 122 L156 132', 20)}${LIMB('M156 132 L180 152', 12)}${LIMB('M64 126 L60 152 L84 152', 10)}
<path class="l2" d="M70 96 H150 M70 96 L76 90 M150 96 L144 90 M70 96 L76 102 M150 96 L144 102"/><circle class="l2" cx="110" cy="56" r="20"/><path class="l2" d="M110 44 V56 L120 62"/>${STARS}`),
  carry: svg(`${FLOOR}${HEAD(100, 24)}${LIMB('M100 40 L100 96', 22)}${LIMB('M100 96 L82 156', 13)}${LIMB('M100 96 L124 150', 13)}${LIMB('M92 50 L78 104', 10)}${LIMB('M108 50 L122 104', 10)}
<rect class="l" x="64" y="104" width="28" height="22" rx="4"/><rect class="l" x="108" y="104" width="28" height="22" rx="4"/><path class="l2" d="M20 70 H50 M14 90 H44 M22 110 H50"/>${STARS}`),
  grip: svg(`${FLOOR}<path class="l" d="M50 120 Q60 80 100 76 Q130 74 140 96 L150 124 Q120 140 80 136 Z"/><path class="l2" d="M86 80 V104 M104 78 V104 M120 82 V106"/>
${DB(100, 66, 9)}<path class="l2" d="M160 60 Q176 80 160 100" stroke-dasharray="3 4"/>${STARS}`),
  lift: svg(`${FLOOR}${HEAD(100, 70)}${LIMB('M100 86 L100 130', 22)}${LIMB('M100 130 L82 156', 13)}${LIMB('M100 130 L118 156', 13)}${LIMB('M100 92 L66 60', 10)}${LIMB('M100 92 L134 60', 10)}
<path class="l" d="M40 54 H160"/><rect class="l" x="34" y="38" width="12" height="32" rx="3"/><rect class="l" x="154" y="38" width="12" height="32" rx="3"/>${STARS}`),
  steps: svg(`<path class="l2" d="M10 162 H190"/><path class="l2" d="M22 62 H54 M14 84 H46 M26 106 H54"/>${HEAD(106, 28)}${LIMB('M102 44 L96 94', 22)}${LIMB('M96 94 L78 126 L62 156', 13)}${LIMB('M96 94 L118 124 L128 156', 13)}
${LIMB('M100 52 L122 76 L134 94', 10)}${LIMB('M100 52 L82 76 L72 94', 10)}<path class="l" d="M54 158 L66 156 M128 156 L142 158"/>${STARS}`),
  bigday: svg(`<path class="l2" d="M10 162 H190"/>${HEAD(70, 40)}${LIMB('M68 56 L60 104', 20)}${LIMB('M60 104 L40 132 L30 158', 12)}${LIMB('M60 104 L84 132 L92 158', 12)}${LIMB('M66 64 L86 86', 9)}${LIMB('M66 64 L48 84', 9)}
<path class="l" d="M120 150 Q150 60 186 40"/><circle class="l" cx="186" cy="40" r="8"/><path class="l2" d="M130 120 L140 116 M144 90 L154 88 M160 64 L170 62"/>${STARS}`),
  commuter: svg(`<path class="l2" d="M10 162 H190"/><rect class="l" x="112" y="40" width="70" height="120" rx="6"/><path class="l2" d="M124 56 H140 M152 56 H168 M124 76 H140 M152 76 H168 M124 96 H140 M152 96 H168 M124 116 H140 M152 116 H168"/>
<rect class="l" x="138" y="132" width="18" height="28"/>${HEAD(58, 46)}${LIMB('M56 62 L52 108', 20)}${LIMB('M52 108 L38 158', 12)}${LIMB('M52 108 L70 156', 12)}${LIMB('M56 70 L76 98', 9)}<rect class="l" x="70" y="96" width="22" height="18" rx="3"/>${STARS}`),
  longwalk: svg(`<circle class="l" cx="150" cy="40" r="13"/><path class="l2" d="M0 70 Q28 50 58 64 Q88 46 120 62 Q150 52 200 66"/><path class="l" d="M0 72 H200"/>
<path class="l" d="M58 168 L96 72 M142 168 L104 72"/><path class="l2" d="M100 160 V146 M100 132 V120 M100 108 V100 M100 92 V86"/><path class="l" d="M22 160 L25 112 H35 L38 160 Z"/><path class="l" d="M23 112 Q30 96 37 112"/>
<circle class="l" cx="109" cy="104" r="2.6"/><path class="l" d="M109 107 V116 M109 110 L104 114 M109 110 L113 113 M109 116 L105 124 M109 116 L113 123"/>`),
  route: svg(`<path class="l" d="M16 150 Q50 120 40 90 Q30 60 70 52 Q110 44 120 80 Q130 116 170 100 Q190 92 186 60"/><circle class="l" cx="16" cy="150" r="6"/><circle class="l" cx="70" cy="52" r="6"/><circle class="l" cx="120" cy="80" r="6"/>
<path class="l" d="M186 60 V24 L170 32 L186 40"/><circle class="d" cx="40" cy="90" r="3"/><circle class="d" cx="170" cy="100" r="3"/>${STARS}`),
  calories: svg(`<ellipse class="l" cx="100" cy="118" rx="76" ry="22"/><ellipse class="l2" cx="100" cy="114" rx="56" ry="13"/><circle class="l" cx="78" cy="106" r="12"/><path class="l" d="M104 104 Q118 92 134 104"/><path class="l2" d="M112 112 H138"/>
<path class="l" d="M22 84 V140 M16 84 V100 Q22 106 28 100 V84 M178 84 V140 M178 84 Q190 100 178 114"/><path class="l2" d="M90 70 C84 58 96 50 90 38 M110 70 C104 58 116 50 110 38"/>`),
  protein: svg(`${FLOOR}<path class="l" d="M70 40 H130 L122 156 H78 Z"/><path class="l2" d="M74 80 H126 M76 110 H124"/><path class="l" d="M84 40 V26 H116 V40"/>
<ellipse class="l" cx="160" cy="130" rx="18" ry="24"/><ellipse class="l2" cx="160" cy="136" rx="8" ry="10"/><path class="l2" d="M30 120 Q40 90 56 110 Q62 130 44 140 Q30 140 30 120 Z"/>${STARS}`),
  breakfast: svg(`<path class="l" d="M68 70 L76 124 Q100 134 124 124 L132 70"/><ellipse class="l" cx="100" cy="70" rx="32" ry="7"/><path class="l" d="M131 82 Q150 84 146 100 Q143 112 126 112"/><ellipse class="l" cx="100" cy="128" rx="54" ry="9"/>
<path class="l2" d="M86 58 C80 48 92 42 86 30 M100 56 C94 44 108 38 100 22 M114 58 C108 48 120 42 114 32"/><circle class="l" cx="164" cy="118" r="13"/><circle class="d" cx="159" cy="114" r="1.3"/><circle class="d" cx="168" cy="115" r="1.3"/>
<circle class="l" cx="40" cy="40" r="12"/><path class="l2" d="M40 20 V14 M54 26 L58 22 M26 26 L22 22 M60 40 H66 M14 40 H20"/>`),
  lunch: svg(`<circle class="l" cx="100" cy="104" r="64"/><circle class="l2" cx="100" cy="104" r="52"/><circle class="l" cx="78" cy="84" r="14"/><circle class="l" cx="124" cy="86" r="14"/><circle class="l" cx="100" cy="126" r="16"/>
<path class="l2" d="M70 120 Q60 110 64 100 M138 110 Q144 124 132 132"/><circle class="l" cx="100" cy="20" r="10"/><path class="l2" d="M100 2 V6 M114 8 L118 4 M86 8 L82 4"/>`),
  dinner: svg(`<ellipse class="l" cx="100" cy="124" rx="76" ry="22"/><path class="l" d="M50 124 Q60 84 100 82 Q140 84 150 124"/><path class="l2" d="M64 110 Q100 96 136 110"/><path class="l" d="M96 82 V74 H104 V82"/>
<path class="l" d="M44 20 a22 22 0 1 0 24 30 a16 16 0 1 1 -24 -30 Z"/><circle class="d" cx="150" cy="24" r="2"/><circle class="d" cx="176" cy="44" r="1.5"/>`),
  tick: svg(`<rect class="l" x="46" y="24" width="108" height="136" rx="10"/><path class="l" d="M60 54 L70 64 L88 46 M60 94 L70 104 L88 86 M60 134 L70 144 L88 126"/><path class="l2" d="M100 56 H140 M100 96 H140 M100 136 H140"/><path class="l" d="M80 18 H120 V30 H80 Z"/>`),
  brush: svg(`<path class="l" d="M36 140 L150 40"/><path class="l" d="M140 32 L172 66 L160 78 L128 44 Z"/><path class="l2" d="M136 50 L146 40 M144 58 L154 48 M152 66 L162 56"/>
<circle class="l2" cx="60" cy="60" r="10"/><circle class="l2" cx="84" cy="40" r="6"/><circle class="l2" cx="40" cy="96" r="7"/>${STARS}`),
  drops: svg(`<path class="l" d="M80 20 H120 V50 H80 Z"/><path class="l" d="M86 50 L84 80 Q100 96 116 80 L114 50"/><path class="l" d="M100 104 Q88 124 100 132 Q112 124 100 104 Z"/>
<path class="l" d="M40 150 Q100 110 160 150 Q100 176 40 150 Z"/><circle class="l" cx="100" cy="150" r="13"/><circle class="d" cx="100" cy="150" r="5"/>`),
  scoop: svg(`<path class="l" d="M50 70 H150 L140 156 H60 Z"/><path class="l" d="M44 56 H156 V70 H44 Z"/><path class="l" d="M110 40 Q140 20 170 34 L160 48 Q136 40 118 52 Z"/><path class="l2" d="M70 100 H130 M74 126 H126"/>${STARS}`),
  water: svg(`${FLOOR}<path class="l" d="M64 30 H136 L126 156 H74 Z"/><path class="l2" d="M70 80 Q100 70 130 80"/><path class="l2" d="M84 104 Q90 96 96 104 Q90 112 84 104 Z M104 124 Q110 116 116 124 Q110 132 104 124 Z"/>${STARS}`),
  book: svg(`<path class="l" d="M20 60 Q60 44 100 64 Q140 44 180 60 V150 Q140 134 100 154 Q60 134 20 150 Z"/><path class="l" d="M100 64 V154"/><path class="l2" d="M36 78 Q60 70 86 80 M36 98 Q60 90 86 100 M114 80 Q140 70 164 78 M114 100 Q140 90 164 98"/>
<path class="l" d="M150 20 a14 14 0 1 0 16 20 a10 10 0 1 1 -16 -20 Z"/>`),
  stretch: svg(`${FLOOR}${HEAD(100, 40)}${LIMB('M100 56 L100 104', 22)}${LIMB('M100 104 L70 156', 13)}${LIMB('M100 104 L130 156', 13)}${LIMB('M100 64 L60 30', 10)}${LIMB('M100 64 L140 30', 10)}<path class="l2" d="M40 60 Q30 40 46 24 M160 60 Q170 40 154 24" stroke-dasharray="3 4"/>`),
  pen: svg(`<rect class="l" x="40" y="30" width="96" height="128" rx="6"/><path class="l2" d="M54 56 H122 M54 76 H122 M54 96 H104"/><path class="l" d="M168 30 L120 118 L114 136 L128 122 L176 36 Z"/>`),
  scale: svg(`<rect class="l" x="40" y="70" width="120" height="86" rx="16"/><path class="l" d="M64 70 Q100 30 136 70"/><path class="l2" d="M100 70 L114 50"/><circle class="d" cx="100" cy="70" r="4"/>
<path class="l" d="M64 156 V164 M136 156 V164"/><path class="l2" d="M64 120 H136"/>${STARS}`),
  tape: svg(`<circle class="l" cx="70" cy="90" r="44"/><circle class="l2" cx="70" cy="90" r="14"/><path class="l" d="M70 46 H180 V72 H110"/><path class="l2" d="M124 46 V56 M136 46 V60 M148 46 V56 M160 46 V60 M172 46 V56"/>${STARS}`),
  trend: svg(`<path class="l2" d="M20 150 H184 M20 150 V20"/><path class="l" d="M28 50 L64 64 L96 80 L132 92 L170 112"/><circle class="l" cx="64" cy="64" r="5"/><circle class="l" cx="96" cy="80" r="5"/><circle class="l" cx="132" cy="92" r="5"/><circle class="l" cx="170" cy="112" r="5"/><path class="l2" d="M40 128 H170" stroke-dasharray="4 6"/>`),
  moon: svg(`<path class="l" d="M54 20 a36 36 0 1 0 40 48 a28 28 0 1 1 -40 -48 Z"/><path class="l2" d="M112 30 h10 l-10 12 h10 M132 54 h7 l-7 9 h7"/>
<path class="l" d="M20 150 V120 Q20 108 34 108 H170 Q184 108 184 122 V150 M20 136 H184"/><rect class="l" x="30" y="96" width="40" height="14" rx="6"/>${STARS}`),
  clock: svg(`<circle class="l" cx="100" cy="94" r="60"/><circle class="l2" cx="100" cy="94" r="50"/><path class="l" d="M100 94 V56 M100 94 L126 106"/><circle class="d" cx="100" cy="94" r="4"/>
<path class="l2" d="M100 40 V48 M100 140 V148 M46 94 H54 M146 94 H154"/><path class="l" d="M156 14 a14 14 0 1 0 16 20 a10 10 0 1 1 -16 -20 Z"/>`),
  sunrise: svg(`<path class="l" d="M10 130 H190"/><path class="l" d="M50 130 a50 50 0 0 1 100 0"/><path class="l2" d="M100 64 V44 M54 82 L40 70 M146 82 L160 70 M36 116 H16 M164 116 H184"/>
<path class="l2" d="M30 150 H170 M60 162 H140"/><circle class="d" cx="40" cy="30" r="2"/><circle class="d" cx="166" cy="34" r="1.5"/>`),
};
export const artSvg = (key: string) => ART[key] ?? ART.lift;
