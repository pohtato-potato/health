// Finding 10 (ledger O40): club abilities are written in the engine's words ("+.05 reach"). Shown to the owner, reach
// is the chance a shot goes in, so each number is said as "N in 100". Only the words change; the effects are the data's.
const n = (x: string) => Math.round(Number(x) * 100);

const RULES: [RegExp, (...m: string[]) => string][] = [
  [/no late-game drop in their reach/, () => 'their chances never fade late on'],
  [/their next shot reaches further/, () => 'their next shot is more likely to go in'],
  [/(\w+) gets reach 1\.0/, (w) => `${w} is sure to go in`],
  [/their reach is capped at (\.\d+)/, (x) => `their chances are never better than ${n(x)} in 100`],
  [/their second-half reach gets \+(\.\d+)/, (x) => `in the second half their chances are ${n(x)} in 100 more likely to go in`],
  [/their reach grows by (\.\d+) a chance/, (x) => `each chance of theirs is ${n(x)} in 100 more likely to go in than the last`],
  [/their reach (grows|drops) (?:by )?(\.\d+)/, (d, x) => `their chances are ${n(x)} in 100 ${d === 'grows' ? 'more' : 'less'} likely to go in`],
  [/their reach grows/, () => 'their chances get better'],
  [/\(\+(\.\d+) reach\)/, (x) => `(their chances ${n(x)} in 100 more likely to go in)`],
  [/with \+(\.\d+) reach/, (x) => `${n(x)} in 100 more likely to go in`],
  [/give them \+(\.\d+) reach/, (x) => `make their chances ${n(x)} in 100 more likely to go in`],
  [/shots against them get ([+−-])(\.\d+)(?: reach)?/, (s, x) => `shots against them are ${n(x)} in 100 ${s === '+' ? 'more' : 'less'} likely to go in`],
  [/(gets?) ([+−-])(\.\d+) reach/, (v, s, x) => `${v === 'gets' ? 'is' : 'are'} ${n(x)} in 100 ${s === '+' ? 'more' : 'less'} likely to go in`],
];

export function plainWords(text: string): string {
  let out = text;
  for (const [re, say] of RULES) out = out.replace(re, (_all, ...m: string[]) => say(...m));
  // Any other bare decimal reads with its nought: ".5" is "0.5".
  return out.replace(/(^|[^\d])\.(\d)/g, '$10.$2');
}
