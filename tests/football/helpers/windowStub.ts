// Router-dependent screens read window.location at import; node tests get a minimal stand-in.
const g = globalThis as unknown as { window?: unknown; location?: unknown; history?: unknown };
if (!g.window) {
  const location = { hash: '#/football' };
  g.window = { location, addEventListener() {}, removeEventListener() {}, scrollTo() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  g.location = location;
  g.history = { state: null, pushState() {}, replaceState() {}, back() {} };
}
export {};
