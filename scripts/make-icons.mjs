// Renders the app icon and shortcut icons to PNG: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });

const INK = '#0D0F14';
const rings = (scale = 1) => {
  const r = [80, 54, 28].map((v) => v * scale);
  const w = 18 * scale;
  return `
    <circle cx="100" cy="100" r="${r[0]}" fill="none" stroke="#E9A77C" stroke-width="${w}"/>
    <circle cx="100" cy="100" r="${r[1]}" fill="none" stroke="#B7A6F0" stroke-width="${w}"/>
    <circle cx="100" cy="100" r="${r[2]}" fill="none" stroke="#8FC9B0" stroke-width="${w}"/>`;
};

// Rounded tile with the three rings, as on the home-screen mock.
const appIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="44" fill="${INK}"/>
  <g transform="translate(100 100) scale(0.68) translate(-100 -100)">${rings()}</g>
</svg>`;

// Maskable: full-bleed background, rings inside the 80% safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${INK}"/>
  <g transform="translate(100 100) scale(0.56) translate(-100 -100)">${rings()}</g>
</svg>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="44" fill="${INK}"/>
  <g transform="translate(100 100) scale(0.74) translate(-100 -100)">${rings(1.05)}</g>
</svg>`;

const glyphs = {
  morning: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
  food: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7.5c0-1.5 1-2 1-3.5M14 7.5c0-1.5 1-2 1-3.5"/>',
  water: '<path d="M12 3.5c-3 4-5.5 7-5.5 10a5.5 5.5 0 0 0 11 0c0-3-2.5-6-5.5-10z"/>',
  session: '<path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11"/>',
};
const colors = { morning: '#C9DCEA', food: '#E9A77C', water: '#7F9CE0', session: '#EDE9E3' };

const shortcutIcon = (name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="48" fill="${INK}"/>
  <g transform="translate(24 24) scale(2)" fill="none" stroke="${colors[name]}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${glyphs[name]}</g>
</svg>`;

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

writeFileSync(new URL('icon-192.png', out), png(appIcon, 192));
writeFileSync(new URL('icon-512.png', out), png(appIcon, 512));
writeFileSync(new URL('maskable-512.png', out), png(maskable, 512));
writeFileSync(new URL('apple-touch-icon.png', out), png(maskable, 180));
for (const name of Object.keys(glyphs)) writeFileSync(new URL(`sc-${name}.png`, out), png(shortcutIcon(name), 96));
writeFileSync(new URL('../favicon.svg', out), favicon);
console.log('Icons written to public/icons');
