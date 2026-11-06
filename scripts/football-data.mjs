// Turns the design-side league.json into the app's public data file, and writes
// exercise youngsters (they name loads and joints) to git-ignored private/.
// Usage: node scripts/football-data.mjs "<path to Football shared/league/league.json>"
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/football-data.mjs <league.json>'); process.exit(1); }
const d = JSON.parse(readFileSync(src, 'utf8'));
const AX = ['Pace', 'Power', 'Fuel', 'Rest', 'Routine', 'Shape'];
const AXR = AX.join('|');

/** Free-text ability -> structured in-match effect, or null for world and flavour abilities. */
function parse(trigger = '', effect = '') {
  const t = `${trigger} ${effect}`.toLowerCase();
  const e = effect;
  const fx = { when: 'always', mods: [], reach: 0 };
  // when
  if (/away from home|away tests/.test(t)) fx.when = 'away';
  else if (/at home|home tests/.test(t)) fx.when = 'home';
  let m;
  if ((m = t.match(/first (\d+)'/))) fx.when = fx.when === 'home' ? `home-first-${m[1]}` : `first-${m[1]}`;
  else if ((m = t.match(/(?:after|chances after) (\d+)'/))) fx.when = fx.when === 'home' ? `home-after-${m[1]}` : `after-${m[1]}`;
  else if (/first half/.test(t)) fx.when = 'first-half';
  else if (/while the score is level/.test(t)) fx.when = 'level';
  else if (/while they lead/.test(t)) fx.when = 'they-lead';
  else if (/until they concede/.test(t)) fx.when = 'until-concede';
  else if (/until you score/.test(t)) fx.when = 'until-score';
  else if (/after (?:their goal|they score)/.test(t)) fx.when = 'after-their-goal';
  else if (/after you miss/.test(t)) fx.when = 'after-miss';
  else if (/continental|knockout|cup|cups/.test(t)) fx.when = 'cup';
  else if (/derby/.test(t)) fx.when = 'derby';
  else if (/higher-tier|higher tier/.test(t)) fx.when = 'vs-higher';
  else if (/last five matchdays|final five matchdays/.test(t)) fx.when = 'last5';
  else if (/on crosses|headers/.test(t)) fx.when = 'crosses';
  else if (/long shots|long-range/.test(t)) fx.when = 'long';
  else if (/corners/.test(t)) fx.when = 'corners';
  else if (/counters against/.test(t)) fx.when = 'counters';
  // data-linked condition
  const cond =
    /slept under your sleep target/.test(t) ? 'sleep-under-target' :
    /slept under 6 hours/.test(t) ? 'sleep-under-6' :
    /bedtime was before 11/.test(t) ? 'bed-before-23' :
    /bedtime was after midnight/.test(t) ? 'bed-after-0' :
    /bedtime moved/.test(t) ? 'bed-moved' :
    /unless you trained at least twice/.test(t) ? 'trained-under-2-week' :
    /day after a training session/.test(t) ? 'trained-yesterday' :
    /skipped training/.test(t) ? 'skipped-training-week' :
    /protein target/.test(t) ? 'protein-hit' :
    /walked over 10k/.test(t) ? 'steps-over-10k' :
    /walked under 5k/.test(t) ? 'steps-under-5k' :
    /unless you hit your step goal/.test(t) ? 'steps-goal-missed' :
    /beat your step goal/.test(t) ? 'steps-goal-hit' :
    /under last week's daily average/.test(t) ? 'steps-under-last-week' :
    /day after you logged a drink/.test(t) ? 'drink-yesterday' :
    /weeks you logged a drink/.test(t) ? 'drink-week' :
    /missed your medicines/.test(t) ? 'meds-missed-week' :
    /auto-plays/.test(t) ? 'auto' :
    /november to february/.test(t) ? 'winter' :
    /1 day in 4|windy/.test(t) ? 'windy' :
    /seventh matchday/.test(t) ? 'every-7th' :
    /match after a loss/.test(t) ? 'after-loss' :
    /beaten them before/.test(t) ? 'beat-them-before' : null;
  if (cond) fx.cond = cond;
  // effects
  const re1 = new RegExp(`your ((?:${AXR})(?: and (?:${AXR}))?)(?: and (?:${AXR}))? (?:shrinks?|is pressed) a further ([\\d.]+)`, 'g');
  while ((m = re1.exec(e))) for (const a of m[1].split(' and ')) fx.mods.push({ axis: a, d: -Number(m[2]) });
  if ((m = e.match(/your attack shrinks a further ([\d.]+)/))) for (const a of AX.slice(0, 3)) fx.mods.push({ axis: a, d: -Number(m[1]) });
  if ((m = e.match(new RegExp(`your (${AXR}) takes [−-]([\\d.]+)`)))) fx.mods.push({ axis: m[1], d: -Number(m[2]) });
  const re2 = new RegExp(`your (${AXR}) gets \\+([\\d.]+)`, 'g');
  while ((m = re2.exec(e))) fx.mods.push({ axis: m[1], d: Number(m[2]) });
  if ((m = e.match(/both sides' (\w+) gets \+([\d.]+)/))) fx.mods.push({ axis: m[1], d: Number(m[2]) });
  if ((m = e.match(/every test (?:they take )?gets \+([\d.]+)/)) || (m = e.match(/tests? \+([\d.]+)/))) fx.all = -Number(m[1]);
  if ((m = e.match(/[−-]([\d.]+) on every test/))) fx.all = Number(m[1]);
  if (/start one ring smaller/.test(e)) fx.mods.push({ axis: 'Pace', d: -1 });
  if ((m = e.match(/reach (grows|drops)(?: by)? (\.\d+)/))) fx.reach = (m[1] === 'grows' ? 1 : -1) * Number(m[2]);
  else if ((m = e.match(/\+(\.\d+) reach/))) fx.reach = Number(m[1]);
  else if ((m = e.match(/[−-](\.\d+)(?: reach)?/)) && /long|reach/.test(e)) fx.reach = -Number(m[1]);
  else if ((m = e.match(/\(\+(\.\d+) reach\)/))) fx.reach = Number(m[1]);
  else if (/reach grows/.test(e)) fx.reach = 0.06;
  else if (/reaches further/.test(e)) fx.reach = 0.06;
  if (/while defending/.test(e)) fx.side = 'def';
  if (/defensive chance/.test(e)) fx.side = 'def';
  if (!fx.mods.length && !fx.all && !fx.reach) return null;
  return fx;
}
// Abilities whose rule is special; the engine handles these by name.
const SPECIAL = new Set(['Rekordmeister', 'Scrappy', 'Mistral', 'Beach Wind', 'Eruption', 'Funfair', 'Herding', 'Dark arts', 'Dirty Leeds',
  'Familiar', 'Projection', 'Data department', 'Man-marking', 'Mia san mia', "Miners' shift", 'Deep Shaft', 'Iron', 'Homing', 'Ruthless',
  'The Edge', 'Timetable', 'Windmills', 'Gambit', 'Three-Four Time', 'Every Door', 'Switchbacks', 'Total football', 'Shift Change', 'Midnight Sun',
  'Remontada', 'Spursy', 'Fragile nights', 'Siesta', 'Two Lakes', 'Echolocation', 'Slow and Sure', 'Peloton', 'Gegenpress', 'Marching On', 'Rondo']);

// Read as in-match by the parser but really about seasons or other clubs.
const WORLD_ONLY = new Set(['Barrio', 'Back-to-back', 'Never-lose run']);
const they = (s) => s.replace(/\bhe leaves\b/g, 'they leave').replace(/\bHe may\b/g, 'They may').replace(/\bhis axis\b/g, 'their axis')
  .replace(/\bhe adds\b/g, 'they add').replace(/\bhis\b/g, 'their').replace(/\bhim\b/g, 'them').replace(/\bhe is\b/g, 'they are').replace(/\bHis\b/g, 'Their').replace(/\bhe may\b/g, 'they may');
let parsed = 0, special = 0, flavour = 0;
function ability(a, data = false) {
  const name = a.name, text = they(a.effect), trigger = a.trigger ?? '';
  const fx = WORLD_ONLY.has(name) ? null : parse(trigger, text);
  const sp = SPECIAL.has(name);
  if (sp) special++; else if (fx) parsed++; else flavour++;
  return { name, text, trigger, data: Boolean(a.data_linked ?? data), fx, special: sp || undefined };
}
const clubs = d.clubs.map((c) => ({
  id: c.id, name: c.name, short: c.short, nickname: c.nickname, city: c.city ?? '', country: c.country ?? '',
  founded: c.founded ?? '', ground: c.ground ?? '', colours: c.colours ?? ['#888888', '#222222'], crest: c.crest ?? '',
  tier: c.tier, rating: typeof c.rating === 'number' ? c.rating : null, elite: Boolean(c.elite), style: c.style,
  kind: c.kind === 'oldself' ? 'old' : c.kind, lore: c.lore ?? '',
  sponsor: c.sponsor ?? '', kitMaker: c.kit_maker ?? '', sponsorReal: Boolean(c.sponsor_real), kitReal: Boolean(c.kit_real),
  known: (c.known_abilities ?? []).map((a) => ability(a)),
  hidden: c.hidden_ability ? ability(c.hidden_ability) : undefined,
  shrinks: c.engine?.shrinks_attack ?? {}, presses: c.engine?.presses_defence ?? {},
}));
const deep = (o) => JSON.parse(they(JSON.stringify(o)));
const youth = d.youth_pool.map((y) => ({ name: y.name, age: y.age, axis: y.axis, potential: y.potential, what: y.what, kind: y.type }));
const out = {
  note: 'Generated by scripts/football-data.mjs. Axes: Pace = steps, Power = training, Fuel = food (calories and protein), Rest = sleep, Routine = checklist, Shape = body logs.',
  tierNames: d.tier_names, tierBands: d.tier_bands, eliteBand: d.elite_band, styles: d.styles, clubs,
  oldSelves: deep(d.old_selves), youthRules: { ...deep(d.youth_rules), safety: 'Exercise youngsters are gentle ones; anything new still goes past whoever looks after your training.' }, youth: youth.filter((y) => y.kind !== 'exercise'),
  contracts: deep(d.contracts), worldEvents: d.world_events, sponsors: d.sponsors, kitMakers: d.kit_makers,
  income: d.income, cupMoney: d.cup_money, sponsorRules: deep(d.sponsor_rules), realOfferBrands: d.real_offer_brands, realOfferKits: d.real_offer_kits,
};
writeFileSync(new URL('../src/football/data/league.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
mkdirSync(new URL('../private/', import.meta.url), { recursive: true });
writeFileSync(new URL('../private/football-youth.json', import.meta.url), JSON.stringify(youth.filter((y) => y.kind === 'exercise'), null, 1) + '\n');
console.log(`clubs ${clubs.length}; abilities parsed ${parsed}, special ${special}, flavour ${flavour}`);
